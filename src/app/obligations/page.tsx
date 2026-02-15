import { prisma } from "@/lib/db";
import { OBLIGATION_TYPES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ObligationsPage() {
  const obligations = await prisma.obligation.findMany({
    where: { isActive: true },
    include: {
      rule: {
        include: {
          section: { include: { regulation: { include: { regulator: true } } } },
        },
      },
      productApplicability: {
        include: { productType: true },
      },
    },
    orderBy: [
      { rule: { section: { regulation: { title: "asc" } } } },
      { rule: { reference: "asc" } },
    ],
  });

  const byRegulation = obligations.reduce(
    (acc, ob) => {
      const reg = ob.rule.section.regulation.title;
      if (!acc[reg]) acc[reg] = [];
      acc[reg].push(ob);
      return acc;
    },
    {} as Record<string, typeof obligations>
  );

  return (
    <div className="prose-column">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            Obligations
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {obligations.length} active obligations across all regulations
          </p>
        </div>
      </div>

      {Object.entries(byRegulation).map(([regulation, obs]) => (
        <div key={regulation} className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            {regulation} ({obs.length})
          </h2>
          <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
            {obs.map((ob) => {
              const obType =
                OBLIGATION_TYPES[
                  ob.obligationType as keyof typeof OBLIGATION_TYPES
                ];
              return (
                <div key={ob.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 mt-0.5 ${obType?.color || ""}`}
                    >
                      {obType?.label || ob.obligationType}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ob.summary}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        <span style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
                          {ob.rule.reference}
                        </span>
                        {" "}&middot; {ob.addressee}
                        {ob.verifiedBy && " · Verified"}
                        {!ob.verifiedBy &&
                          ob.extractedBy === "llm" &&
                          " · Pending verification"}
                      </p>
                      {ob.productApplicability.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {ob.productApplicability.map((pa) => (
                            <span
                              key={pa.id}
                              className="text-xs px-2 py-0.5 border border-current/30 rounded-full text-[var(--muted-foreground)]"
                            >
                              {pa.productType.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {obligations.length === 0 && (
        <div className="border border-[var(--border)] rounded-lg p-12 text-center">
          <p className="text-[var(--muted-foreground)]">
            No obligations extracted yet. Seed the database or use the
            extraction pipeline.
          </p>
        </div>
      )}
    </div>
  );
}
