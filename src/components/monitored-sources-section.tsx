"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatRelativeTime, REGULATOR_SOURCE_TYPES } from "@/lib/utils";

interface FeedSourceSummary {
  id: string;
  name: string;
  feedType: string;
  isActive: boolean;
  lastPolledAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  regulator: { abbreviation: string; sourceType: string } | null;
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
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState<{ created: number; byFeed: Record<string, number> } | null>(null);

  if (sources.length === 0) {
    return null;
  }

  const activeCount = sources.filter((s) => s.isActive).length;
  const mostRecentPoll = sources
    .filter((s) => s.lastPolledAt)
    .sort((a, b) => new Date(b.lastPolledAt!).getTime() - new Date(a.lastPolledAt!).getTime())[0]
    ?.lastPolledAt ?? null;

  // Group feeds by source type
  const grouped: Record<string, FeedSourceSummary[]> = {};
  for (const source of sources) {
    const sourceType = source.regulator?.sourceType || "primary_regulator";
    if (!grouped[sourceType]) grouped[sourceType] = [];
    grouped[sourceType].push(source);
  }

  async function handlePoll() {
    setPolling(true);
    setPollResult(null);
    try {
      const res = await fetch("/api/horizon/ingest", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setPollResult({ created: data.created, byFeed: data.byFeed });
      }
    } catch {
      // silently fail
    } finally {
      setPolling(false);
    }
  }

  function getStatusDot(source: FeedSourceSummary) {
    if (!source.isActive) return "bg-[var(--muted-foreground)]";
    if (source.lastErrorAt) {
      // Error within last 24 hours
      const errorAge = Date.now() - new Date(source.lastErrorAt).getTime();
      if (errorAge < 24 * 60 * 60 * 1000) return "bg-[var(--status-non-compliant-bg)]";
      return "bg-[var(--status-in-progress-bg)]"; // Stale error
    }
    return "bg-[var(--status-compliant-bg)]";
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)] flex items-center justify-between">
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Monitored Sources
        </h2>
        <button
          onClick={handlePoll}
          disabled={polling}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <RefreshCw size={12} className={polling ? "animate-spin" : ""} />
          {polling ? "Polling..." : "Poll now"}
        </button>
      </div>

      {/* Poll result banner */}
      {pollResult && (
        <div className="px-4 py-2 bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)] text-xs">
          Polled all feeds — {pollResult.created} new item{pollResult.created !== 1 ? "s" : ""} ingested.
          {pollResult.created > 0 && " Refresh the page to see them."}
        </div>
      )}

      {/* Grouped feeds */}
      {Object.entries(REGULATOR_SOURCE_TYPES).map(([typeKey, typeMeta]) => {
        const groupSources = grouped[typeKey];
        if (!groupSources || groupSources.length === 0) return null;
        return (
          <div key={typeKey}>
            <div className="px-4 py-1.5 bg-[var(--muted)] border-t border-[var(--border)]">
              <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                {typeMeta.label} ({groupSources.length})
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {groupSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  {/* Status dot */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(source)}`}
                    title={source.lastError || undefined}
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

                  {/* Last polled / error */}
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                    {!source.isActive
                      ? "Inactive"
                      : source.lastErrorAt && (Date.now() - new Date(source.lastErrorAt).getTime() < 24 * 60 * 60 * 1000)
                        ? `Error ${formatRelativeTime(source.lastErrorAt)}`
                        : source.lastPolledAt
                          ? `Polled ${formatRelativeTime(source.lastPolledAt)}`
                          : "Not polled yet"
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Ungrouped feeds (no regulator / unknown type) */}
      {sources.filter((s) => !s.regulator?.sourceType && !grouped["primary_regulator"]?.includes(s)).length > 0 && (
        <div>
          <div className="px-4 py-1.5 bg-[var(--muted)] border-t border-[var(--border)]">
            <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              Other Sources
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {sources.filter((s) => !s.regulator).map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(source)}`} />
                <span className="text-sm font-medium flex-1 min-w-0 truncate">{source.name}</span>
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                  {FEED_TYPE_LABELS[source.feedType] || source.feedType}
                </span>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                  {source.lastPolledAt ? `Polled ${formatRelativeTime(source.lastPolledAt)}` : "Not polled yet"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
