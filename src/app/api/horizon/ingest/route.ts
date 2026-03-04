import { NextRequest, NextResponse } from "next/server";
import { pollAllFeeds, updateStaleStatuses } from "@/lib/horizon-scanner";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel Cron Jobs
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [result, staleCount] = await Promise.all([
      pollAllFeeds(),
      updateStaleStatuses(),
    ]);
    return NextResponse.json({
      ok: true,
      created: result.total,
      byFeed: result.byFeed,
      staleProgressed: staleCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Manual poll trigger (no cron secret required)
export async function POST() {
  try {
    const [result, staleCount] = await Promise.all([
      pollAllFeeds(),
      updateStaleStatuses(),
    ]);
    return NextResponse.json({
      ok: true,
      created: result.total,
      byFeed: result.byFeed,
      staleProgressed: staleCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
