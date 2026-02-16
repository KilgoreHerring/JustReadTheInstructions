"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/products";
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--status-non-compliant-text)]">Delete {productName}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)] rounded-md text-xs font-medium hover:opacity-80 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 border border-[var(--border)] rounded-md text-xs font-medium hover:bg-[var(--muted)]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-2 border border-[var(--border)] rounded-md text-sm text-[var(--muted-foreground)] hover:text-[var(--status-non-compliant-text)] hover:border-[var(--status-non-compliant-text)] transition-colors"
      title="Delete product"
    >
      <Trash2 size={14} />
    </button>
  );
}
