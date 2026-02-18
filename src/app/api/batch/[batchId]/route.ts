import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pollBatchJob } from "@/lib/batch-analyser";

export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  try {
    const status = await pollBatchJob(batchId);
    return NextResponse.json({
      id: status.id,
      anthropicBatchId: status.anthropicBatchId,
      status: status.status,
      totalRequests: status.totalRequests,
      succeededCount: status.succeededCount,
      failedCount: status.failedCount,
      createdAt: status.createdAt,
      completedAt: status.completedAt,
      error: status.error,
    });
  } catch (error) {
    // If job not found, try looking up by ID
    const job = await prisma.batchJob.findUnique({ where: { id: batchId } });
    if (!job) {
      return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
    }
    console.error("[Batch API] Poll failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Poll failed" },
      { status: 500 }
    );
  }
}
