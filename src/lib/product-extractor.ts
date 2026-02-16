import { askClaudeJSON } from "./claude";

export interface ExtractedProductDetails {
  name: string | null;
  productType: string | null;
  description: string | null;
  customerType: string | null;
  distributionChannel: string | null;
  jurisdictions: string[] | null;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an expert at analysing UK financial product documents (Terms & Conditions, product summaries, key facts).
Extract the following product details from the document text provided:

1. Product name - the specific marketed name of the product
2. Product type - must be one of: "Residential Mortgage", "Buy-to-Let Mortgage", "Equity Release", "Personal Loan", "Credit Card", "BNPL / Deferred Payment", "High-Cost Short-Term Credit", "Current Account", "Savings Account", "Business Current Account", "Business Savings Account", "Investment Product (Retail)", "SIPP / Personal Pension", "Workplace Pension", "Discretionary Portfolio", "Advisory Investment Service", "Structured Product", "Retail Fund (UCITS/NURS)", "General Insurance", "Protection Insurance", "Travel Insurance", "Payment Service", "Commercial Mortgage", "Invoice Finance", "Trade Finance"
3. Description - a brief 1-2 sentence summary of what the product is and its key features
4. Customer type - one of: "consumer", "sme", "professional", "institutional"
5. Distribution channel - one of: "direct", "intermediary", "online", "branch"
6. Jurisdictions - array of country/region codes where the product is offered (e.g. ["UK"])

If you cannot determine a field from the document, set it to null.
Set "confidence" to a value between 0 and 1 indicating your overall confidence in the extraction.
Respond with JSON only.`;

export async function extractProductDetails(
  documentText: string
): Promise<ExtractedProductDetails> {
  const trimmed = documentText.slice(0, 30000);

  const userMessage = `Extract product details from this document:\n\n---\n${trimmed}\n---\n\nReturn JSON with: name, productType, description, customerType, distributionChannel, jurisdictions, confidence`;

  return askClaudeJSON<ExtractedProductDetails>(
    SYSTEM_PROMPT,
    userMessage,
    2048
  );
}
