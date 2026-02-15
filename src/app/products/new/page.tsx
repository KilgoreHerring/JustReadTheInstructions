import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const productTypes = await prisma.productType.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="prose-column">
      <h1 className="text-2xl font-semibold tracking-tight mb-2" style={{ fontFamily: "var(--font-heading), Georgia, serif" }}>
        Upload New Product
      </h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-8">
        Enter your product details to generate a regulatory compliance matrix.
      </p>
      <ProductForm productTypes={productTypes} />
    </div>
  );
}
