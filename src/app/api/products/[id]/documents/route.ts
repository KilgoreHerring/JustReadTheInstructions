import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAnalysis } from "@/lib/document-analyser";

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

  const doc = await prisma.productDocument.create({
    data: {
      productId: id,
      documentType,
      fileName,
      content,
      analysisStatus: isOverview ? "complete" : "pending",
    },
  });

  // Only analyse T&Cs — product overview is context-only
  if (!isOverview) {
    runAnalysis(doc.id).catch(() => {});
  }

  return NextResponse.json(
    {
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.fileName,
      analysisStatus: doc.analysisStatus,
      analysisCompletedAt: doc.analysisCompletedAt,
      createdAt: doc.createdAt,
    },
    { status: 201 }
  );
}
