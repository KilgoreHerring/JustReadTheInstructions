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
  not_evidenced: { label: "Not Evidenced", color: "bg-[var(--status-not-evidenced-bg)] text-[var(--status-not-evidenced-text)]" },
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
  queued: { label: "Queued for Batch", color: "bg-[var(--analysis-queued-bg)] text-[var(--analysis-queued-text)]" },
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

export const EVIDENCE_SCOPES = {
  mandatory_clause: { label: "Mandatory Clause", color: "bg-[var(--scope-mandatory-bg)] text-[var(--scope-mandatory-text)]" },
  term_required: { label: "Regulatory Expectation", color: "bg-[var(--scope-term-bg)] text-[var(--scope-term-text)]" },
  internal_governance: { label: "Internal Governance", color: "bg-[var(--scope-internal-bg)] text-[var(--scope-internal-text)]" },
  guidance: { label: "Guidance & Best Practice", color: "bg-[var(--scope-guidance-bg)] text-[var(--scope-guidance-text)]" },
} as const;

export const READABILITY_RATINGS = {
  good: { label: "Good", color: "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]" },
  acceptable: { label: "Acceptable", color: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]" },
  concerning: { label: "Concerning", color: "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]" },
} as const;

export const HORIZON_ITEM_TYPES = {
  consultation_paper: { label: "Consultation Paper", color: "bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)]" },
  policy_statement: { label: "Policy Statement", color: "bg-[var(--horizon-ps-bg)] text-[var(--horizon-ps-text)]" },
  discussion_paper: { label: "Discussion Paper", color: "bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)]" },
  statutory_instrument: { label: "Statutory Instrument", color: "bg-[var(--horizon-si-bg)] text-[var(--horizon-si-text)]" },
  primary_legislation: { label: "Primary Legislation", color: "bg-[var(--horizon-si-bg)] text-[var(--horizon-si-text)]" },
  legislative_proposal: { label: "Legislative Proposal", color: "bg-[var(--horizon-si-bg)] text-[var(--horizon-si-text)]" },
  handbook_notice: { label: "Handbook Notice", color: "bg-[var(--horizon-handbook-bg)] text-[var(--horizon-handbook-text)]" },
  supervisory_statement: { label: "Supervisory Statement", color: "bg-[var(--horizon-ps-bg)] text-[var(--horizon-ps-text)]" },
  rts_its: { label: "RTS/ITS", color: "bg-[var(--horizon-si-bg)] text-[var(--horizon-si-text)]" },
  dear_ceo_letter: { label: "Dear CEO Letter", color: "bg-[var(--horizon-enforcement-bg)] text-[var(--horizon-enforcement-text)]" },
  guidance: { label: "Guidance", color: "bg-[var(--horizon-other-bg)] text-[var(--horizon-other-text)]" },
  qa_guidance: { label: "Q&A / Guidance", color: "bg-[var(--horizon-other-bg)] text-[var(--horizon-other-text)]" },
  enforcement_notice: { label: "Enforcement", color: "bg-[var(--horizon-enforcement-bg)] text-[var(--horizon-enforcement-text)]" },
  speech: { label: "Speech", color: "bg-[var(--horizon-other-bg)] text-[var(--horizon-other-text)]" },
  report: { label: "Report", color: "bg-[var(--horizon-other-bg)] text-[var(--horizon-other-text)]" },
  market_study: { label: "Market Study", color: "bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)]" },
  other: { label: "Other", color: "bg-[var(--horizon-other-bg)] text-[var(--horizon-other-text)]" },
} as const;

export const HORIZON_STATUSES = {
  consultation: { label: "Consultation", color: "bg-[var(--horizon-cp-bg)] text-[var(--horizon-cp-text)]" },
  proposed_change: { label: "Proposed Change", color: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]" },
  pending_change: { label: "Pending Change", color: "bg-[var(--horizon-si-bg)] text-[var(--horizon-si-text)]" },
  active_change: { label: "Active", color: "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]" },
  completed: { label: "Completed", color: "bg-[var(--status-not-assessed-bg)] text-[var(--status-not-assessed-text)]" },
  withdrawn: { label: "Withdrawn", color: "bg-[var(--status-na-bg)] text-[var(--status-na-text)]" },
} as const;

export const HORIZON_PRIORITIES = {
  high: { label: "High", color: "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]" },
  medium: { label: "Medium", color: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]" },
  low: { label: "Low", color: "bg-[var(--status-not-assessed-bg)] text-[var(--status-not-assessed-text)]" },
  info: { label: "Info", color: "bg-[var(--status-na-bg)] text-[var(--status-na-text)]" },
} as const;

