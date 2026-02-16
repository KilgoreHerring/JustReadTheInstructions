"use client";

import { useState } from "react";
import { BookType, Upload, Loader2 } from "lucide-react";
import { ReadabilityResults, type ReadabilityResult } from "@/components/readability-results";

export default function ReadabilityPage() {
  const [content, setContent] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ReadabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleAnalyze() {
    if (!content.trim()) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/readability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "pdf" || ext === "docx") {
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/extract-product", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to extract text");
        }
        const { extractedText } = await res.json();
        setContent(extractedText);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to extract text");
      } finally {
        setUploading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => setContent(reader.result as string);
      reader.readAsText(file);
    }

    // Reset file input
    e.target.value = "";
  }

  function handleClear() {
    setContent("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="prose-column">
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Readability Scoring
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Analyse any document for readability using industry-standard metrics.
          FCA Consumer Duty requires firms to communicate in a way customers can
          understand — this tool measures how accessible your language is.
        </p>
      </div>

      {/* Input Area */}
      <div className="border border-[var(--border)] rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Document Text
          </h2>
          {content && (
            <button
              onClick={handleClear}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your document text here — terms & conditions, product descriptions, customer communications..."
          rows={10}
          className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)] focus:border-[var(--accent)] focus:outline-none transition-colors resize-y"
          style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
        />

        <div className="flex items-center gap-3 mt-3">
          <label className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline cursor-pointer">
            <Upload size={12} />
            {uploading ? "Extracting text..." : "Upload file (.txt, .pdf, .docx)"}
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <div className="flex-1" />
          {content && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {content.trim().split(/\s+/).length.toLocaleString()} words
            </span>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !content.trim()}
            className="px-4 py-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                <BookType size={12} />
                Analyse Readability
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-[var(--status-non-compliant-bg)] bg-[var(--status-non-compliant-bg)] rounded-lg p-4 mb-6">
          <p className="text-sm text-[var(--status-non-compliant-text)]">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mb-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Results
          </h2>
          <ReadabilityResults result={result} />
        </div>
      )}
    </div>
  );
}
