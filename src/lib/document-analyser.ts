import { prisma } from "./db";
import { askClaudeJSON } from "./claude";
import { getApplicableObligations, generateComplianceMatrix } from "./matching-engine";

// --- Types ---

export interface ObligationFinding {
  obligationId: string;
  status: "addressed" | "partially_addressed" | "not_addressed" | "not_applicable";
  evidence: string;
  clauseReference?: string;
  qualityScore?: number;
  gaps: string[];
  recommendation: string;
}

interface RequiredElement {
  element: string;
  present: boolean;
  quality: "good" | "adequate" | "insufficient" | "missing";
  notes: string;
}

interface TcAnalysisResult {
  documentType: "terms_and_conditions";
  overallAssessment: string;
  obligationFindings: ObligationFinding[];
  missingClauses: string[];
  qualityConcerns: string[];
}

interface FvaAnalysisResult {
  documentType: "fair_value_assessment";
  overallAssessment: string;
  obligationFindings: ObligationFinding[];
  requiredElements: RequiredElement[];
}

interface TmaAnalysisResult {
  documentType: "target_market_assessment";
  overallAssessment: string;
  obligationFindings: ObligationFinding[];
  requiredElements: RequiredElement[];
}

export type AnalysisResult = TcAnalysisResult | FvaAnalysisResult | TmaAnalysisResult;

// --- Prompts ---

const TC_SYSTEM = `You are an expert UK financial services regulatory compliance analyst.
Your task is to analyse a product's Terms & Conditions document against its applicable regulatory obligations.

For each obligation, determine:
- Whether the T&Cs contain a clause that addresses it ("addressed", "partially_addressed", "not_addressed", "not_applicable")
- The specific clause or section reference in the T&Cs that addresses it
- A quality assessment (0.0-1.0) of how well the clause satisfies the obligation
- Specific gaps or deficiencies
- A recommendation for improvement

Also identify:
- Any obligations that have no corresponding clause at all
- Overall quality concerns with the T&Cs document

Consider Consumer Duty requirements: clauses must use plain English, avoid misleading terms, and be fair to consumers.
Be precise about clause references. Quote relevant T&C text when identifying evidence.`;

const FVA_SYSTEM = `You are an expert UK financial services regulatory compliance analyst specialising in the FCA Consumer Duty fair value requirements (PRIN 2A.4, PS22/9).

Analyse a Fair Value Assessment against applicable regulatory obligations. A compliant FVA must demonstrate fair value.

Required elements in a compliant FVA:
1. Total cost to customer (all fees, charges, interest, non-financial costs)
2. Nature and quality of the product/service
3. Benefits customers receive vs costs
4. Target market alignment
5. Comparison with market alternatives
6. Distribution costs and justification
7. Identification of groups receiving poor value
8. Remediation plan for identified issues

For each obligation, assess whether the FVA addresses it adequately.`;

const TMA_SYSTEM = `You are an expert UK financial services regulatory compliance analyst specialising in FCA Product Governance requirements (PROD 3, Consumer Duty PRIN 2A.3).

Analyse a Target Market Assessment against applicable regulatory obligations. A compliant TMA must clearly define who the product is for and who it is NOT suitable for.

Required elements in a compliant TMA:
1. Positive target market (customer types, needs, characteristics)
2. Negative target market (who should NOT buy this product)
3. Customer needs and objectives the product serves
4. Financial situation/capability of target customers
5. Risk tolerance and capacity for loss
6. Knowledge and experience requirements
7. Vulnerability considerations (FCA FG21/1 four drivers)
8. Distribution strategy alignment with target market
9. Regular review triggers and methodology

For each obligation, assess whether the TMA addresses it.`;

// --- Core functions ---

export async function analyseDocument(documentId: string): Promise<AnalysisResult> {
  const doc = await prisma.productDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      product: { include: { productType: true } },
    },
  });

  const obligations = await getApplicableObligations(doc.productId);

  const specificObligations = obligations.filter((o) => o.obligationType !== "principle");
  const principleObligations = obligations.filter((o) => o.obligationType === "principle");

  const obligationList = specificObligations.map((o) => ({
    id: o.obligationId,
    summary: o.summary,
    actionText: o.actionText,
    obligationType: o.obligationType,
    reference: o.ruleReference,
    regulation: o.regulationTitle,
  }));

  const principleList = principleObligations.map((o) => ({
    id: o.obligationId,
    summary: o.summary,
    actionText: o.actionText,
    obligationType: o.obligationType,
    reference: o.ruleReference,
    regulation: o.regulationTitle,
  }));

  const productContext = `${doc.product.productType.name} product ("${doc.product.name}") aimed at ${doc.product.customerType} customers, distributed via ${doc.product.distributionChannel}, offered in ${doc.product.jurisdictions.join(", ")}`;

  let systemPrompt: string;
  let docLabel: string;
  let extraReturnSchema: string;

  switch (doc.documentType) {
    case "terms_and_conditions":
      systemPrompt = TC_SYSTEM;
      docLabel = "TERMS & CONDITIONS";
      extraReturnSchema = `"missingClauses": ["obligation summary with no clause"],\n  "qualityConcerns": ["concern 1"]`;
      break;
    case "fair_value_assessment":
      systemPrompt = FVA_SYSTEM;
      docLabel = "FAIR VALUE ASSESSMENT";
      extraReturnSchema = `"requiredElements": [{"element": "Total cost to customer", "present": true, "quality": "good|adequate|insufficient|missing", "notes": "details"}]`;
      break;
    case "target_market_assessment":
      systemPrompt = TMA_SYSTEM;
      docLabel = "TARGET MARKET ASSESSMENT";
      extraReturnSchema = `"requiredElements": [{"element": "Positive target market", "present": true, "quality": "good|adequate|insufficient|missing", "notes": "details"}]`;
      break;
    default:
      throw new Error(`Unknown document type: ${doc.documentType}`);
  }

  const principleSection = principleList.length > 0
    ? `\n\nPRINCIPLE OBLIGATIONS (assess differently):
${JSON.stringify(principleList, null, 2)}

These are general principles — do NOT look for a specific clause addressing them.
Instead, assess how well the document's overall quality, tone, clarity and structure
reflects each principle. Score based on:
- Plain English and readability
- Absence of misleading or unfair terms
- Overall alignment with the principle's intent
Status should be "addressed" if the document generally embodies the principle,
"partially_addressed" if there are concerns, "not_addressed" only if the document
actively contradicts or undermines the principle.`
    : "";

  const userMessage = `Analyse the following ${docLabel} for a ${productContext}.

REGULATORY OBLIGATIONS TO CHECK:
${JSON.stringify(obligationList, null, 2)}${principleSection}

${docLabel} DOCUMENT:
---
${doc.content}
---

Return a JSON object:
{
  "documentType": "${doc.documentType}",
  "overallAssessment": "summary",
  "obligationFindings": [
    {
      "obligationId": "...",
      "status": "addressed|partially_addressed|not_addressed|not_applicable",
      "evidence": "quote or description from the document",
      "clauseReference": "clause number/title if applicable",
      "qualityScore": 0.0-1.0,
      "gaps": ["gap 1"],
      "recommendation": "what to change"
    }
  ],
  ${extraReturnSchema}
}`;

  return askClaudeJSON<AnalysisResult>(systemPrompt, userMessage, 32000);
}

