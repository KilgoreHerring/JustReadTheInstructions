"use client";

import { useState } from "react";

interface StatusCounts {
  compliant: number;
  non_compliant: number;
  in_progress: number;
  not_assessed: number;
  not_applicable: number;
  total: number;
}

interface HeatmapData {
  products: { id: string; name: string }[];
  regulations: { id: string; title: string; citation: string }[];
  cells: Record<string, Record<string, StatusCounts>>; // productId -> regulationId -> counts
}

function getCellColor(counts: StatusCounts | undefined): { bg: string; text: string } {
  if (!counts || counts.total === 0) return { bg: "transparent", text: "var(--muted-foreground)" };
  if (counts.non_compliant > 0) return { bg: "var(--status-non-compliant-bg)", text: "var(--status-non-compliant-text)" };
  if (counts.in_progress > 0) return { bg: "var(--status-in-progress-bg)", text: "var(--status-in-progress-text)" };
  if (counts.not_assessed === counts.total) return { bg: "var(--status-not-assessed-bg)", text: "var(--status-not-assessed-text)" };
  if (counts.compliant + counts.not_applicable === counts.total) return { bg: "var(--status-compliant-bg)", text: "var(--status-compliant-text)" };
  return { bg: "var(--status-in-progress-bg)", text: "var(--status-in-progress-text)" };
}

const STATUS_LABELS: { key: keyof StatusCounts; label: string }[] = [
  { key: "compliant", label: "Compliant" },
  { key: "non_compliant", label: "Non-Compliant" },
  { key: "in_progress", label: "In Progress" },
  { key: "not_assessed", label: "Not Assessed" },
  { key: "not_applicable", label: "N/A" },
];

export function ComplianceHeatmap({ data }: { data: HeatmapData }) {
  const [tooltip, setTooltip] = useState<{
    productId: string;
    regulationId: string;
    x: number;
    y: number;
  } | null>(null);

  if (data.products.length === 0 || data.regulations.length === 0) return null;

  return (
    <div className="border border-[var(--border)] rounded-lg mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Compliance Overview
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-2.5 font-medium text-[var(--muted-foreground)] text-xs sticky left-0 bg-[var(--background)] z-10">
                Product
              </th>
              {data.regulations.map((reg) => (
                <th
                  key={reg.id}
                  className="px-3 py-2.5 font-medium text-[var(--muted-foreground)] text-xs text-center min-w-[80px]"
                  title={reg.title}
                >
                  {reg.citation.replace(/^FCA\s+/i, "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.products.map((product) => (
              <tr key={product.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-2 sticky left-0 bg-[var(--background)] z-10">
                  <a
                    href={`/products/${product.id}`}
                    className="font-medium text-[var(--accent)] hover:underline text-sm"
                  >
                    {product.name}
                  </a>
                </td>
                {data.regulations.map((reg) => {
                  const counts = data.cells[product.id]?.[reg.id];
                  const { bg, text } = getCellColor(counts);
                  const hasEntries = counts && counts.total > 0;

                  return (
                    <td
                      key={reg.id}
                      className="px-3 py-2 text-center relative"
                      onMouseEnter={(e) => {
                        if (!hasEntries) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          productId: product.id,
                          regulationId: reg.id,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {hasEntries ? (
                        <a
                          href={`/products/${product.id}/matrix`}
                          className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                          style={{ backgroundColor: bg, color: text }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {counts.compliant}/{counts.total}
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (() => {
        const counts = data.cells[tooltip.productId]?.[tooltip.regulationId];
        if (!counts) return null;
        const product = data.products.find((p) => p.id === tooltip.productId);
        const reg = data.regulations.find((r) => r.id === tooltip.regulationId);
        return (
          <div
            className="fixed z-50 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="text-xs font-medium mb-1.5">
              {product?.name} — {reg?.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {STATUS_LABELS.map(({ key, label }) => {
                const count = counts[key];
                if (typeof count !== "number" || count === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-[var(--muted-foreground)]">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
