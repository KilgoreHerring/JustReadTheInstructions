import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { type, regulationId, obligationId, impactType, confidence } = body;

  const item = await prisma.horizonItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Horizon item not found" }, { status: 404 });
  }

  if (type === "regulation" && regulationId) {
    const link = await prisma.horizonRegulationLink.upsert({
      where: { horizonItemId_regulationId: { horizonItemId: id, regulationId } },
      update: { confidence: confidence ?? null, source: "manual" },
      create: {
        horizonItemId: id,
        regulationId,
        confidence: confidence ?? null,
        source: "manual",
      },
      include: {
        regulation: { select: { id: true, title: true, citation: true } },
      },
    });
    return NextResponse.json(link, { status: 201 });
  }

  if (type === "obligation" && obligationId) {
    const link = await prisma.horizonObligationLink.upsert({
      where: { horizonItemId_obligationId: { horizonItemId: id, obligationId } },
      update: {
        impactType: impactType || "unknown",
        confidence: confidence ?? null,
        source: "manual",
      },
      create: {
        horizonItemId: id,
        obligationId,
        impactType: impactType || "unknown",
        confidence: confidence ?? null,
        source: "manual",
      },
      include: {
        obligation: {
          select: {
            id: true,
            summary: true,
            rule: {
              select: {
                reference: true,
                section: {
                  select: {
                    regulation: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    return NextResponse.json(link, { status: 201 });
  }

  return NextResponse.json(
    { error: "Provide type ('regulation' or 'obligation') and the relevant ID" },
    { status: 400 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const linkId = searchParams.get("linkId");

  if (!type || !linkId) {
    return NextResponse.json(
      { error: "type and linkId query params required" },
      { status: 400 }
    );
  }

  // Verify horizon item exists
  const item = await prisma.horizonItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Horizon item not found" }, { status: 404 });
  }

  if (type === "regulation") {
    await prisma.horizonRegulationLink.delete({ where: { id: linkId } });
  } else if (type === "obligation") {
    await prisma.horizonObligationLink.delete({ where: { id: linkId } });
  } else {
    return NextResponse.json({ error: "type must be 'regulation' or 'obligation'" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
