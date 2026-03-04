import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import regulatorsData from "../../../../../../data/seed/regulators.json";
import feedSourcesData from "../../../../../../data/seed/feed-sources.json";

export async function POST() {
  const results = { regulators: 0, feedSources: 0, errors: [] as string[] };

  // Upsert regulators
  for (const reg of regulatorsData) {
    try {
      await prisma.regulator.upsert({
        where: { abbreviation: reg.abbreviation },
        update: {
          name: reg.name,
          jurisdiction: reg.jurisdiction,
          website: reg.website,
          sourceType: (reg as Record<string, unknown>).sourceType as string | undefined ?? "primary_regulator",
        },
        create: {
          name: reg.name,
          abbreviation: reg.abbreviation,
          jurisdiction: reg.jurisdiction,
          website: reg.website,
          sourceType: (reg as Record<string, unknown>).sourceType as string | undefined ?? "primary_regulator",
        },
      });
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