export async function applyAnalysisToMatrix(documentId: string): Promise<void> {
  const doc = await prisma.productDocument.findUniqueOrThrow({
    where: { id: documentId },
  });

  if (doc.analysisStatus !== "complete" || !doc.analysisResult) return;

  const result = doc.analysisResult as unknown as AnalysisResult;
  const findings = result.obligationFindings;

  // Ensure matrix entries exist before applying findings
  await generateComplianceMatrix(doc.productId);

  const matrixEntries = await prisma.complianceMatrixEntry.findMany({
    where: { productId: doc.productId },
  });

  for (const finding of findings) {
    const entry = matrixEntries.find((e) => e.obligationId === finding.obligationId);
    if (!entry) continue;

    const newEvidence = {
      documentId: doc.id,
      documentType: doc.documentType,
      status: finding.status,
      evidence: finding.evidence,
      clauseReference: finding.clauseReference,
      qualityScore: finding.qualityScore,
      gaps: finding.gaps,
      recommendation: finding.recommendation,
    };

    // Merge with existing evidence from other documents, replacing same doc type
    const existingEvidence = ((entry.documentEvidence as unknown as Record<string, unknown>[]) || []).filter(
      (e) => e.documentId !== doc.id
    );
    const mergedEvidence = [...existingEvidence, newEvidence];

    const suggestedStatus = deriveSuggestedStatus(mergedEvidence);

    const evidenceText = mergedEvidence
      .map((e) => {
        const label =
          e.documentType === "terms_and_conditions"
            ? "T&Cs"
            : e.documentType === "fair_value_assessment"
              ? "FVA"
              : "TMA";
        return `[${label}] ${e.evidence}`;
      })
      .join("\n\n");

    const isManuallyAssessed =
      entry.complianceStatus !== "not_assessed" && entry.evidenceSource === "manual";

    await prisma.complianceMatrixEntry.update({
      where: { id: entry.id },
      data: {
        documentEvidence: mergedEvidence as unknown as undefined,
        evidenceSource: isManuallyAssessed ? "mixed" : "document_analysis",
        ...(entry.complianceStatus === "not_assessed"
          ? {
              complianceStatus: suggestedStatus,
              evidence: evidenceText,
              notes: finding.recommendation || entry.notes,
            }
          : {
              notes: entry.notes
                ? `${entry.notes}\n\n[Auto-analysis: ${finding.status}] ${finding.recommendation}`
                : `[Auto-analysis: ${finding.status}] ${finding.recommendation}`,
            }),
      },
    });
  }
}

function deriveSuggestedStatus(evidence: Record<string, unknown>[]): string {
  const statuses = evidence.map((e) => e.status as string);
  if (statuses.every((s) => s === "addressed")) return "compliant";
  if (statuses.every((s) => s === "not_applicable")) return "not_applicable";
  if (statuses.some((s) => s === "not_addressed")) return "non_compliant";
  if (statuses.some((s) => s === "partially_addressed")) return "in_progress";
  return "not_assessed";
}

export async function runAnalysis(documentId: string): Promise<void> {
  await prisma.productDocument.update({
    where: { id: documentId },
    data: { analysisStatus: "analysing" },
  });
  try {
    console.log(`[Analysis] Starting analysis for document ${documentId}`);
    const result = await analyseDocument(documentId);
    console.log(`[Analysis] Claude returned ${result.obligationFindings.length} findings`);
    await prisma.productDocument.update({
      where: { id: documentId },
      data: {
        analysisStatus: "complete",
        analysisResult: result as unknown as undefined,
        analysisCompletedAt: new Date(),
        analysisError: null,
      },
    });
    console.log(`[Analysis] Applying findings to matrix...`);
    await applyAnalysisToMatrix(documentId);
    console.log(`[Analysis] Complete`);
  } catch (error) {
    console.error(`[Analysis] Failed:`, error);
    await prisma.productDocument.update({
      where: { id: documentId },
      data: {
        analysisStatus: "failed",
        analysisError: String(error),
      },
    });
  }
}
