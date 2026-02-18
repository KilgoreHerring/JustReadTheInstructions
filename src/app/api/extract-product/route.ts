import { NextRequest, NextResponse } from "next/server";
import { detectFileType, extractText } from "@/lib/document-parser";
import { extractProductDetails } from "@/lib/product-extractor";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileType = detectFileType(file.name);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF or DOCX file." },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, fileType);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract meaningful text from the file. The PDF may be image-based or the file may be empty.",
        },
        { status: 422 }
      );
    }

    const details = await extractProductDetails(text);

    return NextResponse.json({
      extractedDetails: details,
      extractedText: text,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Document extraction failed:", error);
    return NextResponse.json(
      {
        error:
          "Failed to process the document. Please try again or enter details manually.",
      },
      { status: 500 }
    );
  }
}
