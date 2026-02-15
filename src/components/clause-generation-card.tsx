"use client";

import { useState } from "react";

interface GeneratedClause {
  obligationId: string;
  title: string;
  clauseText: string;
  guidance: string;
  confidence: number;
}

export function ClauseGenerationCard({ productId }: { productId: string }) {
  const [generating, setGenerating] = useState(false);
  const [clauses, setClauses] = useState<GeneratedClause[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setClauses(null);

    try {
      const res = await fetch(`/api/products/${productId}/clauses`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }
      const data = await res.json();
      setClauses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function copyAll() {
    if (!clauses) return;
    const text = clauses
      .map((c, i) => `${i + 1}. ${c.title}\n\n${c.clauseText}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Generate Draft T&Cs
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            AI-generated clause drafts based on applicable obligations. Review
            and edit these into your product terms, then upload for compliance
            analysis.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap shrink-0 ml-4"
        >
          {generating ? "Generating..." : clauses ? "Regenerate" : "Generate Clauses"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-[var(--status-non-compliant-text)] mt-2">
          {error}
        </p>
      )}

      {clauses && clauses.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--muted-foreground)]">
              {clauses.length} clauses generated
            </p>
            <button
              onClick={copyAll}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {copied ? "Copied!" : "Copy All Clauses"}
            </button>
          </div>

          <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-md">
            {clauses.map((clause, i) => (
              <div key={clause.obligationId || i} className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold">
                    {i + 1}. {clause.title}
                  </span>
                  {clause.confidence < 0.8 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]">
                      Review closely
                    </span>
                  )}
                </div>
                <p
                  className="text-xs whitespace-pre-wrap leading-relaxed"
                  style={{
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                  }}
                >
                  {clause.clauseText}
                </p>
                {clause.guidance && (
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-2 italic">
                    {clause.guidance}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {clauses && clauses.length === 0 && (
        <p className="text-xs text-[var(--muted-foreground)] mt-3">
          All applicable obligations already have clause templates. No
          generation needed.
        </p>
      )}
    </div>
  );
}
