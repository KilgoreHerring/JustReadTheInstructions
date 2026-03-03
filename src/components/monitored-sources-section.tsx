import { formatRelativeTime } from "@/lib/utils";

interface FeedSourceSummary {
  id: string;
  name: string;
  feedType: string;
  isActive: boolean;
  lastPolledAt: string | null;
  regulator: { abbreviation: string } | null;
}

interface Props {
  sources: FeedSourceSummary[];
}

const FEED_TYPE_LABELS: Record<string, string> = {
  rss: "RSS",
  atom: "Atom",
  legislation_api: "Legislation API",
};

export function MonitoredSourcesSection({ sources }: Props) {
  if (sources.length === 0) {
    return null;
  }

  const activeCount = sources.filter((s) => s.isActive).length;
  const mostRecentPoll = sources
    .filter((s) => s.lastPolledAt)
    .sort((a, b) => new Date(b.lastPolledAt!).getTime() - new Date(a.lastPolledAt!).getTime())[0]
    ?.lastPolledAt ?? null;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Monitored Sources
        </h2>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            {/* Status dot */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                source.isActive
                  ? "bg-[var(--status-compliant-bg)]"
                  : "bg-[var(--muted-foreground)]"
              }`}
            />

            {/* Name */}
            <span className="text-sm font-medium flex-1 min-w-0 truncate">
              {source.name}
            </span>

            {/* Feed type badge */}
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
              {FEED_TYPE_LABELS[source.feedType] || source.feedType}
            </span>

            {/* Regulator */}
            {source.regulator && (
              <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                {source.regulator.abbreviation}
              </span>
            )}

            {/* Last polled */}
            <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
              {source.isActive
                ? source.lastPolledAt
                  ? `Polled ${formatRelativeTime(source.lastPolledAt)}`
                  : "Not polled yet"
                : "Inactive"}
            </span>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--muted)]">
        <p className="text-[11px] text-[var(--muted-foreground)]">
          {sources.length} source{sources.length !== 1 ? "s" : ""}
          {" · "}
          {activeCount} active
          {mostRecentPoll && (
            <>
              {" · "}Last poll: {formatRelativeTime(mostRecentPoll)}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
