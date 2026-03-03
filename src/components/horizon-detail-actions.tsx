"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HORIZON_STATUSES } from "@/lib/utils";

interface Props {
  itemId: string;
  currentStatus: string;
  aiClassified: boolean;
}

export function HorizonDetailActions({ itemId, currentStatus, aiClassified }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [classifying, setClassifying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    await fetch(`/api/horizon/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function handleClassify() {
    setClassifying(true);
    try {
      const res = await fetch(`/api/horizon/${itemId}/classify`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setClassifying(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this horizon item? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/horizon/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/horizon");
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        className={`text-xs rounded-full px-2.5 py-1 border-0 font-medium cursor-pointer ${
          HORIZON_STATUSES[status as keyof typeof HORIZON_STATUSES]?.color || ""
        }`}
      >
        {Object.entries(HORIZON_STATUSES).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>

      <button
        onClick={handleClassify}
        disabled={classifying}
        className="px-3 py-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50"
      >
        {classifying ? "Classifying..." : aiClassified ? "Re-classify" : "Classify with AI"}
      </button>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 border border-[var(--border)] rounded-md text-xs text-[var(--status-non-compliant-text)] hover:bg-[var(--status-non-compliant-bg)] disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
