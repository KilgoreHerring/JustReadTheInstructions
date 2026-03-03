import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_FEEDS = [
  {
    name: "FCA Regulatory News",
    feedUrl: "https://www.fca.org.uk/news/rss.xml",
    feedType: "rss",
    filterTerms: [],
  },
  {
    name: "FCA Consultation Papers",
    feedUrl: "https://www.fca.org.uk/publications/consultation-papers/rss.xml",
    feedType: "rss",
    filterTerms: [],
  },
  {
    name: "FCA Policy Statements",
    feedUrl: "https://www.fca.org.uk/publications/policy-statements/rss.xml",
    feedType: "rss",
    filterTerms: [],
  },
  {
    name: "FCA Guidance Consultations",
    feedUrl: "https://www.fca.org.uk/publications/guidance-consultations/rss.xml",
    feedType: "rss",
    filterTerms: [],
  },
];

export async function POST() {
  // Find or create FCA regulator
  let fca = await prisma.regulator.findFirst({
    where: { abbreviation: "FCA" },
  });

  if (!fca) {
    fca = await prisma.regulator.create({
      data: {
        name: "Financial Conduct Authority",
        abbreviation: "FCA",
        jurisdiction: "UK",
        website: "https://www.fca.org.uk",
      },
    });
  }

  const created = [];
  const skipped = [];

  for (const feed of DEFAULT_FEEDS) {
    // Skip if already exists (by URL)
    const existing = await prisma.feedSource.findFirst({
      where: { feedUrl: feed.feedUrl },
    });

    if (existing) {
      skipped.push(feed.name);
      continue;
    }

    const source = await prisma.feedSource.create({
      data: {
        ...feed,
        regulatorId: fca.id,
      },
    });
    created.push({ id: source.id, name: source.name });
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    regulatorId: fca.id,
  });
}
