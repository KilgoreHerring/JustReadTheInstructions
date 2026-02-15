import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.productDocument.findMany({
    select: {
      documentType: true,
      analysisStatus: true,
      analysisError: true,
    },
  });
  for (const d of docs) {
    console.log(`${d.documentType} — ${d.analysisStatus}`);
    if (d.analysisError) console.log(`  ERROR: ${d.analysisError}`);
  }
  if (docs.length === 0) console.log("No documents found");
  await prisma.$disconnect();
}

main();
