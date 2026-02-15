"use client";

import { useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    if (doc && (doc.analysisStatus === "pending" || doc.analysisStatus === "analysing")) {
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/products/${productId}/documents/${doc.id}`);
        if (res.ok) {
          const updated = await res.json();
          setDoc(updated);
          if (updated.analysisStatus === "complete" || updated.analysisStatus === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [doc?.id, doc?.analysisStatus, productId]);

  async function handleUpload() {
    if (!content.trim()) return;
    setUploading(true);
    setError(null);

    try {
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
      // Send binary files to server for text extraction
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

  async function handleReanalyse() {
    if (!doc) return;
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/documents/${doc.id}`, {
        method: "POST",
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowInput(true)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Replace
            </button>
            {doc.analysisStatus !== "pending" && (
              <button
                onClick={handleReanalyse}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                {doc.analysisStatus === "failed"
                  ? "Retry Analysis"
                  : doc.analysisStatus === "analysing"
                    ? "Restart Analysis"
                    : "Re-analyse"}
              </button>
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
