import Link from "next/link";
import { formatDate, HORIZON_STATUSES } from "@/lib/utils";

interface UpcomingItem {
  id: string;
  title: string;
  effectiveDate: string | null;
  status: string;
  regulator: { abbreviation: string } | null;
  parent: { id: string; title: string; handbookNoticeNumber: number | null } | null;
}

interface Props {
  items: UpcomingItem[];
}

export function UpcomingChangesSection({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-5">
        <h2
          className="text-sm font-semibold tracking-wide uppercase mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Upcoming Changes
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          No upcoming regulatory changes tracked.
        </p>
      </div>
    );
  }

  // Group by month
  const grouped: Record<string, UpcomingItem[]> = {};
  for (const item of items) {
    if (!item.effectiveDate) continue;
    const d = new Date(item.effectiveDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const sortedMonths = Object.keys(grouped).sort();

  function monthLabel(key: string) {
    const [y, m] = key.split("-");
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Upcoming Changes ({items.length})
        </h2>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {sortedMonths.map((monthKey) => (
          <div key={monthKey} className="px-4 py-3">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              {monthLabel(monthKey)}
            </p>
            <div className="space-y-2">
              {grouped[monthKey].map((item) => {
                const statusInfo =
                  HORIZON_STATUSES[item.status as keyof typeof HORIZON_STATUSES];
                return (
                  <Link
                    key={item.id}
                    href={`/horizon/${item.id}`}
                    className="block hover:text-[var(--accent)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium leading-snug flex-1 min-w-0">
                        {item.title}
                      </span>
                      {statusInfo && (
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {item.effectiveDate && <span>{formatDate(item.effectiveDate)}</span>}
                      {item.regulator && <span>{item.regulator.abbreviation}</span>}
                      {item.parent?.handbookNoticeNumber && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--citation-bg)]">
                          HN {item.parent.handbookNoticeNumber}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
