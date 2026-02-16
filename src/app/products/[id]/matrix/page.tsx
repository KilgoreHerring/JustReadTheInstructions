import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { generateComplianceMatrix } from "@/lib/matching-engine";

export const dynamic = "force-dynamic";
import { ComplianceMatrix } from "@/components/compliance-matrix";

export default async function MatrixPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) notFound();

  // Generate / refresh the compliance matrix
  const matrix = await generateComplianceMatrix(id);

  const entries = matrix.map((entry) => ({
    id: entry.id,
    complianceStatus: entry.complianceStatus,
    owner: entry.owner,
    notes: entry.notes,
    evidenceSource: entry.evidenceSource,
    documentEvidence: entry.documentEvidence as {
      documentType: string;
      status: string;
      evidence: string;
      clauseReference?: string;
      qualityScore?: number;
      gaps: string[];
      recommendation: string;
    }[] | null,
    obligation: {
      id: entry.obligation.id,
      obligationType: entry.obligation.obligationType,
      evidenceScope: entry.obligation.evidenceScope,
      summary: entry.obligation.summary,
      addressee: entry.obligation.addressee,
      actionText: entry.obligation.actionText,
      rule: {
        reference: entry.obligation.rule.reference,
        section: {
          number: entry.obligation.rule.section.number,
          title: entry.obligation.rule.section.title,
          regulation: {
            title: entry.obligation.rule.section.regulation.title,
          },
        },
      },
      clauseTemplates: entry.obligation.clauseTemplates.map((ct) => ({
        id: ct.id,
        title: ct.title,
        templateText: ct.templateText,
        guidance: ct.guidance,
      })),
    },
  }));

  return (
    <div>
      <div className="mb-6">
        <a
          href={`/products/${id}`}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          &larr; Back to {product.name}
        </a>
        <h1 className="text-2xl font-semibold tracking-tight mt-2" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
          Compliance Matrix — {product.name}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Review applicable regulatory obligations and track compliance status.
        </p>
      </div>

      <ComplianceMatrix
        productId={id}
        productName={product.name}
        entries={entries}
      />
    </div>
  );
}
