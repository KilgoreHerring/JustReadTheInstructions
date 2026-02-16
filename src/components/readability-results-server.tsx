"use client";

import { ReadabilityResults, type ReadabilityResult } from "./readability-results";

interface Props {
  result: Record<string, unknown>;
  documentType: string;
  fileName: string;
}

export function ReadabilityResultsServer({ result }: Props) {
  return (
    <ReadabilityResults
      result={result as unknown as ReadabilityResult}
      compact={true}
    />
  );
}
