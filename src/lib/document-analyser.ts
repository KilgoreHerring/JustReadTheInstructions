import { prisma } from "./db";
import { askClaudeJSON } from "./claude";
import { getApplicableObligations, generateComplianceMatrix, MatchedObligation } from "./matching-engine";

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

export interface AnalysisResult {
  documentType: "terms_and_conditions";
  overallAssessment: string;
  obligationFindings: ObligationFinding[];
  missingClauses: string[];
  qualityConcerns: string[];
}

// --- Prompts ---

const TC_SYSTEM = `You are an expert UK financial services regulatory compliance analyst with deep knowledge of the FCA Handbook, Consumer Duty (PRIN 2A), and sector-specific sourcebooks (BCOBS, MCOB, CONC, PSR 2017).

Your task is to analyse a product's Terms & Conditions against applicable regulatory obligations. You must assess each obligation with the rigour and specificity of a compliance review, not a general read-through.

## Assessment Framework

Structure your analysis around the four Consumer Duty outcomes:

**Products & Services (PRIN 2A.3):** Is the product designed to meet the needs of the identified target market? Do the T&Cs reflect features that benefit customers, or features that benefit the firm at the customer's expense?

**Price & Value (PRIN 2A.4):** Are ALL costs, fees, charges, and interest rates disclosed transparently? Are charges cost-reflective and reasonable relative to the benefits provided? Are there any charges that depend on customer inertia, confusion, or failure to act?

**Consumer Understanding (PRIN 2A.5):** Is the language plain and intelligible? Are key terms (fees, risks, exit conditions) visually prominent? Would a customer with low financial confidence understand what they're agreeing to?

**Consumer Support (PRIN 2A.6):** Are pathways for complaints, switching, cancellation, and accessing support clearly explained? Are there unreasonable barriers to exiting the product?

## Red Flags — flag these specifically in your analysis

- Penalty or forfeiture clauses that are not prominently disclosed
- Unilateral variation rights without adequate notice periods
- Exit barriers or switching friction (e.g. complex cancellation processes)
- Promotional terms with buried reversion conditions
- Revenue model that depends on customer inertia or confusion (e.g. auto-renewal at higher rates)
- Asymmetric terms: firm can change terms unilaterally but customer cannot exit without penalty
- Opacity: charges expressed as formulas, references to other documents, or "as published from time to time"
- Prominence inversion: risks and costs in small print while benefits are prominent
- Terms that assume high financial literacy without explanation (APR, AER, basis points, accrued interest)
- Cross-subsidies between customer groups without transparency

## Plain English Assessment

When assessing language quality, check for:
- Sentences over 25 words containing financial or legal terminology
- Technical terms used without an immediate, simple explanation
- Key information (fees, risks, exit terms) not visually prominent or buried in the document
- Boilerplate or generic text that obscures product-specific information
- Double negatives, passive voice obscuring who is responsible, conditional chains (if X then Y unless Z)
- Information that requires numeracy skills without worked examples (e.g. compound interest without illustration)
- Critical terms buried in the middle/end rather than presented prominently

## Principle Assessment Guidance

For overarching principles (not specific clause-level obligations):
- "Act in good faith" (PRIN 2A.2.1R): Check for exploitative language, punitive pricing, inaccessible support. Does the document treat the customer as a partner or an adversary?
- "Avoid foreseeable harm" (PRIN 2A.2.2R): Could any term foreseeably cause harm? Does the product exploit behavioural biases? Are there predatory features?
- "Enable customer objectives" (PRIN 2A.2.3R): Is there adequate information for informed choice? Can customers actually act on the terms (e.g. switch, cancel, complain)?

## Quality Scoring Rubric

Use this rubric consistently:
- 0.9–1.0: Clause fully addresses the obligation with clear, specific, plain-English language
- 0.7–0.8: Clause addresses the obligation but could be clearer, more specific, or better positioned
- 0.5–0.6: Clause partially addresses the obligation with significant gaps or unclear language
- 0.3–0.4: Clause touches on the obligation but is inadequate or misleading
- 0.0–0.2: No meaningful attempt to address the obligation

Be precise about clause references. Quote relevant T&C text when identifying evidence.

## Evidence Scope

Each obligation has an evidenceScope field indicating where compliance evidence is expected:
- "mandatory_clause": This obligation MUST be evidenced in customer T&Cs by law — it requires a specific disclosure, prescribed information, or statutory right to be communicated. If no relevant clause is found, mark "not_addressed" — this is a hard compliance failure.
- "term_required": This regulation applies to the product and may be relevant to T&Cs, but absence from T&Cs is not necessarily a compliance failure. The obligation may be addressed through other means (internal policies, product design, separate disclosures). If no clause is found, mark "not_addressed" — but note this is an advisory finding, not a compliance failure. Still assess quality if a relevant clause IS found.
- "internal_governance": This is an internal governance/process requirement (e.g. reconciliations, governance structures, record-keeping, staffing, internal controls). Mark as "not_applicable" for T&C analysis — these are never evidenced in customer terms. Do NOT mark "not_addressed" simply because T&Cs don't cover an internal process.
- "guidance": Best practice and guidance. Assess holistically — absence from T&Cs is not a hard compliance failure. Use "partially_addressed" rather than "not_addressed" if the document doesn't explicitly cover this but doesn't contradict it either.`;

