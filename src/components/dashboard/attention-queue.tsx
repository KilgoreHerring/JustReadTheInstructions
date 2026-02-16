import { AlertTriangle, Clock, FileQuestion, ArrowRight } from "lucide-react";

interface AttentionItem {
  productId: string;
  productName: string;
  reason: string;
  severity: "critical" | "warning" | "info";
  count?: number;
}

const SEVERITY_CONFIG = {
  critical: {
    border: "border-l-[var(--status-non-compliant-text)]",
    icon: AlertTriangle,
    iconColor: "text-[var(--status-non-compliant-text)]",
  },
  warning: {
    border: "border-l-[var(--status-in-progress-text)]",
    icon: Clock,
    iconColor: "text-[var(--status-in-progress-text)]",
  },
  info: {
    border: "border-l-[var(--status-not-assessed-text)]",
    icon: FileQuestion,
    iconColor: "text-[var(--status-not-assessed-text)]",
  },
} as const;

export function AttentionQueue({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded-lg h-full">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2
            className="text-base font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Needs Attention
          </h2>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-[var(--status-compliant-text)] font-medium">All clear</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">No products require immediate action.</p>
        </div>
      </div>
    );
  }

  const display = items.slice(0, 8);
  const remaining = items.length - 8;

  return (
    <div className="border border-[var(--border)] rounded-lg h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Needs Attention
        </h2>
      </div>
      <div className="divide-y divide-[var(--border)] flex-1">
        {display.map((item, i) => {
          const config = SEVERITY_CONFIG[item.severity];
          const Icon = config.icon;
          return (
            <a
              key={`${item.productId}-${i}`}
              href={`/products/${item.productId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition-colors border-l-3"
              style={{ borderLeftColor: `${item.severity === "critical" ? "var(--status-non-compliant-text)" : item.severity === "warning" ? "var(--status-in-progress-text)" : "var(--status-not-assessed-text)"}` }}
            >
              <Icon size={14} className={config.iconColor} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.productName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{item.reason}</p>
              </div>
              <ArrowRight size={14} className="text-[var(--muted-foreground)] shrink-0" />
            </a>
          );
        })}
      </div>
      {remaining > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)]">
          <a href="/products" className="text-xs text-[var(--accent)] hover:underline">
            View all products ({remaining} more)
          </a>
        </div>
      )}
    </div>
  );
}
