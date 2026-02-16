import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const COMPLIANCE_STATUSES = {
  compliant: { label: "Compliant", color: "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]" },
  non_compliant: { label: "Non-Compliant", color: "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]" },
  in_progress: { label: "In Progress", color: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]" },
  not_assessed: { label: "Not Assessed", color: "bg-[var(--status-not-assessed-bg)] text-[var(--status-not-assessed-text)]" },
  not_applicable: { label: "N/A", color: "bg-[var(--status-na-bg)] text-[var(--status-na-text)]" },
} as const;

export const OBLIGATION_TYPES = {
  obligation: { label: "Obligation", color: "bg-[var(--type-obligation-bg)] text-[var(--type-obligation-text)]" },
  prohibition: { label: "Prohibition", color: "bg-[var(--type-prohibition-bg)] text-[var(--type-prohibition-text)]" },
  permission: { label: "Permission", color: "bg-[var(--type-permission-bg)] text-[var(--type-permission-text)]" },
  dispensation: { label: "Dispensation", color: "bg-[var(--type-dispensation-bg)] text-[var(--type-dispensation-text)]" },
  principle: { label: "Principle", color: "bg-[var(--type-principle-bg)] text-[var(--type-principle-text)]" },
} as const;

export const DOCUMENT_TYPES = {
  terms_and_conditions: { label: "Product T&Cs", color: "bg-[var(--doc-tc-bg)] text-[var(--doc-tc-text)]" },
  product_overview: { label: "Product Overview", color: "bg-[var(--doc-overview-bg)] text-[var(--doc-overview-text)]" },
} as const;

export const ANALYSIS_STATUSES = {
  pending: { label: "Pending", color: "bg-[var(--analysis-pending-bg)] text-[var(--analysis-pending-text)]" },
  analysing: { label: "Analysing...", color: "bg-[var(--analysis-analysing-bg)] text-[var(--analysis-analysing-text)]" },
  complete: { label: "Complete", color: "bg-[var(--analysis-complete-bg)] text-[var(--analysis-complete-text)]" },
  failed: { label: "Failed", color: "bg-[var(--analysis-failed-bg)] text-[var(--analysis-failed-text)]" },
} as const;

export const EVIDENCE_STATUSES = {
  addressed: { label: "Addressed", color: "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]" },
  partially_addressed: { label: "Partially Addressed", color: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]" },
  not_addressed: { label: "Not Addressed", color: "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]" },
  not_applicable: { label: "N/A", color: "bg-[var(--status-na-bg)] text-[var(--status-na-text)]" },
} as const;

export const READABILITY_RATINGS = {
  good: { label: "Good", color: "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]" },
  acceptable: { label: "Acceptable", color: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]" },
  concerning: { label: "Concerning", color: "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]" },
} as const;

const PRINCIPLE_LABELS: Record<string, string> = {
  compliant: "Embedded",
  non_compliant: "Not Embedded",
  in_progress: "Partially Embedded",
  not_assessed: "Not Assessed",
  not_applicable: "N/A",
};

export function getComplianceLabel(status: string, obligationType: string): string {
  if (obligationType === "principle") return PRINCIPLE_LABELS[status] || status;
  return COMPLIANCE_STATUSES[status as keyof typeof COMPLIANCE_STATUSES]?.label || status;
}
