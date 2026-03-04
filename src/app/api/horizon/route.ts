import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const itemType = searchParams.get("itemType");
  const regulatorId = searchParams.get("regulatorId");
  const priority = searchParams.get("priority");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const parentId = searchParams.get("parentId");

  const where: Record<string, unknown> = {};
  // By default, hide child instruments (they appear via the handbook notice section).
  // Pass parentId explicitly to override (e.g. parentId=<id> to get children of a notice).
  if (parentId) {
    where.parentId = parentId;
  } else {
    where.parentId = null;
  }
  if (status) where.status = status;
  if (itemType) where.itemType = itemType;
  if (regulatorId) where.regulatorId = regulatorId;
  if (priority) where.priority = priority;
  if (fromDate || toDate) {
    where.publishedDate = {
      ...(fromDate ? { gte: new Date(fromDate) } : {}),
      ...(toDate ? { lte: new Date(toDate) } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.horizonItem.findMany({
      where,
      include: {
        regulator: { select: { id: true, name: true, abbreviation: true } },
        _count: { select: { regulationLinks: true, obligationLinks: true } },
      },
      orderBy: { publishedDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.horizonItem.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    title,
    itemType,
    regulatorId,
    summary,
    sourceUrl,
    referenceNumber,
    publishedDate,
    responseDeadline,
    effectiveDate,
    priority,
    rawContent,
    parentId: bodyParentId,
    jurisdictions,
    topicAreas,
    clientSectorRelevance,
    requiresFirmResponse,
    responseUrl,
    estimatedFinalRuleDate,
    relatedLegislation,
  } = body;

  if (!title || !itemType || !summary) {
    return NextResponse.json(
      { error: "title, itemType, and summary are required" },
      { status: 400 }
    );
  }

  const item = await prisma.horizonItem.create({
    data: {
      title,
      sourceType: "manual",
      itemType,
      regulatorId: regulatorId || null,
      summary,
      sourceUrl: sourceUrl || null,
      referenceNumber: referenceNumber || null,
      publishedDate: publishedDate ? new Date(publishedDate) : null,
      responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      priority: priority || "medium",
      rawContent: rawContent || null,
      parentId: bodyParentId || null,
      jurisdictions: jurisdictions || [],
      topicAreas: topicAreas || [],
      clientSectorRelevance: clientSectorRelevance || [],
      requiresFirmResponse: requiresFirmResponse || false,
      responseUrl: responseUrl || null,
      estimatedFinalRuleDate: estimatedFinalRuleDate ? new Date(estimatedFinalRuleDate) : null,
      relatedLegislation: relatedLegislation || null,
    },
    include: {
      regulator: { select: { id: true, name: true, abbreviation: true } },
    },
  });

  return NextResponse.json(item, { status: 201 });
}
