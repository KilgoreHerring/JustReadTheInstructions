import { prisma } from "@/lib/db";
import { HorizonList } from "@/components/horizon-list";
import { HandbookNoticeSpotlight } from "@/components/handbook-notice-spotlight";
import { ConsultationTimeline } from "@/components/consultation-timeline";
import { UpcomingChangesSection } from "@/components/upcoming-changes-section";
import { RecentlyImplementedSection } from "@/components/recently-implemented-section";
import { MonitoredSourcesSection } from "@/components/monitored-sources-section";
import { HORIZON_STATUSES, HORIZON_ITEM_TYPES, HORIZON_PRIORITIES, HORIZON_TOPIC_AREAS } from "@/lib/utils";
import { daysUntilDeadline, formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getHorizonData() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    allItems,
    regulators,
    statusCounts,
    typeCounts,
    upcomingDeadlines,
    handbookNotices,
    openConsultations,
    upcomingChanges,
    recentlyImplemented,
    feedSources,
    urgentConsultations,
  ] = await Promise.all([
    // All top-level items (for the flat list)
    prisma.horizonItem.findMany({
      where: { parentId: null },
      include: {
        regulator: { select: { id: true, name: true, abbreviation: true } },
        _count: { select: { regulationLinks: true, obligationLinks: true } },
      },
      orderBy: { publishedDate: "desc" },
    }),
    prisma.regulator.findMany({
      select: { id: true, name: true, abbreviation: true },
      orderBy: { abbreviation: "asc" },
    }),
    // Status counts (top-level only)
    prisma.horizonItem.groupBy({
      by: ["status"],
      where: { parentId: null },
      _count: { id: true },
    }),
    prisma.horizonItem.groupBy({
      by: ["itemType"],
      where: { status: { in: ["consultation", "proposed_change", "pending_change"] }, parentId: null },
      _count: { id: true },
    }),
    prisma.horizonItem.count({
      where: {
        parentId: null,
        status: "consultation",
        responseDeadline: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
    }),
    // Handbook notices (parent items with children)
    prisma.horizonItem.findMany({
      where: {
        parentId: null,
        handbookNoticeNumber: { not: null },
      },
      include: {
        regulator: { select: { id: true, name: true, abbreviation: true } },
        children: {
          select: {
            id: true,
            title: true,
            summary: true,
            effectiveDate: true,
            status: true,
            referenceNumber: true,
            aiClassification: true,
          },
          orderBy: { effectiveDate: "asc" },
        },
      },
      orderBy: { handbookNoticeNumber: "desc" },
    }),
    // Open consultations
    prisma.horizonItem.findMany({
      where: {
        parentId: null,
        itemType: { in: ["consultation_paper", "discussion_paper"] },
        status: "consultation",
      },
      select: {
        id: true,
        title: true,
        referenceNumber: true,
        responseDeadline: true,
        regulator: { select: { abbreviation: true } },
      },
      orderBy: { responseDeadline: "asc" },
    }),
    // Upcoming changes (effective date in the future, active lifecycle statuses)
    prisma.horizonItem.findMany({
      where: {
        effectiveDate: { gt: now },
        status: { in: ["consultation", "proposed_change", "pending_change"] },
      },
      select: {
        id: true,
        title: true,
        effectiveDate: true,
        status: true,
        regulator: { select: { abbreviation: true } },
        parent: { select: { id: true, title: true, handbookNoticeNumber: true } },
      },
      orderBy: { effectiveDate: "asc" },
      take: 20,
    }),
    // Recently implemented (last 3 months, top-level only)
    prisma.horizonItem.findMany({
      where: {
        parentId: null,
        status: "completed",
        updatedAt: { gte: threeMonthsAgo },
      },
      select: {
        id: true,
        title: true,
        effectiveDate: true,
        regulator: { select: { abbreviation: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    // Feed sources with regulator sourceType
    prisma.feedSource.findMany({
      select: {
        id: true,
        name: true,
        feedType: true,
        isActive: true,
        lastPolledAt: true,
        lastErrorAt: true,
        lastError: true,
        regulator: { select: { abbreviation: true, sourceType: true } },
      },
      orderBy: { name: "asc" },
    }),
    // Urgent consultations (deadlines within 30 days)
    prisma.horizonItem.findMany({
      where: {
        parentId: null,
        status: "consultation",
        responseDeadline: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      select: {
        id: true,
        title: true,
        referenceNumber: true,
        responseDeadline: true,
        regulator: { select: { abbreviation: true } },
      },
      orderBy: { responseDeadline: "asc" },
    }),
  ]);

  // Topic area counts via application-level aggregation
  const topicCounts: Record<string, number> = {};
  for (const item of allItems) {
    if (item.status === "completed" || item.status === "withdrawn") continue;
    for (const topic of (item.topicAreas || [])) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  return {
    allItems,
    regulators,
    statusCounts,
    typeCounts,
    upcomingDeadlines,
    handbookNotices,
    openConsultations,
    upcomingChanges,
    recentlyImplemented,
    feedSources,
    urgentConsultations,
    topicCounts,
  };
}

export default async function HorizonScanningPage() {
  const data = await getHorizonData();

  const statusMap = Object.fromEntries(
    data.statusCounts.map((s) => [s.status, s._count.id])
  );
  const typeMap = Object.fromEntries(
    data.typeCounts.map((t) => [t.itemType, t._count.id])
  );

  // Serialise dates for client components
  const serialisedNotices = data.handbookNotices.map((n) => ({
    id: n.id,
    title: n.title,
    summary: n.summary,
    publishedDate: n.publishedDate?.toISOString() ?? null,
    sourceUrl: n.sourceUrl,
    handbookNoticeNumber: n.handbookNoticeNumber,
    children: n.children.map((c) => ({
      ...c,
      effectiveDate: c.effectiveDate?.toISOString() ?? null,
    })),
  }));

  const serialisedConsultations = data.openConsultations.map((c) => ({
    ...c,
    responseDeadline: c.responseDeadline?.toISOString() ?? null,
  }));

  const serialisedUpcoming = data.upcomingChanges.map((u) => ({
    ...u,
    effectiveDate: u.effectiveDate?.toISOString() ?? null,
  }));

  const serialisedImplemented = data.recentlyImplemented.map((r) => ({
    ...r,
    effectiveDate: r.effectiveDate?.toISOString() ?? null,
  }));

  const serialisedFeedSources = data.feedSources.map((f) => ({
    ...f,
    lastPolledAt: f.lastPolledAt?.toISOString() ?? null,
    lastErrorAt: f.lastErrorAt?.toISOString() ?? null,
  }));

  const serialisedItems = data.allItems.map((item) => ({
    ...item,
    publishedDate: item.publishedDate?.toISOString() ?? null,
    responseDeadline: item.responseDeadline?.toISOString() ?? null,
  }));

  return (
    <div className="max-w-[1200px] mx-auto">
      <h1
        className="text-2xl font-semibold tracking-tight mb-6"
        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
      >
        Horizon Scanning
      </h1>

      {/* Urgent consultations banner */}
      {data.urgentConsultations.length > 0 && (
        <div className="mb-6 border border-[var(--status-non-compliant-bg)] rounded-lg bg-[var(--status-non-compliant-bg)]/10 p-4">
          <h2 className="text-sm font-semibold text-[var(--status-non-compliant-text)] mb-2">
            Consultations closing within 30 days ({data.urgentConsultations.length})
          </h2>
          <div className="space-y-1.5">
            {data.urgentConsultations.map((item) => {
              const days = item.responseDeadline ? daysUntilDeadline(item.responseDeadline.toISOString()) : null;
              return (
                <Link
                  key={item.id}
                  href={`/horizon/${item.id}`}
                  className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                >
                  {item.referenceNumber && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)]" style={{ fontFamily: "var(--font-mono)" }}>
                      {item.referenceNumber}
                    </span>
                  )}
                  <span className="truncate">{item.title}</span>
                  {days !== null && (
                    <span className={`shrink-0 text-xs font-medium ${days <= 7 ? "text-[var(--status-non-compliant-text)]" : "text-[var(--status-in-progress-text)]"}`}>
                      {days} day{days !== 1 ? "s" : ""}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(HORIZON_STATUSES).map(([key, meta]) => (
          <div
            key={key}
            className="border border-[var(--border)] rounded-lg px-4 py-3"
          >
            <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              {statusMap[key] || 0}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.color} mr-1`}>
                {meta.label}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Type breakdown for open items + deadline count */}
      {data.allItems.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {Object.entries(HORIZON_ITEM_TYPES).map(([key, meta]) => {
            const count = typeMap[key] || 0;
            if (count === 0) return null;
            return (
              <span key={key} className={`px-2 py-1 rounded text-xs font-medium ${meta.color}`}>
                {count} {meta.label}{count !== 1 ? "s" : ""}
              </span>
            );
          })}
          {data.upcomingDeadlines > 0 && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${HORIZON_PRIORITIES.high.color}`}>
              {data.upcomingDeadlines} deadline{data.upcomingDeadlines !== 1 ? "s" : ""} in next 30 days
            </span>
          )}
        </div>
      )}

      {/* Topic area activity breakdown */}
      {Object.keys(data.topicCounts).length > 0 && (
        <div className="mb-6 border border-[var(--border)] rounded-lg p-4">
          <h2
            className="text-sm font-semibold tracking-wide uppercase mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Active Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.topicCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => {
                const topicInfo = HORIZON_TOPIC_AREAS[key as keyof typeof HORIZON_TOPIC_AREAS];
                if (!topicInfo) return null;
                return (
                  <span
                    key={key}
                    className="px-2 py-1 rounded text-xs bg-[var(--muted)] text-[var(--foreground)]"
                  >
                    {topicInfo.label} <span className="font-semibold">{count}</span>
                  </span>
                );
              })}
          </div>
        </div>
      )}

      {/* Handbook Notice Spotlight */}
      <div className="mb-6">
        <HandbookNoticeSpotlight notices={serialisedNotices} />
      </div>

      {/* Monitored Sources */}
      <div className="mb-6">
        <MonitoredSourcesSection sources={serialisedFeedSources} />
      </div>

      {/* Two-column: Consultations Timeline + Upcoming Changes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ConsultationTimeline items={serialisedConsultations} />
        <UpcomingChangesSection items={serialisedUpcoming} />
      </div>

      {/* Recently Implemented */}
      <div className="mb-8">
        <RecentlyImplementedSection items={serialisedImplemented} />
      </div>

      {/* All Items — full filterable list */}
      <div className="border-t border-[var(--border)] pt-6">
        <h2
          className="text-lg font-semibold tracking-tight mb-4"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          All Items
        </h2>
        <HorizonList
          items={serialisedItems}
          regulators={data.regulators}
        />
      </div>
    </div>
  );
}
