import { prisma } from "@/lib/db";
import { HorizonList } from "@/components/horizon-list";
import { ConsultationTimeline } from "@/components/consultation-timeline";
import { UpcomingChangesSection } from "@/components/upcoming-changes-section";
import { MonitoredSourcesSection } from "@/components/monitored-sources-section";
import { HORIZON_STATUSES } from "@/lib/utils";
import { daysUntilDeadline } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getHorizonData() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    allItems,
    regulators,
    statusCounts,
    typeCounts,
    handbookNotices,
    openConsultations,
    upcomingChanges,
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
    handbookNotices,
    openConsultations,
    upcomingChanges,
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
    <div className="max-w-[1400px] mx-auto">
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

      {/* Stats row — full width */}
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

      {/* Two-column layout: main content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Left column: All Items + Monitored Sources */}
        <div>
          <HorizonList
            items={serialisedItems}
            regulators={data.regulators}
            topicCounts={data.topicCounts}
            typeCounts={typeMap}
            handbookNotices={serialisedNotices}
          />

          <div className="mt-6">
            <MonitoredSourcesSection sources={serialisedFeedSources} />
          </div>
        </div>

        {/* Right column: Consultation Timeline + Upcoming Changes */}
        <div className="space-y-6">
          <ConsultationTimeline items={serialisedConsultations} />
          <UpcomingChangesSection items={serialisedUpcoming} />
        </div>
      </div>
    </div>
  );
}
