interface TopGap {
  obligationId: string;
  summary: string;
  regulation: string;
  citation: string;
  nonCompliantCount: number;
}

interface CommonFlag {
  text: string;
  count: number;
}

export function RiskSummary({
  topGaps,
  commonFlags,
}: {
  topGaps: TopGap[];
  commonFlags: CommonFlag[];
}) {
  const hasData = topGaps.length > 0 || commonFlags.length > 0;

  return (
    <div className="border border-[var(--border)] rounded-lg h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Risk Summary
        </h2>
      </div>

      {!hasData ? (
        <div className="p-6 text-center flex-1 flex items-center justify-center">
          <div>
            <p className="text-sm text-[var(--status-compliant-text)] font-medium">No issues found</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">No non-compliant findings across products.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {topGaps.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Top Compliance Gaps
              </p>
              <div className="space-y-2">
                {topGaps.map((gap, i) => (
                  <div key={gap.obligationId} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-[var(--status-non-compliant-text)] bg-[var(--status-non-compliant-bg)] rounded px-1.5 py-0.5 shrink-0">
                      {gap.nonCompliantCount}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs leading-snug line-clamp-2">{gap.summary}</p>
                      <span
                        className="text-[10px] text-[var(--muted-foreground)] bg-[var(--citation-bg)] px-1 py-0.5 rounded inline-block mt-0.5"
                        style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
                      >
                        {gap.citation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {commonFlags.length > 0 && (
            <div className={`px-4 py-3 ${topGaps.length > 0 ? "border-t border-[var(--border)]" : ""}`}>
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Common Red Flags
              </p>
              <div className="space-y-1.5">
                {commonFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-[var(--status-in-progress-text)] bg-[var(--status-in-progress-bg)] rounded px-1.5 py-0.5 shrink-0">
                      {flag.count}
                    </span>
                    <p className="text-xs leading-snug text-[var(--muted-foreground)]">{flag.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
