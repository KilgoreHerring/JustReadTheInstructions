import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> }
) {
  const { feedId } = await params;
  const body = await request.json();

  const existing = await prisma.feedSource.findUnique({ where: { id: feedId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updatable: Record<string, unknown> = {};
  const fields = ["name", "regulatorId", "feedUrl", "feedType", "isActive", "pollInterval", "filterTerms"];
  for (const field of fields) {
    if (body[field] !== undefined) updatable[field] = body[field];
  }

  const feed = await prisma.feedSource.update({
    where: { id: feedId },
    data: updatable,
    include: {
      regulator: { select: { id: true, name: true, abbreviation: true } },
    },
  });

  return NextResponse.json(feed);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> }
) {
  const { feedId } = await params;

  const existing = await prisma.feedSource.findUnique({ where: { id: feedId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.feedSource.delete({ where: { id: feedId } });

  return NextResponse.json({ ok: true });
}
