import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateComplianceMatrix, updateMatrixEntry } from "@/lib/matching-engine";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matrix = await generateComplianceMatrix(id);
  return NextResponse.json(matrix);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { entryId, complianceStatus, owner, evidence, notes } = body;

  if (!entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 });
  }

  const updated = await updateMatrixEntry(entryId, {
    complianceStatus,
    owner,
    evidence,
    notes,
  });

  return NextResponse.json(updated);
}
