import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    await prisma.productDocument.create({
      data: {
        productId: product.id,
        documentType: "terms_and_conditions",
        fileName: extractedFileName,
        content: extractedText,
        analysisStatus: "pending",
      },
    });
    // Analysis is triggered separately by the frontend
  }

  return NextResponse.json(product, { status: 201 });
}
