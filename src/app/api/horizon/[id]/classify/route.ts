import { NextRequest, NextResponse } from "next/server";
import { classifyHorizonItem } from "@/lib/horizon-scanner";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const classification = await classifyHorizonItem(id);
    return NextResponse.json(classification);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Classification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
