import Link from "next/link";
import { formatDate, deadlineUrgency } from "@/lib/utils";

interface ConsultationItem {
  id: string;
  title: string;
  referenceNumber: string | null;
  responseDeadline: string | null;
  regulator: { abbreviation: string } | null;
}

interface Props {
  items: ConsultationItem[];
}

export function OpenConsultationsSection({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-5">
        <h2
          className="text-sm font-semibold tracking-wide uppercase mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Open Consultations
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          No open consultations being tracked.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Open Consultations ({items.length})
        </h2>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {items.map((item) => {
          const urgency = deadlineUrgency(item.responseDeadline);
          const deadlineClass =
            urgency === "overdue"
              ? "text-[var(--status-non-compliant-text)] font-medium"
              : urgency === "urgent"
              ? "text-[var(--status-non-compliant-text)]"
              : urgency === "approaching"
              ? "text-[var(--status-in-progress-text)]"
              : "text-[var(--muted-foreground)]";

          return (
            <Link
              key={item.id}
              href={`/horizon/${item.id}`}
              className="block px-4 py-3 hover:bg-[var(--muted)] transition-colors"
            >
              <div className="flex items-start gap-2">
                {item.referenceNumber && (
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded text-[11px] bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)] font-medium"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.referenceNumber}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    {item.responseDeadline && (
                      <span className={deadlineClass}>
                        {urgency === "overdue" ? "Overdue — " : "Due "}
                        {formatDate(item.responseDeadline)}
                      </span>
                    )}
                    {item.regulator && (
                      <span className="text-[var(--muted-foreground)]">
                        {item.regulator.abbreviation}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
