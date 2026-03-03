import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ regulationId: string }> }
) {
  const { regulationId } = await params;

  const obligations = await prisma.obligation.findMany({
    where: {
      rule: {
        section: {
          regulationId,
        },
      },
    },
    select: {
      id: true,
      summary: true,
      obligationType: true,
      rule: {
        select: {
          reference: true,
        },
      },
    },
    orderBy: {
      rule: { reference: "asc" },
    },
  });

  return NextResponse.json(obligations);
}
