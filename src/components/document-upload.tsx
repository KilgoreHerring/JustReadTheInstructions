"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { DOCUMENT_TYPES, ANALYSIS_STATUSES, formatDate } from "@/lib/utils";

type DocType = keyof typeof DOCUMENT_TYPES;

interface ExistingDocument {
  id: string;
  documentType: string;
  fileName: string;
  analysisStatus: string;
  analysisCompletedAt: string | null;
  createdAt: string;
}

interface Props {
  productId: string;
  existingDocuments: ExistingDocument[];
}

export function DocumentUpload({ productId, existingDocuments }: Props) {
  return (
    <div className="space-y-4">
      {(Object.entries(DOCUMENT_TYPES) as [DocType, (typeof DOCUMENT_TYPES)[DocType]][]).map(
        ([key, meta]) => (
          <DocumentSlot
            key={key}
            productId={productId}
            documentType={key}
            label={meta.label}
            color={meta.color}
            existing={existingDocuments.find((d) => d.documentType === key)}
          />
        )
      )}
    </div>
  );
}

function AnalyseDropdown({
  onAnalyse,
  disabled,
  statusLabel,
}: {
  onAnalyse: (mode: "realtime" | "batch") => void;
  disabled?: boolean;
  statusLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (statusLabel) {
    return <span className="text-xs text-[var(--muted-foreground)]">{statusLabel}</span>;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline disabled:opacity-50"
      >
        Re-analyse <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-10 bg-[var(--background)] border border-[var(--border)] rounded-md shadow-lg py-1 min-w-[200px]">
          <button
            onClick={() => { onAnalyse("realtime"); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--muted)] transition-colors"
          >
            <span className="font-medium">Analyse Now</span>
            <span className="block text-[var(--muted-foreground)]">Real-time · full price</span>
          </button>
          <button
            onClick={() => { onAnalyse("batch"); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--muted)] transition-colors"
          >
            <span className="font-medium">Queue for Batch</span>
            <span className="block text-[var(--muted-foreground)]">Async · 50% cheaper</span>
          </button>
        </div>
      )}
    </div>
  );
}

function DocumentSlot({
  productId,
  documentType,
  label,
  color,
  existing,
}: {
  productId: string;
  documentType: DocType;
  label: string;
  color: string;
  existing?: ExistingDocument;
}) {
  const [doc, setDoc] = useState(existing || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [showInput, setShowInput] = useState(!existing);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const isPolling = doc && (doc.analysisStatus === "pending" || doc.analysisStatus === "analysing" || doc.analysisStatus === "queued");

  useEffect(() => {
    if (isPolling && doc) {
      const interval = doc.analysisStatus === "queued" ? 10000 : 3000;
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/products/${productId}/documents/${doc.id}`);
        if (res.ok) {
          const updated = await res.json();
          setDoc(updated);
          if (updated.analysisStatus === "complete" || updated.analysisStatus === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      }, interval);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [doc?.id, doc?.analysisStatus, productId, isPolling]);

  async function handleUpload() {
    if (!content.trim()) return;
    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload document (fast — just saves to DB + readability)
      const res = await fetch(`/api/products/${productId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          fileName: `${label}.txt`,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const created = await res.json();
      setDoc(created);
      setShowInput(false);
      setContent("");

      // Analysis is automatically submitted to the Batch API on upload.
      // The document status will be "queued" — polling handles the rest.
      // If batch creation failed, show the error so we can diagnose.
      if (created.batchError) {
        setError(`Batch analysis failed: ${created.batchError}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFileRead(e: React.ChangeEvent<HTMLInputElement>) {
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
  }

  async function handleReanalyse(mode: "realtime" | "batch") {
    if (!doc) return;
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/documents/${doc.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDoc(updated);
      }
    } catch {
      setError("Re-analysis failed");
    }
  }

  const statusMeta = doc
    ? ANALYSIS_STATUSES[doc.analysisStatus as keyof typeof ANALYSIS_STATUSES]
    : null;

  const isActive = doc && (doc.analysisStatus === "analysing" || doc.analysisStatus === "queued");

  return (
    <div className="border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {label}
          </span>
          {doc && statusMeta && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
          )}
        </div>
        {doc && !showInput && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInput(true)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Replace
            </button>
            {doc.analysisStatus !== "pending" && (
              <AnalyseDropdown
                onAnalyse={handleReanalyse}
                disabled={!!isActive}
                statusLabel={
                  doc.analysisStatus === "analysing" ? "Analysing..." :
                  doc.analysisStatus === "queued" ? "Queued..." :
                  undefined
                }
              />
            )}
          </div>
        )}
      </div>

      {doc && !showInput && (
        <div className="text-sm text-[var(--muted-foreground)]">
          <p>
            {doc.fileName} — uploaded {formatDate(doc.createdAt)}
            {doc.analysisCompletedAt && ` — analysed ${formatDate(doc.analysisCompletedAt)}`}
          </p>
        </div>
      )}

      {showInput && (
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Paste your ${label} document text here...`}
            rows={6}
            className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--accent)] hover:underline cursor-pointer">
              Or upload file (.txt, .pdf, .docx)
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleFileRead}
                className="hidden"
              />
            </label>
            <div className="flex-1" />
            {doc && (
              <button
                onClick={() => {
                  setShowInput(false);
                  setContent("");
                }}
                className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--muted)] transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={uploading || !content.trim()}
              className="px-4 py-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {uploading ? "Uploading..." : "Upload & Analyse"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--status-non-compliant-text)] mt-2">{error}</p>
      )}
    </div>
  );
}
