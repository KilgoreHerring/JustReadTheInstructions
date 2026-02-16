import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { BulkAnalyseButton } from "@/components/bulk-analyse-button";
import { resolveOutstandingBatches } from "@/lib/batch-analyser";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await resolveOutstandingBatches();

  const products = await prisma.product.findMany({
    include: {
      productType: true,
      matrixEntries: { select: { complianceStatus: true } },
      documents: { select: { id: true, documentType: true }, where: { documentType: "terms_and_conditions" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const productsWithDocs = products.filter((p) => p.documents.length > 0);

  return (
    <div className="prose-column">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
          Products
        </h1>
        <div className="flex items-center gap-3">
          <BulkAnalyseButton
            productIds={productsWithDocs.map((p) => p.id)}
            documentCount={productsWithDocs.length}
          />
          <a
            href="/products/new"
            className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-sm font-medium hover:opacity-90"
          >
            Upload Product
          </a>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="border border-[var(--border)] rounded-lg p-12 text-center">
          <p className="text-[var(--muted-foreground)]">
            No products yet. Upload a product to generate a compliance matrix.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Product</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Type</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">
                  Jurisdictions
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">
                  Compliance
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Created</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const total = p.matrixEntries.length;
                const compliant = p.matrixEntries.filter(
                  (e) => e.complianceStatus === "compliant"
                ).length;
                return (
                  <tr key={p.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      <a
                        href={`/products/${p.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {p.name}
                      </a>
                    </td>
                    <td className="px-4 py-3">{p.productType.name}</td>
                    <td className="px-4 py-3">{p.jurisdictions.join(", ")}</td>
                    <td className="px-4 py-3 capitalize">{p.customerType}</td>
                    <td className="px-4 py-3">
                      {total > 0 ? (
                        <span className="text-xs">
                          {compliant}/{total} compliant
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          Not generated
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
