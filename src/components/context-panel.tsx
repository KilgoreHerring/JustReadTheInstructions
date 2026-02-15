"use client";

import { useContextPanel } from "./context-panel-provider";
import { X, Pin, PinOff } from "lucide-react";
import { useEffect, useCallback } from "react";

export function ContextPanel() {
  const { isOpen, isPinned, title, content, close, togglePin } = useContextPanel();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPinned) close();
    },
    [isOpen, isPinned, close]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for narrow viewports (drawer mode) */}
      <div
        className="fixed inset-0 bg-black/20 z-40 xl:hidden"
        onClick={() => {
          if (!isPinned) close();
        }}
      />

      <aside
        className={`
          fixed right-0 top-0 h-full z-50
          xl:relative xl:z-auto
          w-[360px] shrink-0 border-l border-[var(--border)]
          bg-[var(--background)] overflow-y-auto
          shadow-lg xl:shadow-none
          transition-transform duration-200 ease-out
        `}
      >
        <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-10">
          <h3
            className="text-sm font-semibold text-[var(--foreground)] truncate"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            {title}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={togglePin}
              className="p-1.5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
              title={isPinned ? "Unpin panel" : "Pin panel open"}
            >
              {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            <button
              onClick={() => {
                // Force close even if pinned when clicking X
                close();
              }}
              className="p-1.5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
              title="Close panel"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="p-4 text-sm leading-relaxed">{content}</div>
      </aside>
    </>
  );
}
