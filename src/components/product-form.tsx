"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ProductType {
  id: string;
  name: string;
  category: string;
}

interface FormState {
  name: string;
  productTypeId: string;
  description: string;
  jurisdictions: string;
  customerType: string;
  distributionChannel: string;
}

export function ProductForm({ productTypes }: { productTypes: ProductType[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    productTypeId: "",
    description: "",
    jurisdictions: "UK",
    customerType: "consumer",
    distributionChannel: "direct",
  });

  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extractedFileName, setExtractedFileName] = useState<string | null>(null);
  const [extractionConfidence, setExtractionConfidence] = useState<number | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFileUpload(file: File) {
    setExtracting(true);
    setExtractionError(null);
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
        throw new Error(err.error || "Extraction failed");
      }

      const { extractedDetails, extractedText: text, fileName } = await res.json();
      setExtractedText(text);
      setExtractedFileName(fileName);
      setExtractionConfidence(extractedDetails.confidence ?? null);

      // Pre-fill form fields from extraction (null fields left as-is)
      setForm((prev) => {
        const next = { ...prev };
        if (extractedDetails.name) next.name = extractedDetails.name;
        if (extractedDetails.description) next.description = extractedDetails.description;
        if (extractedDetails.customerType) next.customerType = extractedDetails.customerType;
        if (extractedDetails.distributionChannel) next.distributionChannel = extractedDetails.distributionChannel;
        if (extractedDetails.jurisdictions?.length) {
          next.jurisdictions = extractedDetails.jurisdictions.join(", ");
        }
        // Match product type name to ID (case-insensitive)
        if (extractedDetails.productType) {
          const match = productTypes.find(
            (pt) => pt.name.toLowerCase() === extractedDetails.productType.toLowerCase()
          );
          if (match) next.productTypeId = match.id;
        }
        return next;
      });
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  }

  function clearExtraction() {
    setExtractedText(null);
    setExtractedFileName(null);
    setExtractionConfidence(null);
    setExtractionError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data: Record<string, unknown> = {
      name: form.name,
      productTypeId: form.productTypeId,
      description: form.description,
      jurisdictions: form.jurisdictions.split(",").map((j) => j.trim()),
      customerType: form.customerType,
      distributionChannel: form.distributionChannel,
    };

    if (extractedText && extractedFileName) {
      data.extractedText = extractedText;
      data.extractedFileName = extractedFileName;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create product");
      }

      const product = await res.json();
      router.push(`/products/${product.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)] focus:border-[var(--accent)] focus:outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)] p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => !extracting && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          extracting
            ? "border-[var(--accent)] bg-[var(--accent)]/5 cursor-wait"
            : extractedFileName
              ? "border-[var(--status-compliant-text)] bg-[var(--status-compliant-bg)]"
              : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--muted)]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileInput}
          className="hidden"
        />
        {extracting ? (
          <div className="space-y-2">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-[var(--muted-foreground)]">
              Extracting product details...
            </p>
          </div>
        ) : extractedFileName ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--status-compliant-text)]">
              Extracted from {extractedFileName}
            </p>
            {extractionConfidence !== null && (
              <p className="text-xs text-[var(--muted-foreground)]">
                Confidence: {Math.round(extractionConfidence * 100)}%
              </p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearExtraction();
              }}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Drop a PDF or DOCX of product terms to auto-fill
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Or click to browse. Product details will be extracted automatically.
            </p>
          </div>
        )}
      </div>

      {extractionError && (
        <div className="bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)] p-3 rounded-md text-sm flex items-center justify-between">
          <span>{extractionError}</span>
          <button
            type="button"
            onClick={() => {
              setExtractionError(null);
              fileInputRef.current?.click();
            }}
            className="text-xs underline ml-2"
          >
            Try again
          </button>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Product Name</label>
        <input
          suppressHydrationWarning
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          required
          className={inputClass}
          placeholder="e.g., Premier Fixed Rate Mortgage"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Product Type</label>
        <select
          suppressHydrationWarning
          value={form.productTypeId}
          onChange={(e) => setField("productTypeId", e.target.value)}
          required
          className={inputClass}
        >
          <option value="">Select a product type...</option>
          {productTypes.map((pt) => (
            <option key={pt.id} value={pt.id}>
              {pt.name} ({pt.category})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          suppressHydrationWarning
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Brief description of the product, its features, and target audience"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Jurisdictions</label>
          <input
            suppressHydrationWarning
            value={form.jurisdictions}
            onChange={(e) => setField("jurisdictions", e.target.value)}
            required
            className={inputClass}
            placeholder="UK, EU"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Comma-separated
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Customer Type</label>
          <select
            suppressHydrationWarning
            value={form.customerType}
            onChange={(e) => setField("customerType", e.target.value)}
            required
            className={inputClass}
          >
            <option value="consumer">Consumer / Retail</option>
            <option value="sme">SME</option>
            <option value="professional">Professional</option>
            <option value="institutional">Institutional</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Distribution Channel
        </label>
        <select
          suppressHydrationWarning
          value={form.distributionChannel}
          onChange={(e) => setField("distributionChannel", e.target.value)}
          required
          className={inputClass}
        >
          <option value="direct">Direct</option>
          <option value="intermediary">Intermediary / Broker</option>
          <option value="online">Online Only</option>
          <option value="branch">Branch</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? "Creating..." : "Create Product & Generate Matrix"}
      </button>
    </form>
  );
}
