"use client";

import { useState } from "react";

interface StatusBreakdown {
  compliant: number;
  non_compliant: number;
  in_progress: number;
  not_assessed: number;
  not_applicable: number;
}

const STATUS_CONFIG = [
  { key: "compliant", label: "Compliant", bg: "var(--status-compliant-bg)", text: "var(--status-compliant-text)" },
  { key: "non_compliant", label: "Non-Compliant", bg: "var(--status-non-compliant-bg)", text: "var(--status-non-compliant-text)" },
  { key: "in_progress", label: "In Progress", bg: "var(--status-in-progress-bg)", text: "var(--status-in-progress-text)" },
  { key: "not_assessed", label: "Not Assessed", bg: "var(--status-not-assessed-bg)", text: "var(--status-not-assessed-text)" },
  { key: "not_applicable", label: "N/A", bg: "var(--status-na-bg)", text: "var(--status-na-text)" },
] as const;

export function MiniComplianceBar({ breakdown, total }: { breakdown: StatusBreakdown; total: number }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (total === 0) {
    return <span className="text-xs text-[var(--muted-foreground)]">No matrix</span>;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex h-2 rounded-full overflow-hidden bg-[var(--muted)] w-full min-w-[100px]">
        {STATUS_CONFIG.map(({ key, bg }) => {
          const count = breakdown[key as keyof StatusBreakdown];
          if (count === 0) return null;
          return (
            <div
              key={key}
              className="h-full"
              style={{ width: `${(count / total) * 100}%`, backgroundColor: bg }}
            />
          );
        })}
      </div>

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg whitespace-nowrap">
          <div className="flex flex-col gap-1">
            {STATUS_CONFIG.map(({ key, label, text }) => {
              const count = breakdown[key as keyof StatusBreakdown];
              if (count === 0) return null;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="font-medium" style={{ color: text }}>{count}</span>
                  <span className="text-[var(--muted-foreground)]">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
