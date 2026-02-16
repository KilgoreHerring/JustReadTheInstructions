import { DOCUMENT_TYPES, formatRelativeTime } from "@/lib/utils";

interface AnalysisItem {
  documentId: string;
  documentType: string;
  productId: string;
  productName: string;
  completedAt: Date | string;
  summary: { addressed: number; partial: number; gaps: number; na: number; total: number };
}

export function RecentActivityFeed({ analyses }: { analyses: AnalysisItem[] }) {
  return (
    <div className="border border-[var(--border)] rounded-lg h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Recent Analysis
        </h2>
      </div>

      {analyses.length === 0 ? (
        <div className="p-6 text-center flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            No documents analysed yet. Upload a product document to begin.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)] flex-1">
          {analyses.map((a) => {
            const docType = DOCUMENT_TYPES[a.documentType as keyof typeof DOCUMENT_TYPES];
            return (
              <div key={a.documentId} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${docType?.color || ""}`}>
                    {docType?.label || a.documentType}
                  </span>
                  <a
                    href={`/products/${a.productId}`}
                    className="text-sm font-medium text-[var(--accent)] hover:underline truncate"
                  >
                    {a.productName}
                  </a>
                  <span
                    className="text-[11px] text-[var(--muted-foreground)] shrink-0 ml-auto"
                    style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
                  >
                    {formatRelativeTime(a.completedAt)}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <span className="text-[var(--status-compliant-text)]">{a.summary.addressed} addressed</span>
                  {a.summary.partial > 0 && (
                    <>, <span className="text-[var(--status-in-progress-text)]">{a.summary.partial} partial</span></>
                  )}
                  {a.summary.gaps > 0 && (
                    <>, <span className="text-[var(--status-non-compliant-text)]">{a.summary.gaps} gaps</span></>
                  )}
                  {a.summary.na > 0 && (
                    <>, {a.summary.na} N/A</>
                  )}
                  <span className="text-[var(--muted-foreground)]"> / {a.summary.total} obligations</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
