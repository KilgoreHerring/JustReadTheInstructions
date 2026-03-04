import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.horizonItem.findUnique({
    where: { id },
    include: {
      regulator: { select: { id: true, name: true, abbreviation: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      parent: {
        select: { id: true, title: true, handbookNoticeNumber: true },
      },
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
      regulationLinks: {
        include: {
          regulation: { select: { id: true, title: true, citation: true } },
        },
        orderBy: { confidence: "desc" },
      },
      obligationLinks: {
        include: {
          obligation: {
            select: {
              id: true,
              summary: true,
              obligationType: true,
              rule: {
                select: {
                  reference: true,
                  section: {
                    select: {
                      number: true,
                      title: true,
                      regulation: { select: { id: true, title: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { confidence: "desc" },
      },
      crossRefsFrom: {
        include: {
          toItem: { select: { id: true, title: true, referenceNumber: true, itemType: true } },
        },
      },
      crossRefsTo: {
        include: {
          fromItem: { select: { id: true, title: true, referenceNumber: true, itemType: true } },
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.horizonItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updatable: Record<string, unknown> = {};
  const fields = [
    "title", "itemType", "regulatorId", "summary", "sourceUrl",
    "referenceNumber", "status", "priority", "rawContent",
    "responseUrl", "relatedLegislation",
  ];
  for (const field of fields) {
    if (body[field] !== undefined) updatable[field] = body[field];
  }
  const dateFields = ["publishedDate", "responseDeadline", "effectiveDate", "estimatedFinalRuleDate"];
  for (const field of dateFields) {
    if (body[field] !== undefined) {
      updatable[field] = body[field] ? new Date(body[field]) : null;
    }
  }
  const arrayFields = ["jurisdictions", "topicAreas", "clientSectorRelevance"];
  for (const field of arrayFields) {
    if (body[field] !== undefined) updatable[field] = body[field];
  }
  const boolFields = ["requiresFirmResponse", "agBriefingPublished"];
  for (const field of boolFields) {
    if (body[field] !== undefined) updatable[field] = body[field];
  }

  const item = await prisma.horizonItem.update({
    where: { id },
    data: updatable,
    include: {
      regulator: { select: { id: true, name: true, abbreviation: true } },
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.horizonItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.horizonItem.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
