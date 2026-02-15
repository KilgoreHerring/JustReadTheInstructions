import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { OBLIGATION_TYPES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const regulation = await prisma.regulation.findUnique({
    where: { id },
    include: {
      regulator: true,
      sections: {
        where: { parentId: null },
        orderBy: { number: "asc" },
        include: {
          children: {
            orderBy: { number: "asc" },
            include: {
              rules: {
                include: {
                  obligations: {
                    where: { isActive: true },
                    orderBy: { obligationType: "asc" },
                  },
                },
                orderBy: { reference: "asc" },
              },
            },
          },
          rules: {
            include: {
              obligations: {
                where: { isActive: true },
                orderBy: { obligationType: "asc" },
              },
            },
            orderBy: { reference: "asc" },
          },
        },
      },
    },
  });

  if (!regulation) notFound();

  const totalObligations = regulation.sections.reduce((total, section) => {
    const sectionObs = section.rules.reduce(
      (sum, r) => sum + r.obligations.length,
      0
    );
    const childObs = section.children.reduce(
      (sum, child) =>
        sum + child.rules.reduce((s, r) => s + r.obligations.length, 0),
      0
    );
    return total + sectionObs + childObs;
  }, 0);

  return (
    <div className="prose-column">
      <a
        href="/regulations"
        className="text-sm text-[var(--accent)] hover:underline"
      >
        &larr; All Regulations
      </a>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
          {regulation.title}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {regulation.citation} &middot; {regulation.regulator.name} &middot;{" "}
          {totalObligations} obligations extracted
        </p>
      </div>

      <div className="space-y-6">
        {regulation.sections.map((section) => (
          <div key={section.id}>
            <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-2 mb-3" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
              {section.number} — {section.title}
            </h2>

            <RuleList rules={section.rules} />

            {section.children.map((child) => (
              <div key={child.id} className="ml-4 mt-4">
                <h3 className="text-md font-medium mb-2" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
                  {child.number} — {child.title}
                </h3>
                <RuleList rules={child.rules} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleList({
  rules,
}: {
  rules: {
    id: string;
    reference: string;
    rawText: string;
    obligations: {
      id: string;
      obligationType: string;
      summary: string;
      addressee: string;
      actionText: string;
      extractedBy: string;
      confidenceScore: number | null;
      verifiedBy: string | null;
    }[];
  }[];
}) {
  if (rules.length === 0) return null;

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="border border-[var(--border)] rounded-lg p-4"
        >
          <p className="text-xs text-[var(--muted-foreground)] mb-2" style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
            {rule.reference}
          </p>
          <p className="text-sm mb-3">{rule.rawText}</p>

          {rule.obligations.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3 mt-3">
              <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Extracted Obligations ({rule.obligations.length})
              </p>
              <div className="space-y-2">
                {rule.obligations.map((ob) => {
                  const obType =
                    OBLIGATION_TYPES[
                      ob.obligationType as keyof typeof OBLIGATION_TYPES
                    ];
                  return (
                    <div key={ob.id} className="flex items-start gap-2 text-sm">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${obType?.color || ""}`}
                      >
                        {obType?.label || ob.obligationType}
                      </span>
                      <div>
                        <p>{ob.summary}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Addressee: {ob.addressee}
                          {ob.verifiedBy
                            ? " · Verified"
                            : ob.extractedBy === "llm"
                              ? ` · LLM extracted (${Math.round((ob.confidenceScore || 0) * 100)}% confidence)`
                              : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
