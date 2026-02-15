import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const regulations = await prisma.regulation.findMany({
    include: {
      regulator: true,
      sections: {
        where: { parentId: null },
        orderBy: { number: "asc" },
        include: {
          children: {
            orderBy: { number: "asc" },
          },
          _count: { select: { rules: true } },
        },
      },
      _count: { select: { sections: true } },
    },
    orderBy: [{ regulator: { jurisdiction: "asc" } }, { title: "asc" }],
  });

  return NextResponse.json(regulations);
}
