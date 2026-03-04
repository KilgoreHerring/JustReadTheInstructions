import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ingestHandbookNotice } from "@/lib/horizon-scanner";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { noticeNumber } = body;

  if (!noticeNumber || typeof noticeNumber !== "number" || noticeNumber < 1) {
    return NextResponse.json(
      { error: "noticeNumber must be a positive integer" },
      { status: 400 }
    );
  }

  // Check if already ingested
  const existing = await prisma.horizonItem.findFirst({
    where: { handbookNoticeNumber: noticeNumber },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Handbook Notice ${noticeNumber} already ingested`, existingId: existing.id },
      { status: 409 }
    );
  }

  try {
    const result = await ingestHandbookNotice(noticeNumber);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`[Handbook Notice] Ingestion failed for ${noticeNumber}:`, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const notices = await prisma.horizonItem.findMany({
    where: {
      parentId: null,
      handbookNoticeNumber: { not: null },
    },
    include: {
      regulator: { select: { id: true, name: true, abbreviation: true } },
      children: {
        select: {
          id: true,
          title: true,
          summary: true,
          effectiveDate: true,
          status: true,
          referenceNumber: true,
          aiClassification: true,
        },
        orderBy: { effectiveDate: "asc" },
      },
    },
    orderBy: { handbookNoticeNumber: "desc" },
  });

  return NextResponse.json(notices);
}
