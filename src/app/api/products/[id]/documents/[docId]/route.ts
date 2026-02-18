import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAnalysis } from "@/lib/document-analyser";
import { createBatchForDocuments, resolveOutstandingBatches } from "@/lib/batch-analyser";

export const maxDuration = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;
  const doc = await prisma.productDocument.findUnique({
    where: { id: docId },
    select: {
      id: true,
      documentType: true,
      fileName: true,
      analysisStatus: true,
      analysisResult: true,
      analysisError: true,
      analysisCompletedAt: true,
      createdAt: true,
    },
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
        select: {
          id: true,
          documentType: true,
          fileName: true,
          analysisStatus: true,
          analysisResult: true,
          analysisError: true,
          analysisCompletedAt: true,
          createdAt: true,
        },
      });
      if (updated) return NextResponse.json(updated);
    } catch (e) {
      console.error("[DocPoll] Failed to resolve batches:", e);
    }
  }

  return NextResponse.json(doc);
}

// Re-trigger analysis — supports mode: "batch" | "realtime" (default)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;

  let mode = "realtime";
  try {
    const body = await request.json();
    if (body.mode === "batch") mode = "batch";
  } catch {
    // No body or invalid JSON — default to realtime
  }

  if (mode === "batch") {
    try {
      const batchJobId = await createBatchForDocuments([docId]);
      const doc = await prisma.productDocument.findUniqueOrThrow({
        where: { id: docId },
        select: {
          id: true, documentType: true, fileName: true,
          analysisStatus: true, analysisCompletedAt: true, createdAt: true,
        },
      });
      return NextResponse.json({ ...doc, batchJobId });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Batch creation failed" },
        { status: 500 }
      );
    }
  }

  // Real-time: await analysis (keeps the function alive until complete)
  try {
    await runAnalysis(docId);
    const doc = await prisma.productDocument.findUniqueOrThrow({
      where: { id: docId },
      select: {
        id: true, documentType: true, fileName: true,
        analysisStatus: true, analysisResult: true,
        analysisCompletedAt: true, createdAt: true,
      },
    });
    return NextResponse.json(doc);
  } catch (error) {
    console.error("[Analysis] POST handler error:", error);
    const doc = await prisma.productDocument.findUnique({
      where: { id: docId },
      select: {
        id: true, documentType: true, fileName: true,
        analysisStatus: true, analysisError: true,
        analysisCompletedAt: true, createdAt: true,
      },
    });
    return NextResponse.json(doc || { error: "Analysis failed" }, { status: 500 });
  }
}
