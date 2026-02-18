import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createBatchForDocuments } from "@/lib/batch-analyser";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { documentIds, productIds } = body as {
    documentIds?: string[];
    productIds?: string[];
  };

  let docIds: string[] = [];

  if (documentIds && documentIds.length > 0) {
    docIds = documentIds;
  } else if (productIds && productIds.length > 0) {
    const docs = await prisma.productDocument.findMany({
      where: {
        productId: { in: productIds },
        documentType: "terms_and_conditions",
      },
      select: { id: true },
    });
    docIds = docs.map((d) => d.id);
  } else {
    return NextResponse.json(
      { error: "Provide documentIds or productIds" },
      { status: 400 }
    );
  }

  if (docIds.length === 0) {
    return NextResponse.json(
      { error: "No T&C documents found to analyse" },
      { status: 400 }
    );
  }

  try {
    const batchJobId = await createBatchForDocuments(docIds);
    const job = await prisma.batchJob.findUniqueOrThrow({
      where: { id: batchJobId },
    });
    return NextResponse.json(
      {
        batchJobId: job.id,
        anthropicBatchId: job.anthropicBatchId,
        totalRequests: job.totalRequests,
        status: job.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Batch API] Create failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch creation failed" },
      { status: 500 }
    );
  }
}
