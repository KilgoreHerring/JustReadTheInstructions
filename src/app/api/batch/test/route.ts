import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { anthropic } from "@/lib/claude";
import { getApplicableObligations } from "@/lib/matching-engine";
import { groupByRegulation, buildRegulationPrompt, getProductOverviewContext } from "@/lib/document-analyser";
import { JSON_INSTRUCTION } from "@/lib/claude";

export const maxDuration = 60;

/**
 * Debug endpoint: GET /api/batch/test?docId=xxx
 * Runs through every step of batch creation and reports what succeeds/fails.
 */
export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("docId");
  const steps: Array<{ step: string; status: "ok" | "error"; detail: string }> = [];

  if (!docId) {
    return NextResponse.json({ error: "Missing ?docId= parameter" }, { status: 400 });
  }

  // Step 1: Find document
  let doc;
  try {
    doc = await prisma.productDocument.findUniqueOrThrow({
      where: { id: docId },
      include: { product: { include: { productType: true } } },
    });
    steps.push({
      step: "1. Find document",
      status: "ok",
      detail: `Found: ${doc.fileName} (type: ${doc.documentType}, product: ${doc.product.name}, productType: ${doc.product.productType.name})`,
    });
  } catch (e) {
    steps.push({
      step: "1. Find document",
      status: "error",
      detail: `${e instanceof Error ? e.message : String(e)}`,
    });
    return NextResponse.json({ steps, error: "Document not found" });
  }

  if (doc.documentType !== "terms_and_conditions") {
    steps.push({
      step: "1b. Check doc type",
      status: "error",
      detail: `Document type is "${doc.documentType}" — only "terms_and_conditions" can be analysed`,
    });
    return NextResponse.json({ steps });
  }

  // Step 2: Get applicable obligations
  let obligations;
  try {
    obligations = await getApplicableObligations(doc.productId);
    steps.push({
      step: "2. Get obligations",
      status: obligations.length > 0 ? "ok" : "error",
      detail: `Found ${obligations.length} obligations for productType "${doc.product.productType.name}" (typeId: ${doc.product.productTypeId})`,
    });
  } catch (e) {
    steps.push({
      step: "2. Get obligations",
      status: "error",
      detail: `${e instanceof Error ? e.message : String(e)}`,
    });
    return NextResponse.json({ steps, error: "Failed to get obligations" });
  }

  if (obligations.length === 0) {
    // Check if there are ANY ObligationProductApplicability records for this product type
    const totalApplicability = await prisma.obligationProductApplicability.count({
      where: { productTypeId: doc.product.productTypeId },
    });
    const totalObligations = await prisma.obligation.count({ where: { isActive: true } });
    const totalProductTypes = await prisma.productType.count();
    steps.push({
      step: "2b. Diagnose zero obligations",
      status: "error",
      detail: `ObligationProductApplicability records for this product type: ${totalApplicability}. Total active obligations: ${totalObligations}. Total product types: ${totalProductTypes}.`,
    });
    return NextResponse.json({ steps, error: "Zero obligations — batch cannot be created" });
  }

  // Step 3: Group by regulation and build requests
  const regulationGroups = groupByRegulation(obligations);
  const regNames = Array.from(regulationGroups.keys());
  steps.push({
    step: "3. Group by regulation",
    status: "ok",
    detail: `${regulationGroups.size} groups: ${regNames.join(", ")}`,
  });

  const overviewContext = await getProductOverviewContext(doc.productId);
  const productContext = `${doc.product.productType.name} product ("${doc.product.name}") aimed at ${doc.product.customerType} customers, distributed via ${doc.product.distributionChannel}, offered in ${doc.product.jurisdictions.join(", ")}`;

  const requests: Array<{
    custom_id: string;
    params: { model: string; max_tokens: number; system: string; messages: Array<{ role: "user"; content: string }> };
  }> = [];

  for (const [regTitle, regObligations] of regulationGroups) {
    const prompt = buildRegulationPrompt(regTitle, regObligations, doc.content, productContext, overviewContext);
    requests.push({
      custom_id: `test_${regTitle.replace(/\s+/g, "_").slice(0, 50)}`,
      params: {
        model: "claude-sonnet-4-5",
        max_tokens: prompt.maxTokens,
        system: prompt.system + JSON_INSTRUCTION,
        messages: [{ role: "user", content: prompt.userMessage }],
      },
    });
  }

  steps.push({
    step: "4. Build requests",
    status: "ok",
    detail: `${requests.length} requests built. First request: model=${requests[0].params.model}, max_tokens=${requests[0].params.max_tokens}, system_len=${requests[0].params.system.length}, message_len=${requests[0].params.messages[0].content.length}`,
  });

  // Step 5: Check Anthropic API key
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  steps.push({
    step: "5. Check API key",
    status: hasKey ? "ok" : "error",
    detail: hasKey
      ? `ANTHROPIC_API_KEY is set (${process.env.ANTHROPIC_API_KEY!.slice(0, 10)}...)`
      : "ANTHROPIC_API_KEY is NOT set!",
  });

  if (!hasKey) {
    return NextResponse.json({ steps, error: "No API key" });
  }

  // Step 6: Call Anthropic batch API
  let batch;
  try {
    batch = await anthropic.messages.batches.create({ requests });
    steps.push({
      step: "6. Create Anthropic batch",
      status: "ok",
      detail: `Batch created: ${batch.id} (status: ${batch.processing_status})`,
    });
  } catch (e) {
    const errDetail = e instanceof Error
      ? `${e.name}: ${e.message}${(e as unknown as { status?: number }).status ? ` (HTTP ${(e as unknown as { status?: number }).status})` : ""}`
      : String(e);
    steps.push({
      step: "6. Create Anthropic batch",
      status: "error",
      detail: errDetail,
    });
    return NextResponse.json({ steps, error: "Anthropic batch creation failed" });
  }

  // Step 7: Check BatchJob table exists
  try {
    const count = await prisma.batchJob.count();
    steps.push({
      step: "7. Check BatchJob table",
      status: "ok",
      detail: `BatchJob table exists (${count} existing records)`,
    });
  } catch (e) {
    steps.push({
      step: "7. Check BatchJob table",
      status: "error",
      detail: `BatchJob table query failed: ${e instanceof Error ? e.message : String(e)}`,
    });
    return NextResponse.json({ steps, error: "BatchJob table missing — migration needed?" });
  }

  steps.push({
    step: "DONE",
    status: "ok",
    detail: `Batch ${batch.id} created successfully with ${requests.length} requests. This was a test — the batch is real and will be processed by Anthropic.`,
  });

  return NextResponse.json({ steps, batchId: batch.id });
}
