import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, COMPLIANCE_STATUSES } from "@/lib/utils";
import { DocumentUpload } from "@/components/document-upload";
import { DocumentAnalysisResults } from "@/components/document-analysis-results";
import { ClauseGenerationCard } from "@/components/clause-generation-card";
import { ReadabilityResultsServer } from "@/components/readability-results-server";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      productType: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      matrixEntries: {
        select: { complianceStatus: true },
      },
    },
  });

  if (!product) notFound();

  const statusCounts = product.matrixEntries.reduce(
    (acc, e) => {
      acc[e.complianceStatus] = (acc[e.complianceStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const existingDocs = product.documents.map((d) => ({
    id: d.id,
    documentType: d.documentType,
    fileName: d.fileName,
    analysisStatus: d.analysisStatus,
    analysisCompletedAt: d.analysisCompletedAt?.toISOString() || null,
    createdAt: d.createdAt.toISOString(),
  }));

  const completedDocs = product.documents.filter(
    (d) => d.analysisStatus === "complete" && d.analysisResult
  );

  return (
    <div className="prose-column">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            {product.name}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {product.productType.name} &middot; {product.jurisdictions.join(", ")} &middot;{" "}
            <span className="capitalize">{product.customerType}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/products/${id}/matrix`}
            className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium hover:opacity-90"
          >
            View Compliance Matrix
          </a>
        </div>
      </div>

      {product.description && (
        <div className="border border-[var(--border)] rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            Description
          </h2>
          <p className="text-sm">{product.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-[var(--border)] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            Product Details
          </h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-[var(--muted-foreground)]">Type</dt>
            <dd>{product.productType.name}</dd>
            <dt className="text-[var(--muted-foreground)]">Category</dt>
            <dd className="capitalize">{product.productType.category}</dd>
            <dt className="text-[var(--muted-foreground)]">Distribution</dt>
            <dd className="capitalize">{product.distributionChannel}</dd>
            <dt className="text-[var(--muted-foreground)]">Status</dt>
            <dd className="capitalize">{product.status}</dd>
            <dt className="text-[var(--muted-foreground)]">Created</dt>
            <dd>{formatDate(product.createdAt)}</dd>
          </dl>
        </div>

        <div className="border border-[var(--border)] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            Compliance Summary
          </h2>
          {product.matrixEntries.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Matrix not generated yet.{" "}
              <a
                href={`/products/${id}/matrix`}
                className="text-[var(--accent)] hover:underline"
              >
                Generate now
              </a>
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(statusCounts).map(([status, count]) => {
                const s =
                  COMPLIANCE_STATUSES[
                    status as keyof typeof COMPLIANCE_STATUSES
                  ];
                return (
                  <div key={status} className="flex items-center gap-2 text-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${s?.color || ""}`}
                    >
                      {s?.label || status}
                    </span>
                    <span>{count}</span>
                  </div>
                );
              })}
              <p className="text-xs text-[var(--muted-foreground)] pt-2">
                {product.matrixEntries.length} total obligations mapped
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Workflow steps */}
      <div className="mb-8 space-y-4">
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
          Compliance Workflow
        </h2>
        <p className="text-xs text-[var(--muted-foreground)]">
          Generate draft clauses &rarr; Review and edit into your product terms &rarr; Upload final document &rarr; Analyse compliance
        </p>

        {/* Step 1: Generate clauses */}
        <ClauseGenerationCard productId={id} />

        {/* Step 2: Upload & analyse documents */}
        <div className="border border-[var(--border)] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            Upload & Analyse Documents
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Upload product documents to automatically analyse compliance with
            applicable obligations. Each document is reviewed against the
            Consumer Duty and other relevant regulations.
          </p>
          <DocumentUpload productId={id} existingDocuments={existingDocs} />

          {completedDocs
            .filter((doc) => doc.documentType === "terms_and_conditions")
            .map((doc) => (
            <div key={doc.id} className="mt-4">
              <DocumentAnalysisResults
                result={doc.analysisResult as unknown as {
                  documentType: string;
                  overallAssessment: string;
                  obligationFindings: {
                    obligationId: string;
                    status: string;
                    evidence: string;
                    clauseReference?: string;
                    qualityScore?: number;
                    gaps: string[];
                    recommendation: string;
                  }[];
                  missingClauses?: string[];
                  qualityConcerns?: string[];
                }}
                matrixUrl={`/products/${id}/matrix`}
              />
            </div>
          ))}

          {/* Readability scores for all documents */}
          {product.documents
            .filter((doc) => doc.readabilityScore)
            .map((doc) => (
              <div key={`readability-${doc.id}`} className="mt-4">
                <ReadabilityResultsServer
                  result={doc.readabilityScore as Record<string, unknown>}
                  documentType={doc.documentType}
                  fileName={doc.fileName}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
