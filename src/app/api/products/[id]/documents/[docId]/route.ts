import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAnalysis } from "@/lib/document-analyser";
import { createBatchForDocuments, resolveOutstandingBatches } from "@/lib/batch-analyser";

export const maxDuration = 60;

const DOC_SELECT = {
  id: true,
  documentType: true,
  fileName: true,
  analysisStatus: true,
  analysisResult: true,
  analysisError: true,
  analysisCompletedAt: true,
  readabilityScore: true,
  createdAt: true,
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;
  const doc = await prisma.productDocument.findUnique({
    where: { id: docId },
    select: DOC_SELECT,
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If the document is queued, try to resolve outstanding batch jobs
  // so the frontend polling loop can detect completion
  if (doc.analysisStatus === "queued") {
    try {
      await resolveOutstandingBatches();
      // Re-fetch in case status changed
      const updated = await prisma.productDocument.findUnique({
        where: { id: docId },
        select: DOC_SELECT,
      });
      if (updated) return NextResponse.json(updated);
    } catch (e) {
      console.error("[DocPoll] Failed to resolve batches:", e);
    }
  }

  // Safety net: if a T&Cs document is stuck in "pending", auto-trigger batch
  if (doc.analysisStatus === "pending" && doc.documentType === "terms_and_conditions") {
    try {
      console.log(`[DocPoll] Auto-triggering batch for pending T&Cs doc ${docId}`);
      await createBatchForDocuments([docId]);
      const updated = await prisma.productDocument.findUnique({
        where: { id: docId },
        select: DOC_SELECT,
      });
      if (updated) return NextResponse.json(updated);
    } catch (e) {
      console.error("[DocPoll] Auto-trigger batch failed:", e);
    }
  }

  return NextResponse.json(doc);
}

// Re-trigger analysis — supports mode: "batch" (default) | "realtime"
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;

  let mode = "batch";
  try {
    const body = await request.json();
    if (body.mode === "realtime") mode = "realtime";
  } catch {
    // No body or invalid JSON — default to batch
  }

  if (mode === "batch") {
    try {
      console.log(`[Analysis] Creating batch for document ${docId}`);
      const batchJobId = await createBatchForDocuments([docId]);
      console.log(`[Analysis] Batch created: ${batchJobId}`);
      const doc = await prisma.productDocument.findUniqueOrThrow({
        where: { id: docId },
        select: DOC_SELECT,
      });
      return NextResponse.json({ ...doc, batchJobId });
    } catch (error) {
      console.error("[Analysis] Batch creation failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Batch creation failed" },
        { status: 500 }
      );
    }
  }

  // Real-time: await analysis (use only for small/fast re-analyses)
  try {
    await runAnalysis(docId);
    const doc = await prisma.productDocument.findUniqueOrThrow({
      where: { id: docId },
      select: DOC_SELECT,
    });
    return NextResponse.json(doc);
  } catch (error) {
    console.error("[Analysis] POST handler error:", error);
    const doc = await prisma.productDocument.findUnique({
      where: { id: docId },
      select: DOC_SELECT,
    });
    return NextResponse.json(doc || { error: "Analysis failed" }, { status: 500 });
  }
}
