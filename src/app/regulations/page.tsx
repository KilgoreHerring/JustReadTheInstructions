import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RegulationsPage() {
  const regulations = await prisma.regulation.findMany({
    include: {
      regulator: true,
      _count: { select: { sections: true } },
    },
    orderBy: [{ regulator: { jurisdiction: "asc" } }, { title: "asc" }],
  });

  const byJurisdiction = regulations.reduce(
    (acc, reg) => {
      const j = reg.regulator.jurisdiction;
      if (!acc[j]) acc[j] = [];
      acc[j].push(reg);
      return acc;
    },
    {} as Record<string, typeof regulations>
  );

  return (
    <div className="prose-column">
      <h1 className="text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
        Regulations
      </h1>

      {Object.entries(byJurisdiction).map(([jurisdiction, regs]) => (
        <div key={jurisdiction} className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            {jurisdiction}
          </h2>
          <div className="grid gap-3">
            {regs.map((reg) => (
              <a
                key={reg.id}
                href={`/regulations/${reg.id}`}
                className="block border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{reg.title}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {reg.citation} &middot; {reg.regulator.abbreviation}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        reg.status === "active"
                          ? "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]"
                          : "bg-[var(--status-not-assessed-bg)] text-[var(--status-not-assessed-text)]"
                      }`}
                    >
                      {reg.status}
                    </span>
                    <span>{reg._count.sections} sections</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}

      {regulations.length === 0 && (
        <div className="border border-[var(--border)] rounded-lg p-12 text-center">
          <p className="text-[var(--muted-foreground)]">
            No regulations loaded. Run the seed script to populate the database.
          </p>
        </div>
      )}
    </div>
  );
}
