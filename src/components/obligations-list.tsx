"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { OBLIGATION_TYPES, EVIDENCE_SCOPES } from "@/lib/utils";

interface ObligationData {
  id: string;
  summary: string;
  obligationType: string;
  addressee: string;
  extractedBy: string;
  verifiedBy: string | null;
  evidenceScope: string;
  rule: {
    reference: string;
    regulation: string;
  };
  productTypes: string[];
}

interface Props {
  byRegulation: Record<string, ObligationData[]>;
}

export default function ObligationsList({ byRegulation }: Props) {
  const entries = Object.entries(byRegulation);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const allCollapsed = entries.length > 0 && entries.every(([reg]) => collapsed[reg]);

  function toggleAll() {
    if (allCollapsed) {
      setCollapsed({});
    } else {
      setCollapsed(Object.fromEntries(entries.map(([reg]) => [reg, true])));
    }
  }

  function toggle(reg: string) {
    setCollapsed((prev) => ({ ...prev, [reg]: !prev[reg] }));
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleAll}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      {entries.map(([regulation, obs]) => {
        const isCollapsed = collapsed[regulation];
        return (
          <div key={regulation} className="mb-6">
            <button
              onClick={() => toggle(regulation)}
              className="flex items-center gap-2 w-full text-left group mb-2"
            >
              <span className="text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
              </span>
              <h2
                className="text-lg font-semibold group-hover:text-[var(--foreground)] transition-colors"
                style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
              >
                {regulation}
              </h2>
              <span className="text-sm text-[var(--muted-foreground)]">
                ({obs.length})
              </span>
            </button>

            {!isCollapsed && (
              <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
                {obs.map((ob) => {
                  const obType = OBLIGATION_TYPES[ob.obligationType as keyof typeof OBLIGATION_TYPES];
                  const scope = EVIDENCE_SCOPES[ob.evidenceScope as keyof typeof EVIDENCE_SCOPES];
                  return (
                    <div key={ob.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 mt-0.5 ${obType?.color || ""}`}>
                          {obType?.label || ob.obligationType}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {ob.summary}
                            {ob.evidenceScope !== "term_required" && scope && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium align-middle ${scope.color}`}>
                                {scope.label}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            <span style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
                              {ob.rule.reference}
                            </span>
                            {" "}&middot; {ob.addressee}
                            {ob.verifiedBy && " · Verified"}
                            {!ob.verifiedBy && ob.extractedBy === "llm" && " · Pending verification"}
                          </p>
                          {ob.productTypes.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {ob.productTypes.map((name) => (
                                <span
                                  key={name}
                                  className="text-xs px-2 py-0.5 border border-current/30 rounded-full text-[var(--muted-foreground)]"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
