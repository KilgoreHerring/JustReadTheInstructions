import { prisma } from "./db";

export interface MatchedObligation {
  obligationId: string;
  summary: string;
  obligationType: string;
  addressee: string;
  actionText: string;
  regulationTitle: string;
  sectionNumber: string;
  ruleReference: string;
  relevanceScore: number;
  rationale: string | null;
  hasClauseTemplate: boolean;
  evidenceScope: string;
}

export async function getApplicableObligations(
  productId: string
): Promise<MatchedObligation[]> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { productType: true },
  });

  // Get all obligations mapped to this product type
  const applicability = await prisma.obligationProductApplicability.findMany({
    where: {
      productTypeId: product.productTypeId,
      obligation: { isActive: true },
    },
    include: {
      obligation: {
        include: {
          rule: {
            include: {
              section: {
                include: {
                  regulation: true,
                },
              },
            },
          },
          clauseTemplates: { select: { id: true }, take: 1 },
        },
      },
    },
    orderBy: { relevanceScore: "desc" },
  });

  return applicability.map((a) => ({
    obligationId: a.obligation.id,
    summary: a.obligation.summary,
    obligationType: a.obligation.obligationType,
    addressee: a.obligation.addressee,
    actionText: a.obligation.actionText,
    regulationTitle: a.obligation.rule.section.regulation.title,
    sectionNumber: a.obligation.rule.section.number,
    ruleReference: a.obligation.rule.reference,
    relevanceScore: a.relevanceScore,
    rationale: a.rationale,
    hasClauseTemplate: a.obligation.clauseTemplates.length > 0,
    evidenceScope: a.obligation.evidenceScope,
  }));
}

export async function generateComplianceMatrix(productId: string) {
  const obligations = await getApplicableObligations(productId);

  // Check which obligations already have matrix entries
  const existingEntries = await prisma.complianceMatrixEntry.findMany({
    where: { productId },
    select: { obligationId: true },
  });
  const existingIds = new Set(existingEntries.map((e) => e.obligationId));

  // Create matrix entries for new obligations
  const newObligations = obligations.filter(
    (o) => !existingIds.has(o.obligationId)
  );

  if (newObligations.length > 0) {
    await prisma.complianceMatrixEntry.createMany({
      data: newObligations.map((o) => ({
        productId,
        obligationId: o.obligationId,
        complianceStatus: "not_assessed",
      })),
      skipDuplicates: true,
    });
  }

  // Return full matrix
  const matrix = await prisma.complianceMatrixEntry.findMany({
    where: { productId },
    include: {
      product: true,
      obligation: {
        include: {
          rule: {
            include: {
              section: {
                include: { regulation: true },
              },
            },
          },
          clauseTemplates: true,
        },
      },
    },
    orderBy: [
      { obligation: { rule: { section: { regulation: { title: "asc" } } } } },
      { obligation: { rule: { section: { number: "asc" } } } },
    ],
  });

  return matrix;
}

export async function updateMatrixEntry(
  entryId: string,
  data: {
    complianceStatus?: string;
    owner?: string;
    evidence?: string;
    notes?: string;
  }
) {
  return prisma.complianceMatrixEntry.update({
    where: { id: entryId },
    data: {
      ...data,
      reviewedAt: new Date(),
    },
  });
}
