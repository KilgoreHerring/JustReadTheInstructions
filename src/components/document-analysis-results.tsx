"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileWarning,
  ArrowRight,
} from "lucide-react";

interface ObligationFinding {
  obligationId: string;
  status: string;
  evidence: string;
  clauseReference?: string;
  qualityScore?: number;
  gaps: string[];
  recommendation: string;
}

interface AnalysisResult {
  documentType: string;
  overallAssessment: string;
  obligationFindings: ObligationFinding[];
  missingClauses?: string[];
  qualityConcerns?: string[];
}

interface Props {
  result: AnalysisResult;
  matrixUrl?: string;
}

function parseRegulationSections(text: string): { title: string; body: string }[] {
  // overallAssessment is formatted as "[Regulation Name] assessment text\n\n[Next Regulation]..."
  const parts = text.split(/\n\n(?=\[)/);
  return parts
    .map((part) => {
      const match = part.match(/^\[([^\]]+)\]\s*([\s\S]*)/);
      if (match) return { title: match[1], body: match[2].trim() };
      return { title: "Summary", body: part.trim() };
    })
    .filter((s) => s.body.length > 0);
}

export function DocumentAnalysisResults({ result, matrixUrl }: Props) {
  const [expanded, setExpanded] = useState(false);

  const addressed = result.obligationFindings.filter((f) => f.status === "addressed").length;
  const partial = result.obligationFindings.filter((f) => f.status === "partially_addressed").length;
  const notAddressed = result.obligationFindings.filter((f) => f.status === "not_addressed").length;
  const na = result.obligationFindings.filter((f) => f.status === "not_applicable").length;
  const total = result.obligationFindings.length;

  const sections = parseRegulationSections(result.overallAssessment);
  const missingCount = result.missingClauses?.length || 0;
  const concernCount = result.qualityConcerns?.length || 0;

  return (
    <div className="mt-3 border border-[var(--border)] rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 bg-[var(--muted)] text-left text-sm flex items-center justify-between hover:bg-[var(--border)] transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          T&Cs Analysis
        </span>
        <span className="flex items-center gap-3 text-xs">
          <StatusPill count={addressed} total={total} label="addressed" variant="good" />
          {partial > 0 && <StatusPill count={partial} total={total} label="partial" variant="warn" />}
          {notAddressed > 0 && <StatusPill count={notAddressed} total={total} label="gaps" variant="bad" />}
          {na > 0 && <span className="text-[var(--muted-foreground)]">{na} n/a</span>}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4 text-sm">
          {/* Per-regulation summaries */}
          {sections.map((section, i) => (
            <RegulationSection key={i} title={section.title} body={section.body} />
          ))}

          {/* Missing clauses */}
          {missingCount > 0 && (
            <div className="border border-[var(--status-non-compliant-bg)] rounded-md p-3 bg-[var(--status-non-compliant-bg)]">
              <div className="flex items-center gap-2 mb-2">
                <FileWarning size={14} className="text-[var(--status-non-compliant-text)] shrink-0" />
                <p className="font-medium text-[var(--status-non-compliant-text)]">
                  Missing Clauses ({missingCount})
                </p>
              </div>
              <ul className="space-y-1 text-xs text-[var(--status-non-compliant-text)]">
                {result.missingClauses!.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quality concerns */}
          {concernCount > 0 && (
            <div className="border border-[var(--status-in-progress-bg)] rounded-md p-3 bg-[var(--status-in-progress-bg)]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-[var(--status-in-progress-text)] shrink-0" />
                <p className="font-medium text-[var(--status-in-progress-text)]">
                  Quality Concerns ({concernCount})
                </p>
              </div>
              <ul className="space-y-1 text-xs text-[var(--status-in-progress-text)]">
                {result.qualityConcerns!.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Link to matrix */}
          {matrixUrl && (
            <a
              href={matrixUrl}
              className="flex items-center gap-2 text-xs text-[var(--accent)] hover:underline pt-1"
            >
              View per-obligation detail in Compliance Matrix
              <ArrowRight size={12} />
            </a>
          )}
          {!matrixUrl && (
            <p className="text-xs text-[var(--muted-foreground)] pt-1">
              Per-obligation findings are shown in the Compliance Matrix.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({
  count,
  total,
  label,
  variant,
}: {
  count: number;
  total: number;
  label: string;
  variant: "good" | "warn" | "bad";
}) {
  const colors = {
    good: "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]",
    warn: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]",
    bad: "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full font-medium ${colors[variant]}`}>
      {count}/{total} {label}
    </span>
  );
}

function RegulationSection({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  // Truncate to first ~150 chars for preview
  const preview = body.length > 150 ? body.slice(0, 150).trimEnd() + "…" : body;
  const isLong = body.length > 150;

  return (
    <div className="border border-[var(--border)] rounded-md p-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-start gap-2"
      >
        <span className="mt-0.5 shrink-0">
          {isLong ? (
            open ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-xs mb-1">{title}</p>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            {open || !isLong ? body : preview}
          </p>
        </div>
      </button>
    </div>
  );
}
