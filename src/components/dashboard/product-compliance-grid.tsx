import { formatRelativeTime } from "@/lib/utils";
import { MiniComplianceBar } from "./mini-compliance-bar";

interface ProductRow {
  id: string;
  name: string;
  productTypeName: string;
  statusBreakdown: {
    compliant: number;
    non_compliant: number;
    not_evidenced: number;
    in_progress: number;
    not_assessed: number;
    not_applicable: number;
  };
  totalObligations: number;
  mandatoryTotal: number;
  complianceScore: number; // -1 means no mandatory obligations
  lastAnalysis: Date | string | null;
}

export function ProductComplianceGrid({ products }: { products: ProductRow[] }) {
  if (products.length === 0) return null;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Product Compliance
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-2.5 font-medium text-[var(--muted-foreground)] text-xs">Product</th>
              <th className="text-left px-4 py-2.5 font-medium text-[var(--muted-foreground)] text-xs">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-[var(--muted-foreground)] text-xs min-w-[140px]">Status</th>
              <th className="text-right px-4 py-2.5 font-medium text-[var(--muted-foreground)] text-xs">Score</th>
              <th className="text-right px-4 py-2.5 font-medium text-[var(--muted-foreground)] text-xs">Last Analysis</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                <td className="px-4 py-2.5">
                  <a
                    href={`/products/${p.id}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {p.name}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-[var(--muted-foreground)]">{p.productTypeName}</td>
                <td className="px-4 py-2.5">
                  <MiniComplianceBar breakdown={p.statusBreakdown} total={p.totalObligations} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  {p.complianceScore === -1 ? (
                    <span className="text-xs text-[var(--muted-foreground)]" title="No mandatory clause obligations">N/A</span>
                  ) : p.totalObligations > 0 ? (
                    <span className={`text-xs font-medium ${p.complianceScore >= 80 ? "text-[var(--status-compliant-text)]" : p.complianceScore >= 50 ? "text-[var(--status-in-progress-text)]" : "text-[var(--status-non-compliant-text)]"}`}>
                      {p.complianceScore}%
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-[var(--muted-foreground)]">
                  {p.lastAnalysis ? formatRelativeTime(p.lastAnalysis) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
