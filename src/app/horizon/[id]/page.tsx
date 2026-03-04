import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
  HORIZON_ITEM_TYPES,
  HORIZON_STATUSES,
  HORIZON_PRIORITIES,
  HORIZON_JURISDICTIONS,
  HORIZON_TOPIC_AREAS,
  HORIZON_CLIENT_SECTORS,
  CROSS_REFERENCE_TYPES,
} from "@/lib/utils";
import { HorizonLinkManager } from "@/components/horizon-link-manager";
import { HorizonDetailActions } from "@/components/horizon-detail-actions";

export const dynamic = "force-dynamic";

async function getHorizonItem(id: string) {
  const [item, allRegulations] = await Promise.all([
    prisma.horizonItem.findUnique({
      where: { id },
      include: {
        regulator: { select: { id: true, name: true, abbreviation: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        parent: {
          select: { id: true, title: true, handbookNoticeNumber: true },
        },
        children: {
          select: {
            id: true,
            title: true,
            summary: true,
            effectiveDate: true,
            status: true,
            referenceNumber: true,
            aiClassification: true,
          },
          orderBy: { effectiveDate: "asc" },
        },
        regulationLinks: {
          include: {
            regulation: { select: { id: true, title: true, citation: true } },
          },
          orderBy: { confidence: "desc" },
        },
        obligationLinks: {
          include: {
            obligation: {
              select: {
                id: true,
                summary: true,
                obligationType: true,
                rule: {
                  select: {
                    reference: true,
                    section: {
                      select: {
                        number: true,
                        title: true,
                        regulation: { select: { id: true, title: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { confidence: "desc" },
        },
        crossRefsFrom: {
          include: {
            toItem: { select: { id: true, title: true, referenceNumber: true, itemType: true } },
          },
        },
        crossRefsTo: {
          include: {
            fromItem: { select: { id: true, title: true, referenceNumber: true, itemType: true } },
          },
        },
      },
    }),
    prisma.regulation.findMany({
      select: { id: true, title: true, citation: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return { item, allRegulations };
}

export default async function HorizonItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { item, allRegulations } = await getHorizonItem(id);

  if (!item) notFound();

  const typeInfo = HORIZON_ITEM_TYPES[item.itemType as keyof typeof HORIZON_ITEM_TYPES];
  const statusInfo = HORIZON_STATUSES[item.status as keyof typeof HORIZON_STATUSES];
  const priorityInfo = HORIZON_PRIORITIES[item.priority as keyof typeof HORIZON_PRIORITIES];

  // Combine cross-references into a single list
  const crossRefs = [
    ...item.crossRefsFrom.map((cr) => ({
      id: cr.id,
      relationship: cr.relationship,
      direction: "outgoing" as const,
      item: cr.toItem,
    })),
    ...item.crossRefsTo.map((cr) => ({
      id: cr.id,
      relationship: cr.relationship,
      direction: "incoming" as const,
      item: cr.fromItem,
    })),
  ];

  return (
    <div className="prose-column">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-xs">
        <a href="/horizon" className="text-[var(--accent)] hover:underline">
          &larr; Horizon Scanning
        </a>
        {item.parent && (
          <>
            <span className="text-[var(--muted-foreground)]">/</span>
            <Link
              href={`/horizon/${item.parent.id}`}
              className="text-[var(--accent)] hover:underline"
            >
              Handbook Notice No. {item.parent.handbookNoticeNumber}
            </Link>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {typeInfo && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
            )}
            {statusInfo && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            )}
            {priorityInfo && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityInfo.color}`}>
                {priorityInfo.label}
              </span>
            )}
            {item.aiClassified && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--accent-light)] text-[var(--accent)]">
                AI Classified
              </span>
            )}
            {item.requiresFirmResponse && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]">
                Response Required
              </span>
            )}
            {item.agBriefingPublished && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]">
                AG Briefing Published
              </span>
            )}
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            {item.title}
          </h1>
        </div>
        <HorizonDetailActions itemId={item.id} currentStatus={item.status} aiClassified={item.aiClassified} />
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 border border-[var(--border)] rounded-lg p-4">
        {item.referenceNumber && (
          <div>
            <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Reference</p>
            <p className="text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
              {item.referenceNumber}
            </p>
          </div>
        )}
        {item.regulator && (
          <div>
            <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Regulator</p>
            <p className="text-sm font-medium">{item.regulator.abbreviation} — {item.regulator.name}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Source</p>
          <p className="text-sm">{item.sourceType}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Published</p>
          <p className="text-sm">{formatDate(item.publishedDate)}</p>
        </div>
        {item.responseDeadline && (
          <div>
            <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Response Deadline</p>
            <p className="text-sm font-medium">{formatDate(item.responseDeadline)}</p>
          </div>
        )}
        {item.effectiveDate && (
          <div>
            <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Effective Date</p>
            <p className="text-sm">{formatDate(item.effectiveDate)}</p>
          </div>
        )}
        {item.sourceUrl && (
          <div className="col-span-2">
            <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Source URL</p>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent)] hover:underline break-all"
            >
              {item.sourceUrl}
            </a>
          </div>
        )}
      </div>

      {/* Taxonomy pills */}
      {(item.jurisdictions?.length > 0 || item.topicAreas?.length > 0 || item.clientSectorRelevance?.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {item.jurisdictions?.length > 0 && (
            <div>
              <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Jurisdiction</p>
              <div className="flex gap-1.5">
                {item.jurisdictions.map((j) => {
                  const jInfo = HORIZON_JURISDICTIONS[j as keyof typeof HORIZON_JURISDICTIONS];
                  return (
                    <span key={j} className="px-2 py-0.5 rounded text-xs bg-[var(--muted)] font-medium">
                      {jInfo?.label || j}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {item.topicAreas?.length > 0 && (
            <div>
              <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Topics</p>
              <div className="flex gap-1.5 flex-wrap">
                {item.topicAreas.map((t) => {
                  const tInfo = HORIZON_TOPIC_AREAS[t as keyof typeof HORIZON_TOPIC_AREAS];
                  return (
                    <span key={t} className="px-2 py-0.5 rounded text-xs bg-[var(--accent-light)] text-[var(--accent)]">
                      {tInfo?.label || t}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {item.clientSectorRelevance?.length > 0 && (
            <div>
              <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Sectors</p>
              <div className="flex gap-1.5 flex-wrap">
                {item.clientSectorRelevance.map((s) => {
                  const sInfo = HORIZON_CLIENT_SECTORS[s as keyof typeof HORIZON_CLIENT_SECTORS];
                  return (
                    <span key={s} className="px-2 py-0.5 rounded text-xs bg-[var(--muted)]">
                      {sInfo?.label || s}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consultation tracking details */}
      {(item.responseUrl || item.estimatedFinalRuleDate || item.relatedLegislation) && (
        <div className="mb-6 border border-[var(--border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Consultation Tracking
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {item.responseUrl && (
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Response Portal</p>
                <a href={item.responseUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline break-all">
                  {item.responseUrl}
                </a>
              </div>
            )}
            {item.estimatedFinalRuleDate && (
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Estimated Final Rule Date</p>
                <p>{formatDate(item.estimatedFinalRuleDate)}</p>
              </div>
            )}
            {item.relatedLegislation && (
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Related Legislation</p>
                <p>{item.relatedLegislation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6">
        <h2
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Summary
        </h2>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {item.summary}
        </div>
      </div>

      {/* Cross-references */}
      {crossRefs.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Cross-References ({crossRefs.length})
          </h2>
          <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
            {crossRefs.map((cr) => {
              const relInfo = CROSS_REFERENCE_TYPES[cr.relationship as keyof typeof CROSS_REFERENCE_TYPES];
              const crTypeInfo = HORIZON_ITEM_TYPES[cr.item.itemType as keyof typeof HORIZON_ITEM_TYPES];
              return (
                <Link
                  key={cr.id}
                  href={`/horizon/${cr.item.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--muted)] transition-colors"
                >
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)] text-[var(--muted-foreground)] shrink-0">
                    {cr.direction === "outgoing" ? relInfo?.label || cr.relationship : `← ${relInfo?.label || cr.relationship}`}
                  </span>
                  {crTypeInfo && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${crTypeInfo.color}`}>
                      {crTypeInfo.label}
                    </span>
                  )}
                  {cr.item.referenceNumber && (
                    <span className="text-[11px] text-[var(--muted-foreground)] shrink-0" style={{ fontFamily: "var(--font-mono)" }}>
                      {cr.item.referenceNumber}
                    </span>
                  )}
                  <span className="text-sm truncate">{cr.item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Classification details */}
      {item.aiClassification && (() => {
        const ai = item.aiClassification as {
          summary?: string;
          relevanceScore?: number;
          suggestedPriority?: string;
          affectedRegulations?: { regulationId: string; confidence: number; reasoning: string }[];
          affectedObligations?: { reference: string; obligationId?: string; impactType: string; confidence: number; reasoning: string }[];
          crossReferences?: { referenceNumber: string; relationship: string }[];
          estimatedFinalRuleDate?: string;
          relatedLegislation?: string;
        };

        const confidenceColor = (c: number) =>
          c >= 0.8 ? "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]"
          : c >= 0.5 ? "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]"
          : "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]";

        const impactColors: Record<string, string> = {
          amendment: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]",
          new_requirement: "bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)]",
          repeal: "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]",
          clarification: "bg-[var(--status-not-assessed-bg)] text-[var(--status-not-assessed-text)]",
          unknown: "bg-[var(--status-na-bg)] text-[var(--status-na-text)]",
        };

        const impactLabels: Record<string, string> = {
          amendment: "Amendment",
          new_requirement: "New Requirement",
          repeal: "Repeal",
          clarification: "Clarification",
          unknown: "Unknown",
        };

        const relationshipLabels: Record<string, string> = {
          supersedes: "Supersedes",
          implements: "Implements",
          responds_to: "Responds to",
          amends: "Amends",
          references: "References",
          related: "Related",
        };

        return (
          <div className="mb-6 space-y-4">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              AI Classification
            </h2>

            {/* Summary */}
            {ai.summary && (
              <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--muted)]">
                <p className="text-sm leading-relaxed">{ai.summary}</p>
              </div>
            )}

            {/* Relevance & Priority */}
            {(ai.relevanceScore !== undefined || ai.suggestedPriority) && (
              <div className="flex items-center gap-3">
                {ai.relevanceScore !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)]">Relevance</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      ai.relevanceScore >= 7 ? "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]"
                      : ai.relevanceScore >= 4 ? "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]"
                      : "bg-[var(--status-not-assessed-bg)] text-[var(--status-not-assessed-text)]"
                    }`}>
                      {ai.relevanceScore}/10
                    </span>
                  </div>
                )}
                {ai.suggestedPriority && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)]">Priority</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      HORIZON_PRIORITIES[ai.suggestedPriority as keyof typeof HORIZON_PRIORITIES]?.color || ""
                    }`}>
                      {HORIZON_PRIORITIES[ai.suggestedPriority as keyof typeof HORIZON_PRIORITIES]?.label || ai.suggestedPriority}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Affected Regulations */}
            {ai.affectedRegulations && ai.affectedRegulations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  Affected Regulations ({ai.affectedRegulations.length})
                </h3>
                <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
                  {ai.affectedRegulations.map((reg, i) => {
                    const regInfo = allRegulations.find((r) => r.id === reg.regulationId);
                    const pct = Math.round(reg.confidence * 100);
                    return (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <p className="text-sm font-medium">
                            {regInfo ? regInfo.title : reg.regulationId}
                            {regInfo?.citation && (
                              <span className="ml-1.5 text-xs text-[var(--muted-foreground)]">({regInfo.citation})</span>
                            )}
                          </p>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${confidenceColor(reg.confidence)}`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[var(--border)] mb-1.5">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 80 ? "bg-[var(--status-compliant-text)]"
                              : pct >= 50 ? "bg-[var(--status-in-progress-text)]"
                              : "bg-[var(--status-non-compliant-text)]"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {reg.reasoning && (
                          <details className="text-xs text-[var(--muted-foreground)]">
                            <summary className="cursor-pointer hover:text-[var(--foreground)]">Reasoning</summary>
                            <p className="mt-1 pl-2 border-l-2 border-[var(--border)]">{reg.reasoning}</p>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Affected Obligations */}
            {ai.affectedObligations && ai.affectedObligations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  Affected Obligations ({ai.affectedObligations.length})
                </h3>
                <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
                  {ai.affectedObligations.map((ob, i) => {
                    const pct = Math.round(ob.confidence * 100);
                    return (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                            {ob.reference}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            impactColors[ob.impactType] || impactColors.unknown
                          }`}>
                            {impactLabels[ob.impactType] || ob.impactType}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${confidenceColor(ob.confidence)}`}>
                            {pct}%
                          </span>
                        </div>
                        {ob.reasoning && (
                          <details className="text-xs text-[var(--muted-foreground)]">
                            <summary className="cursor-pointer hover:text-[var(--foreground)]">Reasoning</summary>
                            <p className="mt-1 pl-2 border-l-2 border-[var(--border)]">{ob.reasoning}</p>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Consultation tracking from AI */}
            {(ai.estimatedFinalRuleDate || ai.relatedLegislation) && (
              <div className="border border-[var(--border)] rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  Consultation Tracking (AI)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {ai.estimatedFinalRuleDate && (
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Estimated Final Rule Date</p>
                      <p>{formatDate(ai.estimatedFinalRuleDate)}</p>
                    </div>
                  )}
                  {ai.relatedLegislation && (
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Related Legislation</p>
                      <p>{ai.relatedLegislation}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Cross-References */}
            {ai.crossReferences && ai.crossReferences.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                  AI Cross-References ({ai.crossReferences.length})
                </h3>
                <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
                  {ai.crossReferences.map((cr, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {relationshipLabels[cr.relationship] || cr.relationship}
                      </span>
                      <span className="text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                        {cr.referenceNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Child instruments (for parent handbook notices) */}
      {item.children && item.children.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Instruments ({item.children.length})
          </h2>
          <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
            {item.children.map((child) => {
              const childStatus = HORIZON_STATUSES[child.status as keyof typeof HORIZON_STATUSES];
              const ai = child.aiClassification as {
                effectiveDates?: string[];
                handbookAreasAffected?: string[];
              } | null;

              return (
                <Link
                  key={child.id}
                  href={`/horizon/${child.id}`}
                  className="block px-4 py-3 hover:bg-[var(--muted)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{child.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{child.summary}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted-foreground)] flex-wrap">
                        {ai?.effectiveDates && ai.effectiveDates.length > 0 && (
                          <span>Effective: {ai.effectiveDates.map((d) => formatDate(d)).join(", ")}</span>
                        )}
                        {ai?.handbookAreasAffected && ai.handbookAreasAffected.length > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded bg-[var(--citation-bg)]"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {ai.handbookAreasAffected.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    {childStatus && (
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${childStatus.color}`}>
                        {childStatus.label}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="border-t border-[var(--border)] pt-6">
        <HorizonLinkManager
          horizonItemId={item.id}
          regulationLinks={item.regulationLinks}
          obligationLinks={item.obligationLinks}
          allRegulations={allRegulations}
        />
      </div>
    </div>
  );
}
