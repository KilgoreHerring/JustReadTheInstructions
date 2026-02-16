"use client";

import { useState, useEffect, useCallback } from "react";
import {
  COMPLIANCE_STATUSES,
  OBLIGATION_TYPES,
  DOCUMENT_TYPES,
  EVIDENCE_STATUSES,
  EVIDENCE_SCOPES,
  getComplianceLabel,
} from "@/lib/utils";
import { useContextPanel } from "./context-panel-provider";
import { AlertTriangle, AlertCircle, CheckCircle2, Sparkles, HelpCircle, ChevronDown, ChevronRight, Building2 } from "lucide-react";

interface MatrixEntry {
  id: string;
  complianceStatus: string;
  owner: string | null;
  notes: string | null;
  evidenceSource: string | null;
  documentEvidence: {
    documentType: string;
    status: string;
    evidence: string;
    clauseReference?: string;
    qualityScore?: number;
    gaps: string[];
    recommendation: string;
  }[] | null;
  obligation: {
    id: string;
    obligationType: string;
    evidenceScope: string;
    summary: string;
    addressee: string;
    actionText: string;
    rule: {
      reference: string;
      section: {
        number: string;
        title: string;
        regulation: {
          title: string;
        };
      };
    };
    clauseTemplates: {
      id: string;
      title: string;
      templateText: string;
      guidance: string | null;
    }[];
  };
}

interface Props {
  productId: string;
  productName: string;
  entries: MatrixEntry[];
}

type ViewMode = "regulation" | "theme" | "triage";

const THEME_KEYWORDS: Record<string, string[]> = {
  Communications: ["communication", "promotion", "disclosure", "inform", "notify", "notice", "statement", "information", "clear, fair"],
  "Product Design": ["design", "product", "target market", "value", "fair value", "assessment"],
  Distribution: ["distribution", "channel", "sale", "selling", "intermediar"],
  "Value & Price": ["price", "cost", "charge", "fee", "interest", "rate", "apr", "repay"],
  "Customer Support": ["complaint", "arrears", "default", "difficulty", "forbearance", "vulnerable", "support", "cancel"],
  "Authorisation & Security": ["authoris", "security", "authentic", "sca", "credential", "consent"],
};

function getTheme(entry: MatrixEntry): string {
  if (entry.obligation.obligationType === "principle") return "General Principles";
  const text = `${entry.obligation.summary} ${entry.obligation.actionText}`.toLowerCase();
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return theme;
  }
  return "Other";
}

// Triage groups: ordered by urgency based on document evidence analysis
const TRIAGE_GROUPS = {
  gaps: { label: "Gaps — No Matching Clause", icon: AlertTriangle, color: "text-[var(--status-non-compliant-text)]" },
  weak: { label: "Weak — Needs Redrafting", icon: AlertCircle, color: "text-[var(--status-in-progress-text)]" },
  covered: { label: "Covered — Clause Found", icon: CheckCircle2, color: "text-[var(--status-compliant-text)]" },
  internal: { label: "Internal Governance — Policy Review Needed", icon: Building2, color: "text-[var(--scope-internal-text)]" },
  principles: { label: "Principles — Holistic Assessment", icon: Sparkles, color: "text-[var(--type-principle-text)]" },
  unanalysed: { label: "Unanalysed — Awaiting Document Review", icon: HelpCircle, color: "text-[var(--muted-foreground)]" },
} as const;

type TriageGroup = keyof typeof TRIAGE_GROUPS;

function getTriageGroup(entry: MatrixEntry): TriageGroup {
  if (entry.obligation.obligationType === "principle") return "principles";
  // Internal governance obligations go to their own group
  if (entry.obligation.evidenceScope === "internal_governance") return "internal";
  if (!entry.documentEvidence || entry.documentEvidence.length === 0) return "unanalysed";

  // Use the worst evidence status across all documents
  const statuses = entry.documentEvidence.map((de) => de.status);
  if (statuses.some((s) => s === "not_addressed")) return "gaps";
  if (statuses.some((s) => s === "partially_addressed")) return "weak";
  return "covered";
}

