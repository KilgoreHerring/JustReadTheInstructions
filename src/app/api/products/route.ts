import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { calculateReadability } from "@/lib/readability-scorer";
import { createBatchForDocuments } from "@/lib/batch-analyser";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { productType: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, productTypeId, description, jurisdictions, customerType, distributionChannel, extractedText, extractedFileName } = body;

  if (!name || !productTypeId || !customerType || !distributionChannel) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      name,
      productTypeId,
      description: description || null,
      jurisdictions: jurisdictions || ["UK"],
      customerType,
      distributionChannel,
    },
    include: { productType: true },
  });

  if (extractedText && extractedFileName) {
    // Compute readability scores
    let readabilityScore: Prisma.InputJsonValue | null = null;
    try {
      if (extractedText.trim().length >= 100) {
        const raw = calculateReadability(extractedText);
        readabilityScore = JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue;
      }
    } catch (e) {
      console.error("[Product] Readability scoring failed:", e);
    }

    const doc = await prisma.productDocument.create({
      data: {
        productId: product.id,
        documentType: "terms_and_conditions",
        fileName: extractedFileName,
        content: extractedText,
        analysisStatus: "pending",
        readabilityScore: readabilityScore ?? undefined,
      },
    });

    // Auto-submit to Anthropic Batch API for analysis
    try {
      console.log(`[Product] Creating batch job for document ${doc.id}`);
      const batchJobId = await createBatchForDocuments([doc.id]);
      console.log(`[Product] Batch job created: ${batchJobId}`);
    } catch (batchErr) {
      console.error(`[Product] Batch creation failed:`, batchErr instanceof Error ? batchErr.message : batchErr);
      // Non-fatal — document stays "pending", user can re-trigger from product page
    }
  }

  return NextResponse.json(product, { status: 201 });
}
