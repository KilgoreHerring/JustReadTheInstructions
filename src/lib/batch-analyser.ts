import { prisma } from "./db";
import { anthropic, stripFences, JSON_INSTRUCTION } from "./claude";
import { getApplicableObligations } from "./matching-engine";
import {
  buildRegulationPrompt,
  groupByRegulation,
  getProductOverviewContext,
  applyAnalysisToMatrix,
  type AnalysisResult,
  type ObligationFinding,
  type PerRegulationResult,
} from "./document-analyser";
import { jsonrepair } from "jsonrepair";

// custom_id must be ≤64 chars — use short index-based IDs
let batchCounter = 0;
function nextCustomId(): string {
  return `r_${Date.now().toString(36)}_${(batchCounter++).toString(36)}`;
}

function parseJSON<T>(text: string, label: string): T {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn(`[Batch] ${label} direct parse failed, trying repair`);
  }
  const repaired = jsonrepair(cleaned);
  return JSON.parse(repaired) as T;
}

// --- Core functions ---

export async function createBatchForDocuments(documentIds: string[]): Promise<string> {
  const requests: Array<{
    custom_id: string;
    params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: "user"; content: string }>;
    };
  }> = [];

  const itemRecords: Array<{
    customId: string;
    documentId: string;
    regulationTitle: string;
  }> = [];

  for (const docId of documentIds) {
    const doc = await prisma.productDocument.findUniqueOrThrow({
      where: { id: docId },
      include: { product: { include: { productType: true } } },
    });

    if (doc.documentType !== "terms_and_conditions") continue;

    const obligations = await getApplicableObligations(doc.productId);
    const regulationGroups = groupByRegulation(obligations);
    const overviewContext = await getProductOverviewContext(doc.productId);

    const productContext = `${doc.product.productType.name} product ("${doc.product.name}") aimed at ${doc.product.customerType} customers, distributed via ${doc.product.distributionChannel}, offered in ${doc.product.jurisdictions.join(", ")}`;

    for (const [regTitle, regObligations] of regulationGroups) {
      const prompt = buildRegulationPrompt(regTitle, regObligations, doc.content, productContext, overviewContext);
      const customId = nextCustomId();

      requests.push({
        custom_id: customId,
        params: {
          model: "claude-sonnet-4-5",
          max_tokens: prompt.maxTokens,
          system: prompt.system + JSON_INSTRUCTION,
          messages: [{ role: "user", content: prompt.userMessage }],
        },
      });

      itemRecords.push({ customId, documentId: docId, regulationTitle: regTitle });
    }

    // Mark document as queued
    await prisma.productDocument.update({
      where: { id: docId },
      data: { analysisStatus: "queued", analysisResult: undefined, analysisError: null, analysisCompletedAt: null },
    });
  }

  if (requests.length === 0) throw new Error("No analysable documents found");

  console.log(`[Batch] Creating batch with ${requests.length} requests across ${documentIds.length} documents`);

  const batch = await anthropic.messages.batches.create({ requests });

  const batchJob = await prisma.batchJob.create({
    data: {
      anthropicBatchId: batch.id,
      status: "submitted",
      totalRequests: requests.length,
      items: {
        create: itemRecords.map((r) => ({
          customId: r.customId,
          documentId: r.documentId,
          regulationTitle: r.regulationTitle,
        })),
      },
    },
  });

  console.log(`[Batch] Created job ${batchJob.id} → Anthropic batch ${batch.id}`);
  return batchJob.id;
}

export interface BatchJobStatus {
  id: string;
  anthropicBatchId: string;
  status: string;
  totalRequests: number;
  succeededCount: number;
  failedCount: number;
  createdAt: Date;
  completedAt: Date | null;
  error: string | null;
}

export async function resolveOutstandingBatches(): Promise<void> {
  const pending = await prisma.batchJob.findMany({
    where: { status: { in: ["submitted", "processing"] } },
  });
  if (pending.length === 0) return;
  console.log(`[Batch] Resolving ${pending.length} outstanding batch job(s)`);
  for (const job of pending) {
    try {
      await pollBatchJob(job.id);
    } catch (e) {
      console.error(`[Batch] Failed to resolve job ${job.id}:`, e);
    }
  }
}

export async function pollBatchJob(batchJobId: string): Promise<BatchJobStatus> {
  const job = await prisma.batchJob.findUniqueOrThrow({ where: { id: batchJobId } });

  if (job.status === "completed" || job.status === "failed") {
    return job;
  }

  const batch = await anthropic.messages.batches.retrieve(job.anthropicBatchId);

  let newStatus = job.status;
  if (batch.processing_status === "in_progress") newStatus = "processing";
  else if (batch.processing_status === "canceling") newStatus = "cancelled";
  else if (batch.processing_status === "ended") newStatus = "completed";

  await prisma.batchJob.update({
    where: { id: batchJobId },
    data: { status: newStatus },
  });

  if (batch.processing_status === "ended") {
    await processBatchResults(batchJobId);
  }

  return prisma.batchJob.findUniqueOrThrow({ where: { id: batchJobId } });
}

