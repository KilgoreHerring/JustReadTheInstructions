"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HORIZON_ITEM_TYPES,
  HORIZON_STATUSES,
  HORIZON_PRIORITIES,
  HORIZON_JURISDICTIONS,
  HORIZON_TOPIC_AREAS,
  HORIZON_CLIENT_SECTORS,
  formatDate,
  consultationUrgency,
} from "@/lib/utils";
import { ExternalLink, Plus } from "lucide-react";

interface HorizonItemRow {
  id: string;
  title: string;
  itemType: string;
  status: string;
  priority: string;
  referenceNumber: string | null;
  publishedDate: string | null;
  responseDeadline: string | null;
  sourceUrl: string | null;
  jurisdictions: string[];
  topicAreas: string[];
  clientSectorRelevance: string[];
  requiresFirmResponse: boolean;
  regulator: { id: string; name: string; abbreviation: string } | null;
  _count: { regulationLinks: number; obligationLinks: number };
}

interface Props {
  items: HorizonItemRow[];
  regulators: { id: string; name: string; abbreviation: string }[];
}

const inputClass =
  "border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)]";

export function HorizonList({ items: initialItems, regulators }: Props) {
  const [items] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [regulatorFilter, setRegulatorFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [responseFilter, setResponseFilter] = useState(false);

  const filtered = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesType = typeFilter === "all" || item.itemType === typeFilter;
    const matchesRegulator = regulatorFilter === "all" || item.regulator?.id === regulatorFilter;
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
    const matchesJurisdiction = jurisdictionFilter === "all" || item.jurisdictions?.includes(jurisdictionFilter);
    const matchesTopic = topicFilter === "all" || item.topicAreas?.includes(topicFilter);
    const matchesSector = sectorFilter === "all" || item.clientSectorRelevance?.includes(sectorFilter);
    const matchesResponse = !responseFilter || item.requiresFirmResponse;
    return matchesSearch && matchesStatus && matchesType && matchesRegulator
      && matchesPriority && matchesJurisdiction && matchesTopic && matchesSector && matchesResponse;
  });

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} flex-1 min-w-[200px]`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="all">All statuses</option>
          {Object.entries(HORIZON_STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
          <option value="all">All types</option>
          {Object.entries(HORIZON_ITEM_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={regulatorFilter} onChange={(e) => setRegulatorFilter(e.target.value)} className={inputClass}>
          <option value="all">All regulators</option>
          {regulators.map((r) => (
            <option key={r.id} value={r.id}>{r.abbreviation}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={inputClass}>
          <option value="all">All priorities</option>
          {Object.entries(HORIZON_PRIORITIES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={jurisdictionFilter} onChange={(e) => setJurisdictionFilter(e.target.value)} className={inputClass}>
          <option value="all">All jurisdictions</option>
          {Object.entries(HORIZON_JURISDICTIONS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className={inputClass}>
          <option value="all">All topics</option>
          {Object.entries(HORIZON_TOPIC_AREAS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className={inputClass}>
          <option value="all">All sectors</option>
          {Object.entries(HORIZON_CLIENT_SECTORS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={responseFilter}
            onChange={(e) => setResponseFilter(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Response required
        </label>
        <div className="flex-1" />
        <Link
          href="/horizon/new"
          className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus size={14} />
          Add Item
        </Link>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] mb-4">
        {filtered.length} item{filtered.length !== 1 ? "s" : ""} shown ({items.length} total)
      </p>

      {/* Item list */}
      {filtered.length === 0 ? (
        <div className="border border-[var(--border)] rounded-lg p-8 text-center text-sm text-[var(--muted-foreground)]">
          No horizon items found matching your filters.
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
          {filtered.map((item) => {
            const typeInfo = HORIZON_ITEM_TYPES[item.itemType as keyof typeof HORIZON_ITEM_TYPES];
            const statusInfo = HORIZON_STATUSES[item.status as keyof typeof HORIZON_STATUSES];
            const priorityInfo = HORIZON_PRIORITIES[item.priority as keyof typeof HORIZON_PRIORITIES];
            const urgency = item.status === "consultation" ? consultationUrgency(item.responseDeadline) : null;

            return (
              <Link
                key={item.id}
                href={`/horizon/${item.id}`}
                className="block px-4 py-3 hover:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {typeInfo && (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      )}
                      {item.referenceNumber && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--citation-bg)] text-[var(--muted-foreground)]"
                          style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
                        >
                          {item.referenceNumber}
                        </span>
                      )}
                      {item.regulator && (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {item.regulator.abbreviation}
                        </span>
                      )}
                      {priorityInfo && item.priority !== "medium" && (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                      )}
                      {item.jurisdictions?.length > 0 && (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {item.jurisdictions.join(", ")}
                        </span>
                      )}
                      {item.topicAreas?.slice(0, 2).map((topic) => {
                        const topicInfo = HORIZON_TOPIC_AREAS[topic as keyof typeof HORIZON_TOPIC_AREAS];
                        return topicInfo ? (
                          <span key={topic} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--muted)] text-[var(--muted-foreground)]">
                            {topicInfo.shortLabel}
                          </span>
                        ) : null;
                      })}
                      {item.requiresFirmResponse && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]">
                          Response required
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-medium leading-snug">{item.title}</p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--muted-foreground)] flex-wrap">
                      {item.publishedDate && (
                        <span>Published {formatDate(item.publishedDate)}</span>
                      )}
                      {item.responseDeadline && (
                        <span
                          className={
                            urgency === "closed"
                              ? "text-[var(--status-non-compliant-text)] font-medium"
                              : urgency === "critical"
                              ? "text-[var(--status-non-compliant-text)] font-medium"
                              : urgency === "urgent"
                              ? "text-[var(--status-non-compliant-text)]"
                              : urgency === "approaching"
                              ? "text-[var(--status-in-progress-text)]"
                              : ""
                          }
                        >
                          {urgency === "closed" ? "Overdue — " : "Deadline "}
                          {formatDate(item.responseDeadline)}
                        </span>
                      )}
                      {(item._count.regulationLinks > 0 || item._count.obligationLinks > 0) && (
                        <span>
                          {item._count.regulationLinks} reg{item._count.regulationLinks !== 1 ? "s" : ""}
                          {item._count.obligationLinks > 0 && (
                            <>, {item._count.obligationLinks} obligation{item._count.obligationLinks !== 1 ? "s" : ""}</>
                          )}
                        </span>
                      )}
                      {item.sourceUrl && (
                        <ExternalLink size={11} className="inline" />
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {statusInfo && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
