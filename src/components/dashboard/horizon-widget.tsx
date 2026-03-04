import { Telescope, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { HORIZON_ITEM_TYPES, HORIZON_PRIORITIES, formatDate } from "@/lib/utils";

interface HorizonWidgetItem {
  id: string;
  title: string;
  itemType: string;
  priority: string;
  referenceNumber: string | null;
  responseDeadline: string | null;
}

interface Props {
  openCount: number;
  deadlineCount: number;
  responseRequiredCount: number;
  topItems: HorizonWidgetItem[];
}

export function HorizonWidget({ openCount, deadlineCount, responseRequiredCount, topItems }: Props) {
  return (
    <div className="border border-[var(--border)] rounded-lg flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Telescope size={16} className="text-[var(--accent)]" />
          <h2
            className="text-base font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Horizon Scanning
          </h2>
        </div>
        <a href="/horizon" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
          View all <ArrowRight size={12} />
        </a>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)]">
        <div>
          <p className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            {openCount}
          </p>
          <p className="text-[11px] text-[var(--muted-foreground)]">Open items</p>
        </div>
        {deadlineCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-[var(--status-in-progress-text)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--status-in-progress-text)]">
                {deadlineCount}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Deadline{deadlineCount !== 1 ? "s" : ""} in 30 days
              </p>
            </div>
          </div>
        )}
        {responseRequiredCount > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-[var(--status-non-compliant-text)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--status-non-compliant-text)]">
                {responseRequiredCount}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Response{responseRequiredCount !== 1 ? "s" : ""} required
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top items */}
      {topItems.length === 0 ? (
        <div className="p-4 text-center flex-1 flex items-center justify-center">
          <p className="text-xs text-[var(--muted-foreground)]">
            No open horizon items.{" "}
            <a href="/horizon/new" className="text-[var(--accent)] hover:underline">Add one</a>
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)] flex-1">
          {topItems.map((item) => {
            const typeInfo = HORIZON_ITEM_TYPES[item.itemType as keyof typeof HORIZON_ITEM_TYPES];
            const priorityInfo = HORIZON_PRIORITIES[item.priority as keyof typeof HORIZON_PRIORITIES];
            return (
              <a
                key={item.id}
                href={`/horizon/${item.id}`}
                className="block px-4 py-2.5 hover:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {typeInfo && (
                    <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  )}
                  {item.priority === "high" && priorityInfo && (
                    <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${priorityInfo.color}`}>
                      High
                    </span>
                  )}
                  {item.referenceNumber && (
                    <span className="text-[10px] text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono)" }}>
                      {item.referenceNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-snug truncate">{item.title}</p>
                {item.responseDeadline && (
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                    Deadline: {formatDate(item.responseDeadline)}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
