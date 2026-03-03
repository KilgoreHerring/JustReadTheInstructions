import { prisma } from "@/lib/db";
import { HorizonList } from "@/components/horizon-list";
import { HandbookNoticeSpotlight } from "@/components/handbook-notice-spotlight";
import { ConsultationTimeline } from "@/components/consultation-timeline";
import { UpcomingChangesSection } from "@/components/upcoming-changes-section";
import { RecentlyImplementedSection } from "@/components/recently-implemented-section";
import { MonitoredSourcesSection } from "@/components/monitored-sources-section";
import { HORIZON_STATUSES, HORIZON_ITEM_TYPES, HORIZON_PRIORITIES } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getHorizonData() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

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
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
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
        itemType: "consultation_paper",
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
    // Feed sources
    prisma.feedSource.findMany({
      select: {
        id: true,
        name: true,
        feedType: true,
        isActive: true,
        lastPolledAt: true,
        regulator: { select: { abbreviation: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

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
  }));

  return (
    <div className="max-w-[1200px] mx-auto">
      <h1
        className="text-2xl font-semibold tracking-tight mb-6"
        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
      >
        Horizon Scanning
      </h1>

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
          items={data.allItems.map((item) => ({
            ...item,
            publishedDate: item.publishedDate?.toISOString() ?? null,
            responseDeadline: item.responseDeadline?.toISOString() ?? null,
          }))}
          regulators={data.regulators}
        />
      </div>
    </div>
  );
}