// --- Helpers ---

interface PerRegulationResult {
  obligationFindings: ObligationFinding[];
  overallAssessment?: string;
  missingClauses?: string[];
  qualityConcerns?: string[];
}

export function groupByRegulation(obligations: MatchedObligation[]): Map<string, MatchedObligation[]> {
  const groups = new Map<string, MatchedObligation[]>();
  for (const o of obligations) {
    const key = o.regulationTitle;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }
  return groups;
}

export async function getProductOverviewContext(productId: string): Promise<string | null> {
  const overview = await prisma.productDocument.findFirst({
    where: { productId, documentType: "product_overview" },
    select: { content: true },
  });
  return overview?.content || null;
}

// --- Prompt building (shared with batch-analyser) ---

export interface RegulationPrompt {
  system: string;
  userMessage: string;
  maxTokens: number;
}

export function buildRegulationPrompt(
  regulationTitle: string,
  obligations: MatchedObligation[],
  documentContent: string,
  productContext: string,
  overviewContext: string | null,
): RegulationPrompt {
  const specific = obligations.filter((o) => o.obligationType !== "principle");
  const principles = obligations.filter((o) => o.obligationType === "principle");

  const obligationList = specific.map((o) => ({
    id: o.obligationId,
    summary: o.summary,
    actionText: o.actionText,
    obligationType: o.obligationType,
    reference: o.ruleReference,
    evidenceScope: o.evidenceScope,
  }));

  const principleSection = principles.length > 0
    ? `\n\nPRINCIPLE OBLIGATIONS (assess using the principle assessment guidance in your instructions):
${JSON.stringify(principles.map((o) => ({
  id: o.obligationId,
  summary: o.summary,
  actionText: o.actionText,
  obligationType: o.obligationType,
  reference: o.ruleReference,
  evidenceScope: o.evidenceScope,
})), null, 2)}

These are overarching principles. Do NOT look for a single specific clause.
Instead, assess how the document as a whole reflects each principle, using the
principle-specific criteria in your assessment framework.`
    : "";

  const overviewSection = overviewContext
    ? `\n\nPRODUCT OVERVIEW CONTEXT (use this to inform your assessment — e.g. whether T&C language is appropriate for the target market, whether pricing aligns with the stated value proposition):
---
${overviewContext.slice(0, 15000)}
---`
    : "";

  const userMessage = `Analyse the following TERMS & CONDITIONS for a ${productContext}.

REGULATION: ${regulationTitle}

REGULATORY OBLIGATIONS TO CHECK (${obligations.length} obligations from ${regulationTitle}):
${JSON.stringify(obligationList, null, 2)}${principleSection}${overviewSection}

TERMS & CONDITIONS DOCUMENT:
---
${documentContent}
---

Respond with ONLY a JSON object (no markdown fences, no commentary). Use this exact structure:
{
  "overallAssessment": "assessment of compliance with ${regulationTitle}",
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
  "missingClauses": ["obligation summary with no clause"],
  "qualityConcerns": ["concern 1"]
}`;

  const system = TC_SYSTEM + `\n\nYou are analysing obligations specifically from: ${regulationTitle}. Focus your analysis on the requirements of this regulation.`;
  const maxTokens = Math.max(4096, obligations.length * 600);

  return { system, userMessage, maxTokens };
}

// --- Per-regulation analysis ---

async function analyseRegulationGroup(
  regulationTitle: string,
  obligations: MatchedObligation[],
  documentContent: string,
  productContext: string,
  overviewContext: string | null,
): Promise<PerRegulationResult> {
  const prompt = buildRegulationPrompt(regulationTitle, obligations, documentContent, productContext, overviewContext);
  return askClaudeJSON<PerRegulationResult>(prompt.system, prompt.userMessage, prompt.maxTokens, regulationTitle);
}

// --- Core functions ---

