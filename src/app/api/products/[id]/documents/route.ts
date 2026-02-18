import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { calculateReadability } from "@/lib/readability-scorer";
import { createBatchForDocuments } from "@/lib/batch-analyser";

export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const documents = await prisma.productDocument.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentType: true,
      fileName: true,
      analysisStatus: true,
      analysisCompletedAt: true,
      readabilityScore: true,
      createdAt: true,
    },
  });
  return NextResponse.json(documents);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { documentType, fileName, content } = body;

  if (!documentType || !fileName || !content) {
    return NextResponse.json(
      { error: "documentType, fileName, and content are required" },
      { status: 400 }
    );
  }

  const validTypes = ["terms_and_conditions", "product_overview"];
  if (!validTypes.includes(documentType)) {
    return NextResponse.json(
      { error: `Invalid documentType. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Delete any existing document of the same type for this product
  await prisma.productDocument.deleteMany({
    where: { productId: id, documentType },
  });

  const isOverview = documentType === "product_overview";

  // Compute readability scores (fast, pure computation — no API call)
  let readabilityScore: Prisma.InputJsonValue | null = null;
  try {
    if (content.trim().length >= 100) {
      const raw = calculateReadability(content);
      readabilityScore = JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue;
      console.log("[Upload] Readability scoring succeeded:", JSON.stringify({ fcaAssessment: raw.fcaAssessment, hasScores: !!raw.scores }));
    } else {
      console.log(`[Upload] Skipping readability — content too short (${content.trim().length} chars)`);
    }
  } catch (readabilityErr) {
    console.error("[Upload] Readability scoring failed:", readabilityErr);
    // Non-critical — don't fail the upload if readability scoring errors
  }

  const doc = await prisma.productDocument.create({
    data: {
      productId: id,
      documentType,
      fileName,
      content,
      analysisStatus: isOverview ? "complete" : "pending",
      readabilityScore: readabilityScore ?? undefined,
    },
  });

  // For T&Cs: automatically submit to Anthropic Batch API for analysis
  // This is fast (~1-2s) — just submits the request, doesn't wait for results
  let batchJobId: string | null = null;
  let batchError: string | null = null;
  if (documentType === "terms_and_conditions") {
    try {
      console.log(`[Upload] Creating batch job for document ${doc.id} (product: ${id})`);
      batchJobId = await createBatchForDocuments([doc.id]);
      console.log(`[Upload] Batch job created successfully: ${batchJobId}`);
    } catch (batchErr) {
      const errMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
      console.error(`[Upload] Batch creation failed for doc ${doc.id}:`, errMsg);
      batchError = errMsg;
      // Reset document to "pending" so user can re-trigger
      await prisma.productDocument.update({
        where: { id: doc.id },
        data: { analysisStatus: "pending" },
      });
    }
  }

  // Re-fetch to get the updated analysisStatus (batch sets it to "queued")
  const updated = await prisma.productDocument.findUniqueOrThrow({
    where: { id: doc.id },
    select: {
      id: true,
      documentType: true,
      fileName: true,
      analysisStatus: true,
      analysisCompletedAt: true,
      readabilityScore: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { ...updated, batchJobId, batchError },
    { status: 201 }
  );
}
