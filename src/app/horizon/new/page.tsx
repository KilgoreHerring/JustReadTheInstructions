import { prisma } from "@/lib/db";
import { HorizonItemForm } from "@/components/horizon-item-form";

export const dynamic = "force-dynamic";

export default async function NewHorizonItemPage() {
  const regulators = await prisma.regulator.findMany({
    select: { id: true, name: true, abbreviation: true },
    orderBy: { abbreviation: "asc" },
  });

  return (
    <div className="prose-column">
      <div className="mb-4">
        <a href="/horizon" className="text-xs text-[var(--accent)] hover:underline">
          &larr; Horizon Scanning
        </a>
      </div>
      <h1
        className="text-2xl font-semibold tracking-tight mb-6"
        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
      >
        New Horizon Item
      </h1>
      <HorizonItemForm regulators={regulators} />
    </div>
  );
}
