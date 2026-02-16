import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Scale } from "lucide-react";
import { ComplianceHeatmap } from "@/components/dashboard/compliance-heatmap";
import { ProductComplianceGrid } from "@/components/dashboard/product-compliance-grid";
import { AttentionQueue } from "@/components/dashboard/attention-queue";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { RiskSummary } from "@/components/dashboard/risk-summary";

export const dynamic = "force-dynamic";

interface DocumentEvidence {
  documentType: string;
  status: string;
  evidence: string;
  clauseReference?: string;
  qualityScore?: number;
  gaps: string[];
  recommendation: string;
}

async function getDashboardData() {
  const [heatmapEntries, products, recentAnalyses, gapObligations, entriesWithEvidence] =
    await Promise.all([
      prisma.complianceMatrixEntry.findMany({
        select: {
          productId: true,
          complianceStatus: true,
          evidenceSource: true,
          obligation: {
            select: {
              evidenceScope: true,
              rule: {
                select: {
                  section: {
                    select: {
                      regulation: { select: { id: true, title: true, citation: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.product.findMany({
        include: {
          productType: true,
          matrixEntries: {
            select: {
              complianceStatus: true,
              evidenceSource: true,
              obligation: { select: { evidenceScope: true } },
            },
          },
          documents: {
            select: {
              analysisStatus: true,
              analysisCompletedAt: true,
            },
            orderBy: { analysisCompletedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.productDocument.findMany({
        where: {
          analysisStatus: "complete",
          analysisCompletedAt: { not: null },
          documentType: "terms_and_conditions",
        },
        include: {
          product: { select: { id: true, name: true } },
        },
        orderBy: { analysisCompletedAt: "desc" },
        take: 10,
      }),
      prisma.complianceMatrixEntry.groupBy({
        by: ["obligationId"],
        where: { complianceStatus: "non_compliant" },
        _count: { obligationId: true },
        orderBy: { _count: { obligationId: "desc" } },
        take: 5,
      }),
      prisma.complianceMatrixEntry.findMany({
        where: {
          documentEvidence: { not: Prisma.DbNull },
          complianceStatus: { in: ["non_compliant", "in_progress"] },
        },
        select: { documentEvidence: true },
      }),
    ]);

  // Secondary query: obligation details for top gaps
  const obligationIds = gapObligations.map((g) => g.obligationId);
  const topGapObligations =
    obligationIds.length > 0
      ? await prisma.obligation.findMany({
          where: { id: { in: obligationIds } },
          include: {
            rule: {
              include: {
                section: {
                  include: {
                    regulation: { select: { title: true, citation: true } },
                  },
                },
              },
            },
          },
        })
      : [];

  return {
    heatmapEntries,
    products,
    recentAnalyses,
    gapObligations,
    topGapObligations,
    entriesWithEvidence,
  };
}

export default async function Dashboard() {
  const data = await getDashboardData();
  const productCount = data.products.length;

  // Empty state
  if (productCount === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <Scale size={48} className="mx-auto mb-4 text-[var(--muted-foreground)]" strokeWidth={1} />
          <h1
            className="text-2xl font-semibold tracking-tight mb-2"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Get started with Tractable
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Upload a product to map it against regulatory obligations and begin tracking compliance.
          </p>
          <a
            href="/products/new"
            className="inline-block px-5 py-2.5 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium hover:opacity-90"
          >
            Upload Product
          </a>
        </div>
      </div>
    );
  }

  // Process product data for grid and attention queue
  const productRows = data.products.map((p) => {
    const breakdown = {
      compliant: 0,
      non_compliant: 0,
      in_progress: 0,
      not_assessed: 0,
      not_applicable: 0,
    };
    for (const e of p.matrixEntries) {
      // Internal governance obligations that are non_compliant from doc analysis only → treat as not_assessed
      const isInternalFalsePositive =
        e.obligation.evidenceScope === "internal_governance" &&
        e.complianceStatus === "non_compliant" &&
        e.evidenceSource === "document_analysis";
      const effectiveStatus = isInternalFalsePositive ? "not_assessed" : e.complianceStatus;
      const key = effectiveStatus as keyof typeof breakdown;
      if (key in breakdown) breakdown[key]++;
    }
    const total = p.matrixEntries.length;
    const applicable = total - breakdown.not_applicable;
    const score = applicable > 0 ? Math.round((breakdown.compliant / applicable) * 100) : 0;
    const lastDoc = p.documents[0];

    return {
      id: p.id,
      name: p.name,
      productTypeName: p.productType.name,
      status: p.status,
      statusBreakdown: breakdown,
      totalObligations: total,
      complianceScore: score,
      lastAnalysis: lastDoc?.analysisCompletedAt || null,
      hasAnalysing: p.documents.some((d) => d.analysisStatus === "analysing"),
      nonCompliantCount: breakdown.non_compliant,
    };
  });

  // Sort by compliance score ascending (worst first)
  const sortedProducts = [...productRows].sort((a, b) => a.complianceScore - b.complianceScore);

  // Build attention queue items
  const attentionItems: {
    productId: string;
    productName: string;
    reason: string;
    severity: "critical" | "warning" | "info";
  }[] = [];

  for (const p of productRows) {
    if (p.nonCompliantCount > 0) {
      attentionItems.push({
        productId: p.id,
        productName: p.name,
        reason: `${p.nonCompliantCount} non-compliant obligation${p.nonCompliantCount !== 1 ? "s" : ""}`,
        severity: "critical",
      });
    }
  }
  for (const p of productRows) {
    if (p.hasAnalysing) {
      attentionItems.push({
        productId: p.id,
        productName: p.name,
        reason: "Document analysis in progress",
        severity: "warning",
      });
    }
  }
  for (const p of productRows) {
    if (p.totalObligations > 0 && p.statusBreakdown.not_assessed === p.totalObligations) {
      attentionItems.push({
        productId: p.id,
        productName: p.name,
        reason: "All obligations unassessed",
        severity: "info",
      });
    } else if (p.totalObligations === 0) {
      attentionItems.push({
        productId: p.id,
        productName: p.name,
        reason: "No compliance matrix generated",
        severity: "info",
      });
    }
  }

  // Process recent analyses
  const analyses = data.recentAnalyses.map((doc) => {
    const result = doc.analysisResult as { findings?: { status: string }[] } | null;
    const findings = result?.findings || [];
    const summary = {
      addressed: findings.filter((f) => f.status === "addressed").length,
      partial: findings.filter((f) => f.status === "partially_addressed").length,
      gaps: findings.filter((f) => f.status === "not_addressed").length,
      na: findings.filter((f) => f.status === "not_applicable").length,
      total: findings.length,
    };
    return {
      documentId: doc.id,
      documentType: doc.documentType,
      productId: doc.product.id,
      productName: doc.product.name,
      completedAt: doc.analysisCompletedAt!,
      summary,
    };
  });

  // Process top gaps
  const gapCountMap = new Map(
    data.gapObligations.map((g) => [g.obligationId, g._count.obligationId])
  );
  const topGaps = data.topGapObligations
    .map((ob) => ({
      obligationId: ob.id,
      summary: ob.summary,
      regulation: ob.rule.section.regulation.title,
      citation: ob.rule.reference,
      nonCompliantCount: gapCountMap.get(ob.id) || 0,
    }))
    .sort((a, b) => b.nonCompliantCount - a.nonCompliantCount);

  // Aggregate common red flags from document evidence
  const flagCounts = new Map<string, number>();
  for (const entry of data.entriesWithEvidence) {
    const evidence = entry.documentEvidence as DocumentEvidence[] | null;
    if (!evidence) continue;
    for (const de of evidence) {
      if (de.gaps) {
        for (const gap of de.gaps) {
          const normalized = gap.trim();
          if (normalized) {
            flagCounts.set(normalized, (flagCounts.get(normalized) || 0) + 1);
          }
        }
      }
    }
  }
  const commonFlags = [...flagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text, count]) => ({ text, count }));

  // Build heatmap data: products × regulations
  const regMap = new Map<string, { id: string; title: string; citation: string }>();
  const cells: Record<string, Record<string, { compliant: number; non_compliant: number; in_progress: number; not_assessed: number; not_applicable: number; total: number }>> = {};

  for (const entry of data.heatmapEntries) {
    const reg = entry.obligation.rule.section.regulation;
    regMap.set(reg.id, reg);

    if (!cells[entry.productId]) cells[entry.productId] = {};
    if (!cells[entry.productId][reg.id]) {
      cells[entry.productId][reg.id] = { compliant: 0, non_compliant: 0, in_progress: 0, not_assessed: 0, not_applicable: 0, total: 0 };
    }
    const bucket = cells[entry.productId][reg.id];
    // Internal governance obligations: don't count non_compliant from doc analysis as actual non_compliant
    const isInternalFalsePositive =
      entry.obligation.evidenceScope === "internal_governance" &&
      entry.complianceStatus === "non_compliant" &&
      entry.evidenceSource === "document_analysis";
    const effectiveStatus = isInternalFalsePositive ? "not_assessed" : entry.complianceStatus;
    const statusKey = effectiveStatus as keyof typeof bucket;
    if (statusKey in bucket && statusKey !== "total") bucket[statusKey]++;
    bucket.total++;
  }

  const heatmapData = {
    products: data.products.map((p) => ({ id: p.id, name: p.name })),
    regulations: [...regMap.values()].sort((a, b) => a.title.localeCompare(b.title)),
    cells,
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <h1
        className="text-2xl font-semibold tracking-tight mb-6"
        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
      >
        Dashboard
      </h1>

      {/* Compliance Heatmap */}
      <ComplianceHeatmap data={heatmapData} />

      {/* Sections B + C: Product Grid + Attention Queue */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 mb-6">
        <ProductComplianceGrid products={sortedProducts} />
        <AttentionQueue items={attentionItems} />
      </div>

      {/* Sections D + E: Recent Activity + Risk Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentActivityFeed analyses={analyses} />
        <RiskSummary topGaps={topGaps} commonFlags={commonFlags} />
      </div>
    </div>
  );
}
