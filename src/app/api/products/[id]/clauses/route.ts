import { NextRequest, NextResponse } from "next/server";
import { generateClausesForProduct } from "@/lib/clause-generator";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const clauses = await generateClausesForProduct(id);
    return NextResponse.json(clauses);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate clauses: " + String(error) },
      { status: 500 }
    );
  }
}
