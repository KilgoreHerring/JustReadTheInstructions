import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lightClassifyItem, deriveInitialStatus } from "@/lib/horizon-scanner";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode"); // "status" for status-only backfill

  try {
    // ── Status backfill mode ──
    if (mode === "status") {
      const consultationTypes = [
        "consultation_paper", "discussion_paper", "market_study",
        "legislative_proposal", "speech", "report", "other",
      ];

      const mismatched = await prisma.horizonItem.findMany({
        where: {
          status: "consultation",
          itemType: { notIn: consultationTypes },
        },
        select: { id: true, itemType: true },
      });

      let updated = 0;
      for (const item of mismatched) {
        const correctStatus = deriveInitialStatus(item.itemType);
        if (correctStatus !== "consultation") {
          await prisma.horizonItem.update({
            where: { id: item.id },
            data: { status: correctStatus },
          });
          updated++;
        }
      }

      return NextResponse.json({
        ok: true,
        mode: "status",
        found: mismatched.length,
        updated,
      });
    }

    // ── Taxonomy backfill mode (default) ──
    const items = await prisma.horizonItem.findMany({
      where: {
        topicAreas: { isEmpty: true },
      },
      include: {
        regulator: { select: { abbreviation: true } },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    if (items.length === 0) {
      return NextResponse.json({ ok: true, classified: 0, remaining: 0 });
    }

    let classified = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const result = await lightClassifyItem(
          item.title,
          item.summary,
          item.regulator?.abbreviation ?? null
        );

        const refinedType = result.documentType || item.itemType;
        await prisma.horizonItem.update({
          where: { id: item.id },
          data: {
            jurisdictions: result.jurisdictions.length > 0
              ? result.jurisdictions
              : item.jurisdictions,
            topicAreas: result.topicAreas,
            clientSectorRelevance: result.clientSectorRelevance,
            requiresFirmResponse: result.requiresFirmResponse,
            priority: result.suggestedPriority,
            itemType: refinedType,
            status: deriveInitialStatus(refinedType),
          },
        });
        classified++;
      } catch (e) {
        errors.push(`${item.id}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    const remaining = await prisma.horizonItem.count({
      where: { topicAreas: { isEmpty: true } },
    });

    return NextResponse.json({
      ok: true,
      classified,
      errors: errors.length > 0 ? errors : undefined,
      remaining,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Backfill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
