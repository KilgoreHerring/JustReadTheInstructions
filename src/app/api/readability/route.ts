import { NextRequest, NextResponse } from "next/server";
import { calculateReadability } from "@/lib/readability-scorer";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "content is required and must be a string" },
      { status: 400 }
    );
  }

  if (content.trim().length < 100) {
    return NextResponse.json(
      { error: "Text is too short for meaningful readability analysis (minimum 100 characters)" },
      { status: 400 }
    );
  }

  try {
    const result = calculateReadability(content);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Readability analysis failed" },
      { status: 500 }
    );
  }
}
