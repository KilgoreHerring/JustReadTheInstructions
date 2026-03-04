import Link from "next/link";
import { formatDate, daysUntilDeadline, consultationUrgency } from "@/lib/utils";

interface ConsultationItem {
  id: string;
  title: string;
  referenceNumber: string | null;
  responseDeadline: string | null;
  publishedDate?: string | null;
  regulator: { abbreviation: string } | null;
}

interface Props {
  items: ConsultationItem[];
}

export function ConsultationTimeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-5">
        <h2
          className="text-sm font-semibold tracking-wide uppercase mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Consultations
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          No open consultations being tracked.
        </p>
      </div>
    );
  }

  // Split into items with and without deadlines
  const withDeadline = items
    .filter((i) => i.responseDeadline)
    .sort((a, b) => new Date(a.responseDeadline!).getTime() - new Date(b.responseDeadline!).getTime());
  const noDeadline = items.filter((i) => !i.responseDeadline);

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Consultations ({items.length})
        </h2>
      </div>

      <div className="px-4 py-3">
        {/* Timeline items with deadlines */}
        {withDeadline.map((item, index) => {
          const days = daysUntilDeadline(item.responseDeadline);
          const urgency = consultationUrgency(item.responseDeadline);
          const isLast = index === withDeadline.length - 1 && noDeadline.length === 0;

          // Dot colour: 4-tier system
          let dotClass = "bg-[var(--muted-foreground)]";
          if (urgency === "critical" || urgency === "closed") {
            dotClass = "bg-[var(--status-non-compliant-bg)]";
          } else if (urgency === "urgent") {
            dotClass = "bg-[var(--status-non-compliant-bg)]";
          } else if (urgency === "approaching") {
            dotClass = "bg-[var(--status-in-progress-bg)]";
          }

          // Countdown text
          let countdownText = "";
          if (days !== null) {
            if (days < 0) {
              countdownText = `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`;
            } else if (days === 0) {
              countdownText = "Due today";
            } else {
              countdownText = `${days} day${days !== 1 ? "s" : ""} remaining`;
            }
          }

          // Urgency label
          let urgencyLabel = "";
          if (urgency === "critical") urgencyLabel = "CRITICAL";
          else if (urgency === "urgent") urgencyLabel = "URGENT";
          else if (urgency === "approaching") urgencyLabel = "APPROACHING";

          return (
            <div key={item.id} className="relative flex gap-3">
              {/* Timeline track */}
              <div className="flex flex-col items-center shrink-0 w-4">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
                {!isLast && (
                  <div className="w-px flex-1 bg-[var(--border)] my-1" />
                )}
              </div>

              {/* Content */}
              <Link
                href={`/horizon/${item.id}`}
                className="flex-1 min-w-0 pb-4 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {item.referenceNumber && (
                        <span
                          className="shrink-0 px-1.5 py-0.5 rounded text-[11px] bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)] font-medium"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {item.referenceNumber}
                        </span>
                      )}
                      {item.regulator && (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {item.regulator.abbreviation}
                        </span>
                      )}
                      {urgencyLabel && (
                        <span
                          className={`px-1 py-0.5 rounded text-[9px] font-bold tracking-wider ${
                            urgency === "critical" || urgency === "closed"
                              ? "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]"
                              : urgency === "urgent"
                              ? "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]"
                              : "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]"
                          }`}
                        >
                          {urgencyLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-snug">{item.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Due {formatDate(item.responseDeadline)}
                      {countdownText && (
                        <span
                          className={
                            urgency === "critical" || urgency === "closed"
                              ? " text-[var(--status-non-compliant-text)] font-medium"
                              : urgency === "urgent"
                              ? " text-[var(--status-non-compliant-text)]"
                              : urgency === "approaching"
                              ? " text-[var(--status-in-progress-text)]"
                              : ""
                          }
                        >
                          {" · "}{countdownText}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}

        {/* Items without deadlines — show published/active date instead */}
        {noDeadline.length > 0 && (
          <div className={withDeadline.length > 0 ? "mt-2 pt-2 border-t border-[var(--border)]" : ""}>
            <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide mb-2 font-medium">
              No deadline set
            </p>
            {noDeadline.map((item) => (
              <Link
                key={item.id}
                href={`/horizon/${item.id}`}
                className="flex items-center gap-2 py-1.5 hover:opacity-80 transition-opacity"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.referenceNumber && (
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[11px] bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)] font-medium"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {item.referenceNumber}
                      </span>
                    )}
                    <span className="text-sm truncate">{item.title}</span>
                  </div>
                  {item.publishedDate && (
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      Active since {formatDate(item.publishedDate)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
