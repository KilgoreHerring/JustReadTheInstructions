import { NextRequest, NextResponse } from "next/server";
import { extractHorizonItemFromText } from "@/lib/horizon-scanner";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { rawText } = body;

  if (!rawText || typeof rawText !== "string") {
    return NextResponse.json(
      { error: "rawText is required" },
      { status: 400 }
    );
  }

  try {
    const result = await extractHorizonItemFromText(rawText);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
