import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAnalysis } from "@/lib/document-analyser";

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

  return NextResponse.json(doc);
}

// Re-trigger analysis
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;

  // Reset status before re-running
  const doc = await prisma.productDocument.update({
    where: { id: docId },
    data: {
      analysisStatus: "analysing",
      analysisResult: undefined,
      analysisError: null,
      analysisCompletedAt: null,
    },
    select: {
      id: true,
      documentType: true,
      fileName: true,
      analysisStatus: true,
      analysisCompletedAt: true,
      createdAt: true,
    },
  });

  runAnalysis(docId).catch(() => {});

  return NextResponse.json(doc);
}
