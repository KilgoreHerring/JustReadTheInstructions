"use client";

import { useState } from "react";
import { X, Plus, Search } from "lucide-react";

interface RegulationLink {
  id: string;
  regulationId: string;
  confidence: number | null;
  source: string;
  regulation: { id: string; title: string; citation: string };
}

interface ObligationLink {
  id: string;
  obligationId: string;
  impactType: string;
  confidence: number | null;
  source: string;
  obligation: {
    id: string;
    summary: string;
    obligationType: string;
    rule: {
      reference: string;
      section: {
        number: string;
        title: string;
        regulation: { id: string; title: string };
      };
    };
  };
}

interface Regulation {
  id: string;
  title: string;
  citation: string;
}

interface Obligation {
  id: string;
  summary: string;
  rule: { reference: string };
}

interface Props {
  horizonItemId: string;
  regulationLinks: RegulationLink[];
  obligationLinks: ObligationLink[];
  allRegulations: Regulation[];
}

const IMPACT_TYPES: Record<string, string> = {
  amendment: "Amendment",
  new_requirement: "New Requirement",
  repeal: "Repeal",
  clarification: "Clarification",
  unknown: "Unknown",
};

export function HorizonLinkManager({
  horizonItemId,
  regulationLinks: initialRegLinks,
  obligationLinks: initialObLinks,
  allRegulations,
}: Props) {
  const [regLinks, setRegLinks] = useState(initialRegLinks);
  const [obLinks, setObLinks] = useState(initialObLinks);
  const [showRegSearch, setShowRegSearch] = useState(false);
  const [regSearch, setRegSearch] = useState("");
  const [showObSearch, setShowObSearch] = useState(false);
  const [obSearch, setObSearch] = useState("");
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);
  const [selectedRegForObs, setSelectedRegForObs] = useState<string | null>(null);

  const linkedRegIds = new Set(regLinks.map((l) => l.regulationId));
  const linkedObIds = new Set(obLinks.map((l) => l.obligationId));

  const filteredRegs = allRegulations.filter(
    (r) =>
      !linkedRegIds.has(r.id) &&
      (r.title.toLowerCase().includes(regSearch.toLowerCase()) ||
        r.citation.toLowerCase().includes(regSearch.toLowerCase()))
  );

  async function addRegulationLink(regulationId: string) {
    const res = await fetch(`/api/horizon/${horizonItemId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "regulation", regulationId }),
    });
    if (res.ok) {
      const link = await res.json();
      setRegLinks((prev) => [...prev, link]);
      setShowRegSearch(false);
      setRegSearch("");
    }
  }

  async function removeRegulationLink(linkId: string) {
    const res = await fetch(
      `/api/horizon/${horizonItemId}/links?type=regulation&linkId=${linkId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setRegLinks((prev) => prev.filter((l) => l.id !== linkId));
    }
  }

  async function loadObligations(regulationId: string) {
    setLoadingObs(true);
    setSelectedRegForObs(regulationId);
    try {
      const res = await fetch(`/api/regulations/${regulationId}/obligations`);
      if (res.ok) {
        const data = await res.json();
        setObligations(data);
      }
    } finally {
      setLoadingObs(false);
    }
  }

  async function addObligationLink(obligationId: string) {
    const res = await fetch(`/api/horizon/${horizonItemId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "obligation", obligationId }),
    });
    if (res.ok) {
      const link = await res.json();
      setObLinks((prev) => [...prev, link]);
    }
  }

  async function removeObligationLink(linkId: string) {
    const res = await fetch(
      `/api/horizon/${horizonItemId}/links?type=obligation&linkId=${linkId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setObLinks((prev) => prev.filter((l) => l.id !== linkId));
    }
  }

  return (
    <div className="space-y-6">
      {/* Linked Regulations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Linked Regulations ({regLinks.length})
          </h3>
          <button
            onClick={() => setShowRegSearch(!showRegSearch)}
            className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Link Regulation
          </button>
        </div>

        {showRegSearch && (
          <div className="mb-3 border border-[var(--border)] rounded-md p-3 bg-[var(--muted)]">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={regSearch}
                onChange={(e) => setRegSearch(e.target.value)}
                placeholder="Search regulations..."
                className="w-full border border-[var(--border)] rounded-md pl-8 pr-3 py-2 text-sm bg-[var(--background)]"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredRegs.slice(0, 10).map((r) => (
                <button
                  key={r.id}
                  onClick={() => addRegulationLink(r.id)}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-[var(--background)] transition-colors"
                >
                  <span className="font-medium">{r.citation}</span>
                  <span className="text-[var(--muted-foreground)]"> — {r.title}</span>
                </button>
              ))}
              {filteredRegs.length === 0 && (
                <p className="text-xs text-[var(--muted-foreground)] px-2 py-1">No matching regulations</p>
              )}
            </div>
          </div>
        )}

        {regLinks.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">No regulations linked yet.</p>
        ) : (
          <div className="space-y-2">
            {regLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--citation-bg)] text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono)" }}>
                    {link.regulation.citation}
                  </span>
                  <span className="text-sm truncate">{link.regulation.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                    {link.source}
                  </span>
                  {link.confidence !== null && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {Math.round(link.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => loadObligations(link.regulationId)}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Link obligations
                  </button>
                  <button
                    onClick={() => removeRegulationLink(link.id)}
                    className="text-[var(--muted-foreground)] hover:text-[var(--status-non-compliant-text)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Obligation picker (shown when a regulation is selected) */}
      {selectedRegForObs && (
        <div className="border border-[var(--border)] rounded-md p-3 bg-[var(--muted)]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold">
              Select obligations to link
            </h4>
            <button
              onClick={() => { setSelectedRegForObs(null); setObligations([]); setObSearch(""); }}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={obSearch}
            onChange={(e) => setObSearch(e.target.value)}
            placeholder="Filter obligations..."
            className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm bg-[var(--background)] mb-2"
          />
          {loadingObs ? (
            <p className="text-xs text-[var(--muted-foreground)]">Loading...</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {obligations
                .filter(
                  (o) =>
                    !linkedObIds.has(o.id) &&
                    (!obSearch || o.summary.toLowerCase().includes(obSearch.toLowerCase()) || o.rule.reference.toLowerCase().includes(obSearch.toLowerCase()))
                )
                .slice(0, 20)
                .map((o) => (
                  <button
                    key={o.id}
                    onClick={() => addObligationLink(o.id)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-[var(--background)] transition-colors"
                  >
                    <span className="font-medium" style={{ fontFamily: "var(--font-mono)" }}>{o.rule.reference}</span>
                    <span className="text-[var(--muted-foreground)]"> — {o.summary.slice(0, 120)}{o.summary.length > 120 ? "..." : ""}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Linked Obligations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Linked Obligations ({obLinks.length})
          </h3>
          {!showObSearch && regLinks.length > 0 && (
            <button
              onClick={() => setShowObSearch(true)}
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Link Obligation
            </button>
          )}
        </div>

        {showObSearch && (
          <div className="mb-3 text-xs text-[var(--muted-foreground)]">
            Select a linked regulation above and click &quot;Link obligations&quot; to browse its obligations.
            <button onClick={() => setShowObSearch(false)} className="ml-2 text-[var(--accent)] hover:underline">Hide</button>
          </div>
        )}

        {obLinks.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">No obligations linked yet.</p>
        ) : (
          <div className="space-y-2">
            {obLinks.map((link) => (
              <div
                key={link.id}
                className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--citation-bg)] text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono)" }}>
                        {link.obligation.rule.reference}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {IMPACT_TYPES[link.impactType] || link.impactType}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {link.source}
                      </span>
                      {link.confidence !== null && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {Math.round(link.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {link.obligation.summary.slice(0, 200)}{link.obligation.summary.length > 200 ? "..." : ""}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      {link.obligation.rule.section.regulation.title} &bull; {link.obligation.rule.section.title}
                    </p>
                  </div>
                  <button
                    onClick={() => removeObligationLink(link.id)}
                    className="text-[var(--muted-foreground)] hover:text-[var(--status-non-compliant-text)] shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
