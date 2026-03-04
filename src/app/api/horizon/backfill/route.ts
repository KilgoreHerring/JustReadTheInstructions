import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lightClassifyItem } from "@/lib/horizon-scanner";

export async function POST() {
  try {
    // Find items missing taxonomy data (topicAreas empty)
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
            itemType: result.documentType || item.itemType,
          },
        });
        classified++;
      } catch (e) {
        errors.push(`${item.id}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    // Count remaining
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
