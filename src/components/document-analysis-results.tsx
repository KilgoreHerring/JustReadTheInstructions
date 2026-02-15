"use client";

import { useState } from "react";
import { EVIDENCE_STATUSES } from "@/lib/utils";
import { ChevronDown, ChevronRight, Check, X } from "lucide-react";

interface ObligationFinding {
  obligationId: string;
  status: string;
  evidence: string;
  clauseReference?: string;
  qualityScore?: number;
  gaps: string[];
  recommendation: string;
}

interface RequiredElement {
  element: string;
  present: boolean;
  quality: string;
  notes: string;
}

interface AnalysisResult {
  documentType: string;
  overallAssessment: string;
  obligationFindings: ObligationFinding[];
  missingClauses?: string[];
  qualityConcerns?: string[];
  requiredElements?: RequiredElement[];
}

const QUALITY_COLORS: Record<string, string> = {
  good: "text-[var(--status-compliant-text)]",
  adequate: "text-[var(--status-in-progress-text)]",
  insufficient: "text-[var(--status-non-compliant-text)]",
  missing: "text-[var(--status-non-compliant-text)] font-semibold",
};

export function DocumentAnalysisResults({
  result,
}: {
  result: AnalysisResult;
}) {
  const [expanded, setExpanded] = useState(false);

  const addressed = result.obligationFindings.filter(
    (f) => f.status === "addressed"
  ).length;
  const total = result.obligationFindings.length;

  return (
    <div className="mt-3 border border-[var(--border)] rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 bg-[var(--muted)] text-left text-sm flex items-center justify-between hover:bg-[var(--border)] transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Analysis: {addressed}/{total} obligations addressed
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          {expanded ? "Hide" : "Show"} details
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4 text-sm">
          <div>
            <p className="font-medium mb-1">Overall Assessment</p>
            <p className="text-[var(--muted-foreground)]">
              {result.overallAssessment}
            </p>
          </div>

          {result.requiredElements && result.requiredElements.length > 0 && (
            <div>
              <p className="font-medium mb-2">Required Elements</p>
              <div className="space-y-1.5">
                {result.requiredElements.map((el, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">
                      {el.present ? (
                        <Check size={12} className="text-[var(--status-compliant-text)]" />
                      ) : (
                        <X size={12} className="text-[var(--status-non-compliant-text)]" />
                      )}
                    </span>
                    <div>
                      <span className={`text-xs font-medium ${QUALITY_COLORS[el.quality] || ""}`}>
                        {el.element} — {el.quality}
                      </span>
                      {el.notes && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {el.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.missingClauses && result.missingClauses.length > 0 && (
            <div>
              <p className="font-medium mb-1 text-[var(--status-non-compliant-text)]">
                Missing Clauses ({result.missingClauses.length})
              </p>
              <ul className="list-disc list-inside text-xs text-[var(--muted-foreground)]">
                {result.missingClauses.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {result.qualityConcerns && result.qualityConcerns.length > 0 && (
            <div>
              <p className="font-medium mb-1 text-[var(--status-in-progress-text)]">
                Quality Concerns
              </p>
              <ul className="list-disc list-inside text-xs text-[var(--muted-foreground)]">
                {result.qualityConcerns.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="font-medium mb-2">
              Obligation Findings ({result.obligationFindings.length})
            </p>
            <div className="space-y-2">
              {result.obligationFindings.map((f) => {
                const evStatus = EVIDENCE_STATUSES[f.status as keyof typeof EVIDENCE_STATUSES];
                return (
                  <div
                    key={f.obligationId}
                    className="border border-[var(--border)] rounded p-2.5"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${evStatus?.color || ""}`}
                      >
                        {evStatus?.label || f.status.replace("_", " ")}
                      </span>
                      {f.clauseReference && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          Clause: {f.clauseReference}
                        </span>
                      )}
                      {f.qualityScore != null && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          Quality: {Math.round(f.qualityScore * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs">{f.evidence}</p>
                    {f.gaps.length > 0 && (
                      <p className="text-xs text-[var(--status-non-compliant-text)] mt-1">
                        Gaps: {f.gaps.join("; ")}
                      </p>
                    )}
                    {f.recommendation && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 italic">
                        {f.recommendation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
