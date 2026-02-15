import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getStats() {
  const [regulations, obligations, products, unassessed] = await Promise.all([
    prisma.regulation.count(),
    prisma.obligation.count({ where: { isActive: true } }),
    prisma.product.count(),
    prisma.complianceMatrixEntry.count({
      where: { complianceStatus: "not_assessed" },
    }),
  ]);
  return { regulations, obligations, products, unassessed };
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block border border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent)] transition-colors"
    >
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="text-sm text-[var(--muted-foreground)] mt-1">{label}</p>
    </a>
  );
}

export default async function Dashboard() {
  const stats = await getStats();

  return (
    <div className="prose-column">
      <h1 className="text-2xl font-semibold tracking-tight mb-6" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
        Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Regulations"
          value={stats.regulations}
          href="/regulations"
        />
        <StatCard
          label="Active Obligations"
          value={stats.obligations}
          href="/obligations"
        />
        <StatCard label="Products" value={stats.products} href="/products" />
        <StatCard
          label="Unassessed Items"
          value={stats.unassessed}
          href="/products"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            Quick Actions
          </h2>
          <div className="flex flex-col gap-2">
            <a
              href="/products/new"
              className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium text-center hover:opacity-90"
            >
              Upload New Product
            </a>
            <a
              href="/regulations"
              className="px-4 py-2 border border-[var(--border)] rounded-md text-sm font-medium text-center hover:bg-[var(--muted)]"
            >
              Browse Regulations
            </a>
            <a
              href="/obligations"
              className="px-4 py-2 border border-[var(--border)] rounded-md text-sm font-medium text-center hover:bg-[var(--muted)]"
            >
              Search Obligations
            </a>
          </div>
        </div>

        <div className="border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
            Recent Activity
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            No recent activity yet. Upload a product to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