async function processBatchResults(batchJobId: string): Promise<void> {
  const job = await prisma.batchJob.findUniqueOrThrow({
    where: { id: batchJobId },
    include: { items: true },
  });

  console.log(`[Batch] Processing results for job ${batchJobId} (${job.items.length} items)`);

  const results = await anthropic.messages.batches.results(job.anthropicBatchId);
  const itemsByCustomId = new Map(job.items.map((i) => [i.customId, i]));

  let succeeded = 0;
  let failed = 0;

  for await (const entry of results) {
    const item = itemsByCustomId.get(entry.custom_id);
    if (!item) {
      console.warn(`[Batch] Unknown custom_id: ${entry.custom_id}`);
      continue;
    }

    if (entry.result.type === "succeeded") {
      const block = entry.result.message.content[0];
      if (block.type === "text") {
        try {
          const parsed = parseJSON<PerRegulationResult>(block.text, entry.custom_id);
          await prisma.batchJobItem.update({
            where: { id: item.id },
            data: { status: "succeeded", result: parsed as unknown as undefined },
          });
          succeeded++;
        } catch (e) {
          console.error(`[Batch] Parse failed for ${entry.custom_id}:`, e);
          await prisma.batchJobItem.update({
            where: { id: item.id },
            data: { status: "errored" },
          });
          failed++;
        }
      }
    } else {
      await prisma.batchJobItem.update({
        where: { id: item.id },
        data: { status: entry.result.type },
      });
      failed++;
    }
  }

  // Group succeeded items by document and build AnalysisResult
  const succeededItems = await prisma.batchJobItem.findMany({
    where: { batchJobId, status: "succeeded" },
  });

  const byDocument = new Map<string, typeof succeededItems>();
  for (const item of succeededItems) {
    if (!byDocument.has(item.documentId)) byDocument.set(item.documentId, []);
    byDocument.get(item.documentId)!.push(item);
  }

  for (const [documentId, items] of byDocument) {
    const allFindings: ObligationFinding[] = [];
    const allMissingClauses: string[] = [];
    const allQualityConcerns: string[] = [];
    const overallAssessments: string[] = [];

    for (const item of items) {
      const data = item.result as unknown as PerRegulationResult;
      if (!data) continue;
      allFindings.push(...(data.obligationFindings || []));
      if (data.missingClauses) allMissingClauses.push(...data.missingClauses);
      if (data.qualityConcerns) allQualityConcerns.push(...data.qualityConcerns);
      if (data.overallAssessment) overallAssessments.push(`[${item.regulationTitle}] ${data.overallAssessment}`);
    }

    // Check for failed items for this document
    const failedItems = await prisma.batchJobItem.findMany({
      where: { batchJobId, documentId, status: { not: "succeeded" } },
    });
    const failureNote = failedItems.length > 0
      ? `\n\n[WARNING: Analysis incomplete — failed for: ${failedItems.map((f) => f.regulationTitle).join(", ")}]`
      : "";

    const analysisResult: AnalysisResult = {
      documentType: "terms_and_conditions",
      overallAssessment: overallAssessments.join("\n\n") + failureNote,
      obligationFindings: allFindings,
      missingClauses: allMissingClauses,
      qualityConcerns: allQualityConcerns,
    };

    await prisma.productDocument.update({
      where: { id: documentId },
      data: {
        analysisStatus: allFindings.length > 0 ? "complete" : "failed",
        analysisResult: analysisResult as unknown as undefined,
        analysisCompletedAt: new Date(),
        analysisError: allFindings.length === 0 ? "All regulation analyses failed in batch" : null,
      },
    });

    if (allFindings.length > 0) {
      console.log(`[Batch] Applying ${allFindings.length} findings to matrix for document ${documentId}`);
      await applyAnalysisToMatrix(documentId);
    }
  }

  // Mark documents that had zero succeeded items as failed
  const allDocIds = [...new Set(job.items.map((i) => i.documentId))];
  for (const docId of allDocIds) {
    if (!byDocument.has(docId)) {
      await prisma.productDocument.update({
        where: { id: docId },
        data: {
          analysisStatus: "failed",
          analysisError: "All regulation analyses failed in batch",
        },
      });
    }
  }

  await prisma.batchJob.update({
    where: { id: batchJobId },
    data: {
      status: "completed",
      succeededCount: succeeded,
      failedCount: failed,
      completedAt: new Date(),
    },
  });

  console.log(`[Batch] Job ${batchJobId} complete: ${succeeded} succeeded, ${failed} failed`);
}
