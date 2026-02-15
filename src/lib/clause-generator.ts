import { prisma } from "./db";
import { askClaudeJSON } from "./claude";

interface GeneratedClause {
  obligationId: string;
  title: string;
  clauseText: string;
  guidance: string;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an expert financial services regulatory lawyer specializing in UK FCA regulation.
Your role is to draft Terms & Conditions clauses that satisfy specific regulatory obligations.

When generating clauses:
- Use precise, legally sound language appropriate for consumer-facing banking T&Cs
- Reference the specific regulatory obligation the clause satisfies
- Keep clauses concise but comprehensive
- Use plain English where possible (Consumer Duty requires consumer understanding)
- Include any mandatory disclosure wording required by the regulation
- Flag where firm-specific details need to be inserted with [BRACKETS]

Respond with a JSON array of clause objects.`;

export async function generateClausesForProduct(
  productId: string,
  obligationIds?: string[]
): Promise<GeneratedClause[]> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { productType: true },
  });

  // Get obligations that need clauses
  const where = obligationIds
    ? { id: { in: obligationIds } }
    : {
        productApplicability: {
          some: { productTypeId: product.productTypeId },
        },
        isActive: true,
      };

  const allObligations = await prisma.obligation.findMany({
    where,
    include: {
      rule: {
        include: {
          section: { include: { regulation: true } },
        },
      },
      clauseTemplates: true,
    },
  });

  // Principles are general standards — no T&C clause can address them
  const obligations = allObligations.filter((o) => o.obligationType !== "principle");

  // Check for existing templates first
  const withTemplates: GeneratedClause[] = [];
  const needsGeneration: typeof obligations = [];

  for (const ob of obligations) {
    if (ob.clauseTemplates.length > 0) {
      const t = ob.clauseTemplates[0];
      withTemplates.push({
        obligationId: ob.id,
        title: t.title,
        clauseText: t.templateText,
        guidance: t.guidance || "",
        confidence: 1.0,
      });
    } else {
      needsGeneration.push(ob);
    }
  }

  // Generate clauses for obligations without templates
  if (needsGeneration.length === 0) return withTemplates;

  const obligationDescriptions = needsGeneration.map((ob) => ({
    id: ob.id,
    regulation: ob.rule.section.regulation.title,
    reference: ob.rule.reference,
    type: ob.obligationType,
    summary: ob.summary,
    actionRequired: ob.actionText,
    condition: ob.conditionText,
  }));

  const userMessage = `Generate T&C clauses for a ${product.productType.name} product (${product.name}) aimed at ${product.customerType} customers, distributed via ${product.distributionChannel} channel, offered in ${product.jurisdictions.join(", ")}.

The following regulatory obligations need to be addressed in the product's Terms & Conditions:

${JSON.stringify(obligationDescriptions, null, 2)}

For each obligation, generate a clause with:
- "obligationId": the obligation id
- "title": short clause title
- "clauseText": the actual T&C wording
- "guidance": explanation of why this clause is needed and what it achieves
- "confidence": 0.0-1.0 how confident you are this clause adequately addresses the obligation`;

  const generated = await askClaudeJSON<GeneratedClause[]>(
    SYSTEM_PROMPT,
    userMessage
  );

  return [...withTemplates, ...generated];
}
