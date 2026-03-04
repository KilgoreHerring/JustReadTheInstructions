import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { toItemId, relationship, confidence, source } = body;

  if (!toItemId || !relationship) {
    return NextResponse.json(
      { error: "toItemId and relationship are required" },
      { status: 400 }
    );
  }

  // Verify both items exist
  const [fromItem, toItem] = await Promise.all([
    prisma.horizonItem.findUnique({ where: { id } }),
    prisma.horizonItem.findUnique({ where: { id: toItemId } }),
  ]);

  if (!fromItem || !toItem) {
    return NextResponse.json({ error: "One or both items not found" }, { status: 404 });
  }

  const crossRef = await prisma.horizonCrossReference.upsert({
    where: { fromItemId_toItemId: { fromItemId: id, toItemId } },
    update: { relationship, confidence: confidence ?? null, source: source ?? "manual" },
    create: {
      fromItemId: id,
      toItemId,
      relationship,
      confidence: confidence ?? null,
      source: source ?? "manual",
    },
    include: {
      toItem: { select: { id: true, title: true, referenceNumber: true } },
    },
  });

  return NextResponse.json(crossRef, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const crossRefId = searchParams.get("crossRefId");

  if (!crossRefId) {
    return NextResponse.json({ error: "crossRefId is required" }, { status: 400 });
  }

  const crossRef = await prisma.horizonCrossReference.findFirst({
    where: {
      id: crossRefId,
      OR: [{ fromItemId: id }, { toItemId: id }],
    },
  });

  if (!crossRef) {
    return NextResponse.json({ error: "Cross-reference not found" }, { status: 404 });
  }

  await prisma.horizonCrossReference.delete({ where: { id: crossRefId } });

  return NextResponse.json({ ok: true });
}
