"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HORIZON_ITEM_TYPES, HORIZON_PRIORITIES } from "@/lib/utils";

interface Regulator {
  id: string;
  name: string;
  abbreviation: string;
}

interface FormState {
  title: string;
  itemType: string;
  regulatorId: string;
  referenceNumber: string;
  summary: string;
  publishedDate: string;
  responseDeadline: string;
  effectiveDate: string;
  sourceUrl: string;
  priority: string;
  rawContent: string;
}

const initialState: FormState = {
  title: "",
  itemType: "consultation_paper",
  regulatorId: "",
  referenceNumber: "",
  summary: "",
  publishedDate: "",
  responseDeadline: "",
  effectiveDate: "",
  sourceUrl: "",
  priority: "medium",
  rawContent: "",
};

const inputClass =
  "w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)] focus:border-[var(--accent)] focus:outline-none transition-colors";

export function HorizonItemForm({ regulators }: { regulators: Regulator[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Auto-detect regulator from reference number
  useEffect(() => {
    if (!form.referenceNumber || form.regulatorId) return;
    const ref = form.referenceNumber.toUpperCase();
    if (/^(CP|PS|GC|FG|TR|DP|FS)\d/.test(ref)) {
      const fca = regulators.find((r) => r.abbreviation === "FCA");
      if (fca) setField("regulatorId", fca.id);
    } else if (/^SI\s?\d/.test(ref)) {
      // Statutory instrument — no specific regulator
    }
  }, [form.referenceNumber, form.regulatorId, regulators]);

  async function handleExtract() {
    if (!form.rawContent.trim()) return;
    setExtracting(true);
    setError("");
    try {
      const res = await fetch("/api/horizon/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: form.rawContent }),
      });
      if (!res.ok) throw new Error("Extraction failed");
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        itemType: data.itemType || prev.itemType,
        referenceNumber: data.referenceNumber || prev.referenceNumber,
        summary: data.summary || prev.summary,
        publishedDate: data.publishedDate || prev.publishedDate,
        responseDeadline: data.responseDeadline || prev.responseDeadline,
        effectiveDate: data.effectiveDate || prev.effectiveDate,
        sourceUrl: data.sourceUrl || prev.sourceUrl,
      }));
    } catch {
      setError("Failed to extract details from text. Try filling in manually.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/horizon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          itemType: form.itemType,
          regulatorId: form.regulatorId || null,
          referenceNumber: form.referenceNumber || null,
          summary: form.summary,
          publishedDate: form.publishedDate || null,
          responseDeadline: form.responseDeadline || null,
          effectiveDate: form.effectiveDate || null,
          sourceUrl: form.sourceUrl || null,
          priority: form.priority,
          rawContent: form.rawContent || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }

      const item = await res.json();
      router.push(`/horizon/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create horizon item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Raw text + extract */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Raw Text <span className="text-[var(--muted-foreground)] font-normal">(optional — paste regulatory text to extract details)</span>
        </label>
        <textarea
          value={form.rawContent}
          onChange={(e) => setField("rawContent", e.target.value)}
          rows={6}
          className={inputClass}
          placeholder="Paste consultation paper text, policy statement, or other regulatory content..."
        />
        {form.rawContent.trim() && (
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting}
            className="mt-2 px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {extracting ? "Extracting..." : "Extract with AI"}
          </button>
        )}
      </div>

      <hr className="border-[var(--border)]" />

      {/* Core fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className={inputClass}
            placeholder="e.g. CP26/7: Changes to BCOBS disclosure requirements"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select
            required
            value={form.itemType}
            onChange={(e) => setField("itemType", e.target.value)}
            className={inputClass}
          >
            {Object.entries(HORIZON_ITEM_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Regulator</label>
          <select
            value={form.regulatorId}
            onChange={(e) => setField("regulatorId", e.target.value)}
            className={inputClass}
          >
            <option value="">— Select —</option>
            {regulators.map((r) => (
              <option key={r.id} value={r.id}>
                {r.abbreviation} — {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Reference Number</label>
          <input
            type="text"
            value={form.referenceNumber}
            onChange={(e) => setField("referenceNumber", e.target.value)}
            className={inputClass}
            placeholder="e.g. CP26/7, PS25/3, SI 2026/142"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setField("priority", e.target.value)}
            className={inputClass}
          >
            {Object.entries(HORIZON_PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Summary *</label>
        <textarea
          required
          value={form.summary}
          onChange={(e) => setField("summary", e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="Brief description of the regulatory development and its potential impact..."
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Published Date</label>
          <input
            type="date"
            value={form.publishedDate}
            onChange={(e) => setField("publishedDate", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Response Deadline</label>
          <input
            type="date"
            value={form.responseDeadline}
            onChange={(e) => setField("responseDeadline", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Effective Date</label>
          <input
            type="date"
            value={form.effectiveDate}
            onChange={(e) => setField("effectiveDate", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Source URL</label>
        <input
          type="url"
          value={form.sourceUrl}
          onChange={(e) => setField("sourceUrl", e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
      </div>

      {error && (
        <div className="rounded-md p-3 bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)] text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Horizon Item"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/horizon")}
          className="px-5 py-2.5 border border-[var(--border)] rounded-md text-sm font-medium hover:bg-[var(--muted)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
