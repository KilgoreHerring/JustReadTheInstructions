import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import regulatorsData from "../../../../../../data/seed/regulators.json";
import feedSourcesData from "../../../../../../data/seed/feed-sources.json";

export async function POST() {
  const results = { regulators: 0, feedSources: 0, errors: [] as string[] };

  // Upsert regulators (abbreviation is not @unique, so use findFirst + create/update)
  for (const reg of regulatorsData) {
    try {
      const existing = await prisma.regulator.findFirst({
        where: { abbreviation: reg.abbreviation },
      });
      const sourceType = (reg as Record<string, unknown>).sourceType as string | undefined ?? "primary_regulator";

      if (existing) {
        await prisma.regulator.update({
          where: { id: existing.id },
          data: { name: reg.name, jurisdiction: reg.jurisdiction, website: reg.website, sourceType },
        });
      } else {
        await prisma.regulator.create({
          data: { name: reg.name, abbreviation: reg.abbreviation, jurisdiction: reg.jurisdiction, website: reg.website, sourceType },
        });
      }
      results.regulators++;
    } catch (e) {
      results.errors.push(`Regulator ${reg.abbreviation}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Upsert feed sources
  for (const feed of feedSourcesData) {
    try {
      let regulatorId: string | null = null;
      if (feed.regulatorAbbreviation) {
        const reg = await prisma.regulator.findFirst({
          where: { abbreviation: feed.regulatorAbbreviation },
        });
        regulatorId = reg?.id ?? null;
      }

      const existing = await prisma.feedSource.findFirst({
        where: { name: feed.name },
      });

      if (existing) {
        await prisma.feedSource.update({
          where: { id: existing.id },
          data: {
            feedUrl: feed.feedUrl,
            feedType: feed.feedType,
            filterTerms: feed.filterTerms,
            regulatorId,
          },
        });
      } else {
        await prisma.feedSource.create({
          data: {
            name: feed.name,
            feedUrl: feed.feedUrl,
            feedType: feed.feedType,
            filterTerms: feed.filterTerms,
            regulatorId,
          },
        });
      }
      results.feedSources++;
    } catch (e) {
      results.errors.push(`Feed ${feed.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
