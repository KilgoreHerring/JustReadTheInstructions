import { NextRequest, NextResponse } from "next/server";
import { extractAndSaveObligations } from "@/lib/obligation-extractor";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ruleId } = body;

  if (!ruleId) {
    return NextResponse.json({ error: "ruleId required" }, { status: 400 });
  }

  try {
    const obligations = await extractAndSaveObligations(ruleId);
    return NextResponse.json({
      extracted: obligations.length,
      obligations,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Extraction failed: " + String(error) },
      { status: 500 }
    );
  }
}