export async function analyseDocument(documentId: string): Promise<AnalysisResult> {
  const doc = await prisma.productDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      product: { include: { productType: true } },
    },
  });

  if (doc.documentType !== "terms_and_conditions") {
    throw new Error(`Only T&Cs are analysed — got: ${doc.documentType}`);
  }

  const obligations = await getApplicableObligations(doc.productId);
  const regulationGroups = groupByRegulation(obligations);
  const overviewContext = await getProductOverviewContext(doc.productId);

  const productContext = `${doc.product.productType.name} product ("${doc.product.name}") aimed at ${doc.product.customerType} customers, distributed via ${doc.product.distributionChannel}, offered in ${doc.product.jurisdictions.join(", ")}`;

  const regulationNames = Array.from(regulationGroups.keys());
  console.log(`[Analysis] Splitting into ${regulationNames.length} regulation calls: ${regulationNames.join(", ")}`);
  if (overviewContext) console.log(`[Analysis] Product overview context available (${overviewContext.length} chars)`);

  const results = await Promise.allSettled(
    regulationNames.map((regName) => {
      const regObligations = regulationGroups.get(regName)!;
      console.log(`[Analysis] Starting ${regName} (${regObligations.length} obligations)`);
      return analyseRegulationGroup(
        regName, regObligations, doc.content, productContext, overviewContext,
      );
    })
  );

  // Merge results
  const allFindings: ObligationFinding[] = [];
  const allMissingClauses: string[] = [];
  const allQualityConcerns: string[] = [];
  const overallAssessments: string[] = [];
  const failures: string[] = [];

  results.forEach((result, i) => {
    const regName = regulationNames[i];
    if (result.status === "fulfilled") {
      const data = result.value;
      console.log(`[Analysis] ${regName}: ${data.obligationFindings.length} findings`);
      allFindings.push(...data.obligationFindings);
      if (data.missingClauses) allMissingClauses.push(...data.missingClauses);
      if (data.qualityConcerns) allQualityConcerns.push(...data.qualityConcerns);
      if (data.overallAssessment) overallAssessments.push(`[${regName}] ${data.overallAssessment}`);
    } else {
      console.error(`[Analysis] ${regName} FAILED:`, result.reason);
      failures.push(`${regName}: ${result.reason}`);
    }
  });

  if (allFindings.length === 0) {
    throw new Error(`All regulation analyses failed: ${failures.join("; ")}`);
  }

  if (failures.length > 0) {
    console.warn(`[Analysis] Partial failure: ${failures.length}/${regulationNames.length} regulations failed`);
  }

  const overallAssessment = overallAssessments.join("\n\n")
    + (failures.length > 0 ? `\n\n[WARNING: Analysis incomplete — failed for: ${failures.map((f) => f.split(":")[0]).join(", ")}]` : "");

  return {
    documentType: "terms_and_conditions",
    overallAssessment,
    obligationFindings: allFindings,
    missingClauses: allMissingClauses,
    qualityConcerns: allQualityConcerns,
  };
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

  // Fetch obligation evidence scopes for status derivation
  const obligationIds = findings.map((f) => f.obligationId);
  const obligations = await prisma.obligation.findMany({
    where: { id: { in: obligationIds } },
    select: { id: true, evidenceScope: true },
  });
  const scopeMap = new Map(obligations.map((o) => [o.id, o.evidenceScope]));

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

    const suggestedStatus = deriveSuggestedStatus(mergedEvidence, scopeMap.get(finding.obligationId));

    const evidenceText = mergedEvidence
      .map((e) => `[T&Cs] ${e.evidence}`)
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

function deriveSuggestedStatus(evidence: Record<string, unknown>[], evidenceScope?: string): string {
  const statuses = evidence.map((e) => e.status as string);
  if (statuses.every((s) => s === "addressed")) return "compliant";
  if (statuses.every((s) => s === "not_applicable")) return "not_applicable";
  if (statuses.some((s) => s === "not_addressed")) {
    // Only mandatory clauses can be non-compliant from T&C analysis
    if (evidenceScope === "mandatory_clause") return "non_compliant";
    // Regulatory expectations: neutral advisory status — not a compliance failure
    if (evidenceScope === "term_required") return "not_evidenced";
    // Internal governance obligations shouldn't be non_compliant from T&C analysis
    if (evidenceScope === "internal_governance") return "not_assessed";
    // Guidance obligations get a softer signal
    if (evidenceScope === "guidance") return "in_progress";
    // Fallback for unknown scope: advisory rather than non-compliant
    return "not_evidenced";
  }
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
