"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ContextPanelState {
  isOpen: boolean;
  isPinned: boolean;
  title: string;
  content: ReactNode | null;
  open: (title: string, content: ReactNode) => void;
  close: () => void;
  togglePin: () => void;
}

const ContextPanelContext = createContext<ContextPanelState | null>(null);

export function ContextPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ReactNode | null>(null);

  const open = useCallback((t: string, c: ReactNode) => {
    setTitle(t);
    setContent(c);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsPinned(false);
    setContent(null);
    setTitle("");
  }, []);

  const togglePin = useCallback(() => {
    setIsPinned((p) => !p);
  }, []);

  return (
    <ContextPanelContext.Provider
      value={{ isOpen, isPinned, title, content, open, close, togglePin }}
    >
      {children}
    </ContextPanelContext.Provider>
  );
}

export function useContextPanel() {
  const ctx = useContext(ContextPanelContext);
  if (!ctx) throw new Error("useContextPanel must be used within ContextPanelProvider");
  return ctx;
}
