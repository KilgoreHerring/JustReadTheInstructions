import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const feeds = await prisma.feedSource.findMany({
    include: {
      regulator: { select: { id: true, name: true, abbreviation: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(feeds);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, regulatorId, feedUrl, feedType, filterTerms, pollInterval } = body;

  if (!name || !feedUrl || !feedType) {
    return NextResponse.json(
      { error: "name, feedUrl, and feedType are required" },
      { status: 400 }
    );
  }

  const feed = await prisma.feedSource.create({
    data: {
      name,
      regulatorId: regulatorId || null,
      feedUrl,
      feedType,
      filterTerms: filterTerms || [],
      pollInterval: pollInterval || 360,
    },
    include: {
      regulator: { select: { id: true, name: true, abbreviation: true } },
    },
  });

  return NextResponse.json(feed, { status: 201 });
}
