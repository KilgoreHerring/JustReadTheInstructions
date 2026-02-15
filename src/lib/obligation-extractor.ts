import { prisma } from "./db";
import { askClaudeJSON } from "./claude";

interface ExtractedObligation {
  obligationType: "obligation" | "prohibition" | "permission" | "dispensation";
  addressee: string;
  actionText: string;
  objectText: string | null;
  conditionText: string | null;
  summary: string;
  confidenceScore: number;
}

const EXTRACTION_PROMPT = `You are an expert in regulatory text analysis specializing in UK financial services regulation.

Your task is to extract discrete obligations from regulatory rule text. For each obligation found, classify it using deontic logic:

- "obligation": Something the addressee MUST do (keywords: must, shall, is required to)
- "prohibition": Something the addressee MUST NOT do (keywords: must not, shall not, may not)
- "permission": Something the addressee MAY do (keywords: may, is permitted to)
- "dispensation": An exception or exemption from another obligation

For each obligation extract:
- addressee: Who must comply (e.g., "firm", "manufacturer", "distributor", "senior manager")
- actionText: The core action required or prohibited
- objectText: What the action applies to (e.g., "retail customers", "product terms", "communications")
- conditionText: Any conditions that trigger or limit the obligation (null if unconditional)
- summary: A plain-English summary in one sentence
- confidenceScore: 0.0-1.0 indicating extraction confidence

A single rule may contain multiple obligations. Extract ALL of them.
Respond with a JSON array of obligation objects.`;

export async function extractObligationsFromRule(
  ruleId: string
): Promise<ExtractedObligation[]> {
  const rule = await prisma.rule.findUniqueOrThrow({
    where: { id: ruleId },
    include: {
      section: { include: { regulation: true } },
    },
  });

  const userMessage = `Extract obligations from the following regulatory rule:

Regulation: ${rule.section.regulation.title}
Section: ${rule.section.number} - ${rule.section.title}
Reference: ${rule.reference}

Rule text:
"${rule.rawText}"`;

  return askClaudeJSON<ExtractedObligation[]>(EXTRACTION_PROMPT, userMessage);
}

export async function extractAndSaveObligations(ruleId: string) {
  const extracted = await extractObligationsFromRule(ruleId);

  const created = await Promise.all(
    extracted.map((ob) =>
      prisma.obligation.create({
        data: {
          ruleId,
          obligationType: ob.obligationType,
          addressee: ob.addressee,
          actionText: ob.actionText,
          objectText: ob.objectText,
          conditionText: ob.conditionText,
          summary: ob.summary,
          extractedBy: "llm",
          confidenceScore: ob.confidenceScore,
        },
      })
    )
  );

  return created;
}

export async function extractAllUnprocessedRules() {
  const rules = await prisma.rule.findMany({
    where: { obligations: { none: {} } },
    select: { id: true, reference: true },
  });

  const results = [];
  for (const rule of rules) {
    try {
      const obligations = await extractAndSaveObligations(rule.id);
      results.push({
        ruleId: rule.id,
        reference: rule.reference,
        obligationsExtracted: obligations.length,
      });
    } catch (error) {
      results.push({
        ruleId: rule.id,
        reference: rule.reference,
        error: String(error),
      });
    }
    // Rate limiting: 1 second between API calls
    await new Promise((r) => setTimeout(r, 1000));
  }

  return results;
}
