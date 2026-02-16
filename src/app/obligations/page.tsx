import { prisma } from "@/lib/db";
import ObligationsList from "@/components/obligations-list";

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
      acc[reg].push({
        id: ob.id,
        summary: ob.summary,
        obligationType: ob.obligationType,
        addressee: ob.addressee,
        extractedBy: ob.extractedBy,
        verifiedBy: ob.verifiedBy,
        evidenceScope: ob.evidenceScope,
        rule: {
          reference: ob.rule.reference,
          regulation: reg,
        },
        productTypes: ob.productApplicability.map((pa) => pa.productType.name),
      });
      return acc;
    },
    {} as Record<string, Array<{
      id: string;
      summary: string;
      obligationType: string;
      addressee: string;
      extractedBy: string;
      verifiedBy: string | null;
      evidenceScope: string;
      rule: { reference: string; regulation: string };
      productTypes: string[];
    }>>
  );

  return (
    <div className="prose-column">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            Obligations
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {obligations.length} active obligations across {Object.keys(byRegulation).length} regulations
          </p>
        </div>
      </div>

      {obligations.length > 0 ? (
        <ObligationsList byRegulation={byRegulation} />
      ) : (
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