// Get the primary (worst) evidence finding for inline display
function getPrimaryFinding(entry: MatrixEntry) {
  if (!entry.documentEvidence || entry.documentEvidence.length === 0) return null;
  const priority = ["not_addressed", "partially_addressed", "addressed", "not_applicable"];
  const sorted = [...entry.documentEvidence].sort(
    (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status)
  );
  return sorted[0];
}

export function ComplianceMatrix({ productId, productName, entries: initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("regulation");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [generatingClauses, setGeneratingClauses] = useState(false);
  const [clauses, setClauses] = useState<
    Record<string, { title: string; clauseText: string; guidance: string }>
  >({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { open } = useContextPanel();

  // Scroll to anchor on load
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash.startsWith("ob-")) {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(hash);
        setTimeout(() => setHighlightId(null), 2000);
      }
    }
  }, []);

  // URL view mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "theme" || v === "triage") setViewMode(v);
  }, []);

  const filtered = entries.filter((e) => {
    const matchesSearch =
      !filter ||
      e.obligation.summary.toLowerCase().includes(filter.toLowerCase()) ||
      e.obligation.rule.reference.toLowerCase().includes(filter.toLowerCase()) ||
      e.obligation.rule.section.regulation.title
        .toLowerCase()
        .includes(filter.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || e.complianceStatus === statusFilter;
    const matchesEvidence =
      evidenceFilter === "all" ||
      (evidenceFilter === "has_evidence" && e.documentEvidence && e.documentEvidence.length > 0) ||
      (evidenceFilter === "no_evidence" && (!e.documentEvidence || e.documentEvidence.length === 0));
    return matchesSearch && matchesStatus && matchesEvidence;
  });

  const grouped = groupEntries(filtered, viewMode);

  async function handleStatusChange(entryId: string, newStatus: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, complianceStatus: newStatus } : e))
    );
    await fetch(`/api/products/${productId}/matrix`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, complianceStatus: newStatus }),
    });
  }

  async function generateClauses() {
    setGeneratingClauses(true);
    try {
      const res = await fetch(`/api/products/${productId}/clauses`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const clauseMap: typeof clauses = {};
        for (const c of data) {
          clauseMap[c.obligationId] = c;
        }
        setClauses(clauseMap);
      }
    } finally {
      setGeneratingClauses(false);
    }
  }

  const openObligationPanel = useCallback(
    (entry: MatrixEntry) => {
      const ob = entry.obligation;
      const isPrinciple = ob.obligationType === "principle";
      const generatedClause = clauses[ob.id];
      const templateClause = ob.clauseTemplates[0];
      const clause = !isPrinciple
        ? generatedClause
          ? { title: generatedClause.title, text: generatedClause.clauseText, guidance: generatedClause.guidance }
          : templateClause
            ? { title: templateClause.title, text: templateClause.templateText, guidance: templateClause.guidance }
            : null
        : null;

      open(
        ob.rule.reference,
        <div className="space-y-4">
          {/* Principle banner */}
          {isPrinciple && (
            <div className="rounded-md p-2.5 bg-[var(--type-principle-bg)] text-[var(--type-principle-text)]">
              <p className="text-xs font-semibold mb-0.5">General Principle</p>
              <p className="text-[11px] leading-relaxed">
                This is a general principle assessed through the overall quality of documents, policies and processes — not through a specific clause.
              </p>
            </div>
          )}

          {/* Evidence scope banners */}
          {ob.evidenceScope === "internal_governance" && (
            <div className="rounded-md p-2.5 bg-[var(--scope-internal-bg)] text-[var(--scope-internal-text)]">
              <p className="text-xs font-semibold mb-0.5">Internal Governance Requirement</p>
              <p className="text-[11px] leading-relaxed">
                This obligation is evidenced through internal policies and processes, not customer-facing terms. It will not appear as a gap in T&C analysis.
              </p>
            </div>
          )}
          {ob.evidenceScope === "guidance" && (
            <div className="rounded-md p-2.5 bg-[var(--scope-guidance-bg)] text-[var(--scope-guidance-text)]">
              <p className="text-xs font-semibold mb-0.5">Guidance &amp; Best Practice</p>
              <p className="text-[11px] leading-relaxed">
                This is guidance and best practice. Absence from T&Cs is not a hard compliance failure — assess holistically against the spirit of the regulation.
              </p>
            </div>
          )}

          {/* Source text */}
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Required Action</p>
            <p className="text-sm">{ob.actionText}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Section</p>
            <p className="text-sm">
              {ob.rule.section.number} — {ob.rule.section.title}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {ob.rule.section.regulation.title}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Addressee</p>
            <p className="text-sm">{ob.addressee}</p>
          </div>

          {/* Clause template */}
          {clause && (
            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-xs font-semibold mb-1">Recommended Clause: {clause.title}</p>
              <p className="text-xs whitespace-pre-wrap" style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
                {clause.text}
              </p>
              {clause.guidance && (
                <p className="text-xs text-[var(--muted-foreground)] mt-2 italic">
                  {clause.guidance}
                </p>
              )}
            </div>
          )}

          {/* Document evidence */}
          {entry.documentEvidence && entry.documentEvidence.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3 space-y-2">
              <p className="text-xs font-semibold">Document Evidence</p>
              {entry.documentEvidence.map((de, i) => {
                const docType = DOCUMENT_TYPES[de.documentType as keyof typeof DOCUMENT_TYPES];
                const evStatus = EVIDENCE_STATUSES[de.status as keyof typeof EVIDENCE_STATUSES];
                return (
                  <div key={i} className="bg-[var(--muted)] rounded-md p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${docType?.color || ""}`}>
                        {docType?.label || de.documentType}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${evStatus?.color || ""}`}>
                        {evStatus?.label || de.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs">{de.evidence}</p>
                    {de.gaps.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[10px] font-medium text-[var(--status-non-compliant-text)]">Gaps:</p>
                        <ul className="text-[10px] text-[var(--status-non-compliant-text)] list-disc list-inside">
                          {de.gaps.map((gap, gi) => <li key={gi}>{gap}</li>)}
                        </ul>
                      </div>
                    )}
                    {de.recommendation && (
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1 italic">{de.recommendation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    },
    [clauses, open]
  );

  return (
    <div>
      {/* View switcher */}
      <div className="flex items-center gap-1 mb-4 p-0.5 bg-[var(--muted)] rounded-lg w-fit">
        {([
          ["regulation", "Regulation"],
          ["theme", "Theme"],
          ["triage", "Triage"],
        ] as [ViewMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === mode
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          suppressHydrationWarning
          type="text"
          placeholder="Search obligations..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)] flex-1"
        />
        <select
          suppressHydrationWarning
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)]"
        >
          <option value="all">All statuses</option>
          {Object.entries(COMPLIANCE_STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          suppressHydrationWarning
          value={evidenceFilter}
          onChange={(e) => setEvidenceFilter(e.target.value)}
          className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)]"
        >
          <option value="all">All evidence</option>
          <option value="has_evidence">Has document evidence</option>
          <option value="no_evidence">Needs document evidence</option>
        </select>
        <button
          onClick={generateClauses}
          disabled={generatingClauses}
          className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
        >
          {generatingClauses ? "Generating..." : "Generate T&C Clauses"}
        </button>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] mb-4">
        {filtered.length} obligations shown ({entries.length} total)
      </p>

      {/* Triage summary bar */}
      {viewMode === "triage" && (() => {
        const counts: Record<TriageGroup, number> = { gaps: 0, weak: 0, covered: 0, internal: 0, principles: 0, unanalysed: 0 };
        for (const e of filtered) counts[getTriageGroup(e)]++;
        return (
          <div className="flex items-center gap-4 mb-4 px-4 py-3 rounded-lg bg-[var(--muted)] border border-[var(--border)]">
            {(Object.entries(TRIAGE_GROUPS) as [TriageGroup, typeof TRIAGE_GROUPS[TriageGroup]][]).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <Icon size={13} className={meta.color} />
                  <span className={`text-sm font-semibold ${meta.color}`}>{counts[key]}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{key}</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Grouped rows */}
      {Object.entries(grouped).map(([group, groupEntries]) => {
        const triageKey = viewMode === "triage" ? (group as TriageGroup) : null;
        const triageMeta = triageKey ? TRIAGE_GROUPS[triageKey] : null;
        const TriageIcon = triageMeta?.icon;
        const isCollapsed = collapsed.has(group);

        return (
          <div key={group} className="mb-6">
            <button
              onClick={() => setCollapsed((prev) => {
                const next = new Set(prev);
                if (next.has(group)) next.delete(group);
                else next.add(group);
                return next;
              })}
              className="w-full text-left text-sm font-semibold px-4 py-2 border-b border-[var(--border)] text-[var(--foreground)] flex items-center gap-2 hover:bg-[var(--muted)] transition-colors"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {isCollapsed ? <ChevronRight size={14} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={14} className="text-[var(--muted-foreground)]" />}
              {TriageIcon && <TriageIcon size={14} className={triageMeta!.color} />}
              {triageMeta ? triageMeta.label : group} ({groupEntries.length})
            </button>
            {!isCollapsed && (
              <div className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
                {groupEntries.map((entry) => (
                  <ObligationRow
                    key={entry.id}
                    entry={entry}
                    clauses={clauses}
                    highlightId={highlightId}
                    onStatusChange={handleStatusChange}
                    onOpenPanel={openObligationPanel}
                    showEvidence={viewMode === "triage"}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ObligationRow({
  entry,
  clauses,
  highlightId,
  onStatusChange,
  onOpenPanel,
  showEvidence = false,
}: {
  entry: MatrixEntry;
  clauses: Record<string, { title: string; clauseText: string; guidance: string }>;
  highlightId: string | null;
  onStatusChange: (id: string, status: string) => void;
  onOpenPanel: (entry: MatrixEntry) => void;
  showEvidence?: boolean;
}) {
  const ob = entry.obligation;
  const isPrinciple = ob.obligationType === "principle";
  const obType = OBLIGATION_TYPES[ob.obligationType as keyof typeof OBLIGATION_TYPES];
  const status = COMPLIANCE_STATUSES[entry.complianceStatus as keyof typeof COMPLIANCE_STATUSES];
  const hasDocEvidence = entry.documentEvidence && entry.documentEvidence.length > 0;
  const anchorId = `ob-${ob.id}`;
  const isHighlighted = highlightId === anchorId;
  const primaryFinding = showEvidence ? getPrimaryFinding(entry) : null;

  // Product type tags from addressee — show max 3 then "+N"
  const tags = ob.addressee.split(",").map((t) => t.trim()).filter(Boolean);
  const visibleTags = tags.slice(0, 3);
  const hiddenCount = tags.length - 3;

  return (
    <div
      id={anchorId}
      className={`group relative px-4 py-3 cursor-pointer hover:bg-[var(--muted)] transition-colors border-l-2 ${
        isHighlighted ? "ring-2 ring-[var(--accent)] ring-inset" : ""
      }`}
      style={{ borderLeftColor: `var(--type-${ob.obligationType}-text)` }}
      onClick={() => onOpenPanel(entry)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Citation pill + obligation type + doc evidence badge */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--citation-bg)] text-[var(--muted-foreground)]"
              style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(ob.rule.reference);
              }}
              title="Click to copy reference"
            >
              {ob.rule.reference}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${obType?.color || ""}`}
            >
              {obType?.label || ob.obligationType}
            </span>
            {ob.evidenceScope !== "term_required" && (() => {
              const scope = EVIDENCE_SCOPES[ob.evidenceScope as keyof typeof EVIDENCE_SCOPES];
              return scope ? (
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${scope.color}`}>
                  {scope.label}
                </span>
              ) : null;
            })()}
            {hasDocEvidence && !showEvidence && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]">
                {entry.documentEvidence!.length} doc{entry.documentEvidence!.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Summary text */}
          <p className="text-sm leading-snug">{ob.summary}</p>

          {/* Inline evidence detail (triage mode) */}
          {primaryFinding && (
            <div className="mt-2 rounded-md bg-[var(--muted)] px-3 py-2 text-xs space-y-1">
              {primaryFinding.clauseReference && (
                <p className="text-[var(--muted-foreground)]">
                  <span className="font-medium">Clause:</span> {primaryFinding.clauseReference}
                </p>
              )}
              <p className="leading-relaxed">{primaryFinding.evidence}</p>
              {primaryFinding.gaps.length > 0 && (
                <ul className="text-[var(--status-non-compliant-text)] list-disc list-inside">
                  {primaryFinding.gaps.map((gap, gi) => <li key={gi}>{gap}</li>)}
                </ul>
              )}
              {primaryFinding.recommendation && (
                <p className="text-[var(--muted-foreground)] italic">{primaryFinding.recommendation}</p>
              )}
            </div>
          )}

          {/* Metadata line */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-[var(--muted-foreground)]">
              {ob.rule.section.number}
            </span>
            {visibleTags.length > 0 && (
              <>
                {visibleTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)]"
                  >
                    {tag}
                  </span>
                ))}
                {hiddenCount > 0 && (
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    +{hiddenCount} others
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status dropdown */}
        <div className="flex items-center gap-2 shrink-0 w-[130px] justify-end">
          <select
            suppressHydrationWarning
            value={entry.complianceStatus}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(entry.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`text-xs rounded-full px-2.5 py-1 border-0 font-medium cursor-pointer w-full ${status?.color || ""}`}
          >
            {Object.entries(COMPLIANCE_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {isPrinciple ? getComplianceLabel(k, "principle") : v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

    </div>
  );
}

function groupEntries(
  entries: MatrixEntry[],
  viewMode: ViewMode
): Record<string, MatrixEntry[]> {
  if (viewMode === "regulation") {
    return entries.reduce(
      (acc, entry) => {
        const reg = entry.obligation.rule.section.regulation.title;
        if (!acc[reg]) acc[reg] = [];
        acc[reg].push(entry);
        return acc;
      },
      {} as Record<string, MatrixEntry[]>
    );
  }

  if (viewMode === "theme") {
    const result: Record<string, MatrixEntry[]> = {};
    for (const entry of entries) {
      const theme = getTheme(entry);
      if (!result[theme]) result[theme] = [];
      result[theme].push(entry);
    }
    // Sort themes: "General Principles" first, "Other" last, rest alphabetical
    const sorted: Record<string, MatrixEntry[]> = {};
    const keys = Object.keys(result).sort((a, b) => {
      if (a === "General Principles") return -1;
      if (b === "General Principles") return 1;
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.localeCompare(b);
    });
    for (const k of keys) sorted[k] = result[k];
    return sorted;
  }

  // triage view: group by document evidence analysis status
  const triageOrder: TriageGroup[] = ["gaps", "weak", "covered", "internal", "principles", "unanalysed"];
  const result: Record<string, MatrixEntry[]> = {};
  for (const group of triageOrder) {
    const matching = entries.filter((e) => getTriageGroup(e) === group);
    if (matching.length > 0) result[group] = matching;
  }
  return result;
}
