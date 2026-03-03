import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface ImplementedItem {
  id: string;
  title: string;
  effectiveDate: string | null;
  regulator: { abbreviation: string } | null;
}

interface Props {
  items: ImplementedItem[];
}

export function RecentlyImplementedSection({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-5">
        <h2
          className="text-sm font-semibold tracking-wide uppercase mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Recently Implemented
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          No recently implemented items.
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
          Recently Implemented ({items.length})
        </h2>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/horizon/${item.id}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--muted)] transition-colors"
          >
            <span className="text-sm font-medium flex-1 min-w-0 truncate">
              {item.title}
            </span>
            <span className="text-xs text-[var(--muted-foreground)] shrink-0">
              {item.effectiveDate ? formatDate(item.effectiveDate) : "—"}
            </span>
            {item.regulator && (
              <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                {item.regulator.abbreviation}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
