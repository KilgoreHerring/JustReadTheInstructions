"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { HORIZON_STATUSES, formatDate } from "@/lib/utils";

interface AiClassificationData {
  effectiveDates?: string[];
  handbookAreasAffected?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

interface InstrumentChild {
  id: string;
  title: string;
  summary: string;
  effectiveDate: string | null;
  status: string;
  referenceNumber: string | null;
  aiClassification: JsonValue;
}

interface HandbookNotice {
  id: string;
  title: string;
  summary: string;
  publishedDate: string | null;
  sourceUrl: string | null;
  handbookNoticeNumber: number | null;
  children: InstrumentChild[];
}

interface Props {
  notices: HandbookNotice[];
}

export function HandbookNoticeSpotlight({ notices: initialNotices }: Props) {
  const [notices, setNotices] = useState(initialNotices);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ingestNumber, setIngestNumber] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const featured = notices[activeIndex] ?? null;

  async function handleIngest() {
    const num = parseInt(ingestNumber, 10);
    if (!num || num < 1) return;

    setIngesting(true);
    setIngestError(null);

    try {
      const res = await fetch("/api/horizon/handbook-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeNumber: num }),
      });

      if (res.status === 409) {
        setIngestError(`Notice ${num} already ingested`);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setIngestError(data.error || "Ingestion failed");
        return;
      }

      // Refresh notice list
      const listRes = await fetch("/api/horizon/handbook-notice");
      if (listRes.ok) {
        const refreshed = await listRes.json();
        const serialised = refreshed.map((n: Record<string, unknown>) => ({
          ...n,
          publishedDate: n.publishedDate ? String(n.publishedDate) : null,
          children: (n.children as Record<string, unknown>[])?.map((c) => ({
            ...c,
            effectiveDate: c.effectiveDate ? String(c.effectiveDate) : null,
          })),
        }));
        setNotices(serialised);
        // Find the newly ingested notice
        const newIdx = serialised.findIndex(
          (n: HandbookNotice) => n.handbookNoticeNumber === num
        );
        setActiveIndex(newIdx >= 0 ? newIdx : 0);
      }

      setIngestNumber("");
    } catch {
      setIngestError("Network error — could not reach server");
    } finally {
      setIngesting(false);
    }
  }

  if (!featured && notices.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--horizon-handbook-bg)]">
        <h2
          className="text-sm font-semibold tracking-wide uppercase mb-3"
          style={{ fontFamily: "var(--font-heading)", color: "var(--horizon-handbook-text)" }}
        >
          FCA Handbook Notices
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          No handbook notices ingested yet. Enter a notice number to get started.
        </p>
        <IngestForm
          value={ingestNumber}
          onChange={setIngestNumber}
          onSubmit={handleIngest}
          loading={ingesting}
          error={ingestError}
        />
      </div>
    );
  }

  const pdfUrl = featured?.sourceUrl ?? null;
  const classification = (noticeChild: InstrumentChild): AiClassificationData | null => {
    if (!noticeChild.aiClassification) return null;
    return noticeChild.aiClassification as AiClassificationData;
  };

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-[var(--horizon-handbook-bg)] border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-heading)", color: "var(--horizon-handbook-text)" }}
            >
              {featured
                ? `FCA Handbook Notice No. ${featured.handbookNoticeNumber}`
                : "FCA Handbook Notices"}
            </h2>
            {featured && (
              <p className="text-xs mt-0.5" style={{ color: "var(--horizon-handbook-text)" }}>
                {featured.publishedDate && `Published ${formatDate(featured.publishedDate)}`}
                {featured.children.length > 0 &&
                  ` · ${featured.children.length} instrument${featured.children.length !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
              style={{ color: "var(--horizon-handbook-text)" }}
            >
              <FileText size={13} />
              PDF
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Featured notice summary */}
      {featured && (
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
            {featured.summary}
          </p>
        </div>
      )}

      {/* Instrument list */}
      {featured && featured.children.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          {featured.children.map((child) => {
            const ai = classification(child);
            const statusInfo =
              HORIZON_STATUSES[child.status as keyof typeof HORIZON_STATUSES];

            return (
              <Link
                key={child.id}
                href={`/horizon/${child.id}`}
                className="block px-5 py-3 hover:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{child.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[var(--muted-foreground)]">
                      {ai?.effectiveDates && ai.effectiveDates.length > 0 && (
                        <span>
                          Effective: {ai.effectiveDates.map((d) => formatDate(d)).join(", ")}
                        </span>
                      )}
                      {ai?.handbookAreasAffected && ai.handbookAreasAffected.length > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-[var(--citation-bg)]"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {ai.handbookAreasAffected.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  {statusInfo && (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Footer: ingest form + previous notices */}
      <div className="px-5 py-3 bg-[var(--muted)] border-t border-[var(--border)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <IngestForm
            value={ingestNumber}
            onChange={setIngestNumber}
            onSubmit={handleIngest}
            loading={ingesting}
            error={ingestError}
          />
          {notices.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[var(--muted-foreground)]">Previous:</span>
              {notices.map((n, i) => {
                if (i === activeIndex) return null;
                return (
                  <button
                    key={n.id}
                    onClick={() => setActiveIndex(i)}
                    className="px-2 py-0.5 rounded border border-[var(--border)] hover:bg-[var(--background)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {n.handbookNoticeNumber}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IngestForm({
  value,
  onChange,
  onSubmit,
  loading,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        placeholder="Notice #"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className="border border-[var(--border)] rounded-md px-3 py-1.5 text-sm bg-[var(--background)] w-24"
        disabled={loading}
      />
      <button
        onClick={onSubmit}
        disabled={loading || !value}
        className="px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            Ingesting...
          </>
        ) : (
          "Ingest Notice"
        )}
      </button>
      {error && <span className="text-xs text-[var(--status-non-compliant-text)]">{error}</span>}
    </div>
  );
}