export const HORIZON_JURISDICTIONS = {
  UK: { label: "UK", shortLabel: "UK" },
  EU: { label: "EU", shortLabel: "EU" },
  "UK+EU": { label: "UK + EU", shortLabel: "UK+EU" },
  Global: { label: "Global", shortLabel: "Global" },
  US: { label: "US", shortLabel: "US" },
} as const;

export const HORIZON_TOPIC_AREAS = {
  capital_requirements: { label: "Capital Requirements", shortLabel: "Capital" },
  liquidity: { label: "Liquidity & Treasury", shortLabel: "Liquidity" },
  conduct_retail: { label: "Retail Conduct", shortLabel: "Conduct" },
  consumer_duty: { label: "Consumer Duty", shortLabel: "ConsDuty" },
  aml_cft: { label: "AML / CFT", shortLabel: "AML" },
  payments: { label: "Payments & E-Money", shortLabel: "Payments" },
  insurance: { label: "Insurance & IDD", shortLabel: "Insurance" },
  markets_mifid: { label: "Markets & MiFID", shortLabel: "Markets" },
  operational_resilience: { label: "Operational Resilience", shortLabel: "OpRes" },
  data_privacy: { label: "Data & Privacy", shortLabel: "Data" },
  esg_sustainability: { label: "ESG & Sustainability", shortLabel: "ESG" },
  digital_crypto: { label: "Digital Assets & Crypto", shortLabel: "Crypto" },
  ai_technology: { label: "AI & Technology", shortLabel: "AI/Tech" },
  consumer_credit: { label: "Consumer Credit", shortLabel: "Credit" },
  governance_fitness: { label: "Governance & Fitness", shortLabel: "Gov" },
} as const;

export const HORIZON_CLIENT_SECTORS = {
  bank: { label: "Bank / Building Society" },
  insurer: { label: "Insurer" },
  investment_firm: { label: "Investment Firm" },
  payment_firm: { label: "Payment / E-Money Firm" },
  consumer_credit_firm: { label: "Consumer Credit Firm" },
  asset_manager: { label: "Asset Manager" },
  wealth_manager: { label: "Wealth Manager" },
} as const;

export const CROSS_REFERENCE_TYPES = {
  supersedes: { label: "Supersedes" },
  implements: { label: "Implements" },
  responds_to: { label: "Responds to" },
  amends: { label: "Amends" },
  references: { label: "References" },
  related: { label: "Related" },
} as const;

export const REGULATOR_SOURCE_TYPES = {
  primary_regulator: { label: "Primary Regulators" },
  standard_setter: { label: "Standard Setters" },
  trade_body: { label: "Trade Bodies" },
  news: { label: "News & Intelligence" },
} as const;

export function computeUrgencyBand(
  status: string,
  responseDeadline: string | null,
  effectiveDate: string | null
): "live_consultation" | "upcoming_deadline" | "recently_enacted" | "horizon_item" | "archived" {
  if (status === "completed" || status === "withdrawn") return "archived";
  if (status === "consultation" && responseDeadline) {
    const days = daysUntilDeadline(responseDeadline);
    if (days !== null && days >= 0) return "live_consultation";
    return "upcoming_deadline";
  }
  if (status === "pending_change" && effectiveDate) {
    const days = daysUntilDeadline(effectiveDate);
    if (days !== null && days <= 90) return "upcoming_deadline";
  }
  if (status === "active_change") return "recently_enacted";
  return "horizon_item";
}

export function consultationUrgency(
  deadline: string | null
): "critical" | "urgent" | "approaching" | "open" | "closed" | null {
  if (!deadline) return null;
  const days = daysUntilDeadline(deadline);
  if (days === null) return null;
  if (days < 0) return "closed";
  if (days <= 7) return "critical";
  if (days <= 30) return "urgent";
  if (days <= 60) return "approaching";
  return "open";
}

const PRINCIPLE_LABELS: Record<string, string> = {
  compliant: "Embedded",
  non_compliant: "Not Embedded",
  not_evidenced: "Not Evidenced",
  in_progress: "Partially Embedded",
  not_assessed: "Not Assessed",
  not_applicable: "N/A",
};

export function getComplianceLabel(status: string, obligationType: string): string {
  if (obligationType === "principle") return PRINCIPLE_LABELS[status] || status;
  return COMPLIANCE_STATUSES[status as keyof typeof COMPLIANCE_STATUSES]?.label || status;
}

export function deadlineUrgency(deadline: string | null): "overdue" | "urgent" | "approaching" | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const daysUntil = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 7) return "urgent";
  if (daysUntil <= 30) return "approaching";
  return null;
}

export function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}
