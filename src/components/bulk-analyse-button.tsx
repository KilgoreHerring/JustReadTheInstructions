"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  productIds: string[];
  documentCount: number;
}

interface BatchStatus {
  id: string;
  status: string;
  totalRequests: number;
  succeededCount: number;
  failedCount: number;
}

export function BulkAnalyseButton({ productIds, documentCount }: Props) {
  const [batch, setBatch] = useState<BatchStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleBatchAnalyse() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Batch creation failed");
      }
      const data = await res.json();
      setBatch({
        id: data.batchJobId,
        status: data.status,
        totalRequests: data.totalRequests,
        succeededCount: 0,
        failedCount: 0,
      });

      // Start polling
      pollRef.current = setInterval(async () => {
        const pollRes = await fetch(`/api/batch/${data.batchJobId}`);
        if (pollRes.ok) {
          const updated = await pollRes.json();
          setBatch({
            id: updated.id,
            status: updated.status,
            totalRequests: updated.totalRequests,
            succeededCount: updated.succeededCount,
            failedCount: updated.failedCount,
          });
          if (updated.status === "completed" || updated.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      }, 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (documentCount === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {!batch && (
        <button
          onClick={handleBatchAnalyse}
          disabled={submitting}
          className="px-4 py-2 border border-[var(--border)] rounded-md text-sm font-medium hover:bg-[var(--muted)] disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting..." : `Batch Analyse All (${documentCount} docs · 50% cheaper)`}
        </button>
      )}

      {batch && (
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--analysis-queued-bg)] text-[var(--analysis-queued-text)]">
            {batch.status === "completed" ? "Complete" :
             batch.status === "failed" ? "Failed" :
             batch.status === "processing" ? "Processing..." :
             "Submitted"}
          </span>
          <span className="text-[var(--muted-foreground)]">
            {batch.status === "completed"
              ? `${batch.succeededCount} succeeded, ${batch.failedCount} failed of ${batch.totalRequests} requests`
              : `${batch.totalRequests} requests queued`}
          </span>
          {batch.status === "completed" && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Refresh
            </button>
          )}
        </div>
      )}

      {error && (
        <span className="text-xs text-[var(--status-non-compliant-text)]">{error}</span>
      )}
    </div>
  );
}
