"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";

interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  colemanLiau: number;
  smog: number;
  automatedReadability: number;
  daleChall: number;
  consensusGrade: string;
}

interface ReadabilityStats {
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  avgSentenceLength: number;
  avgWordLength: number;
  difficultWords: number;
}

export interface ReadabilityResult {
  scores: ReadabilityScores;
  stats: ReadabilityStats;
  readingLevel: string;
  readingAge: string;
  fcaAssessment: "good" | "acceptable" | "concerning";
  fcaSummary: string;
  recommendations: string[];
}

const FCA_COLORS = {
  good: {
    bg: "bg-[var(--status-compliant-bg)]",
    text: "text-[var(--status-compliant-text)]",
    border: "border-[var(--status-compliant-bg)]",
  },
  acceptable: {
    bg: "bg-[var(--status-in-progress-bg)]",
    text: "text-[var(--status-in-progress-text)]",
    border: "border-[var(--status-in-progress-bg)]",
  },
  concerning: {
    bg: "bg-[var(--status-non-compliant-bg)]",
    text: "text-[var(--status-non-compliant-text)]",
    border: "border-[var(--status-non-compliant-bg)]",
  },
} as const;

const METRIC_INFO: Record<string, { label: string; description: string; goodRange: string }> = {
  fleschReadingEase: {
    label: "Flesch Reading Ease",
    description: "0–100 scale. Higher = easier to read.",
    goodRange: "60–70+",
  },
  fleschKincaidGrade: {
    label: "Flesch-Kincaid Grade",
    description: "US school grade level needed.",
    goodRange: "8–10",
  },
  gunningFog: {
    label: "Gunning Fog Index",
    description: "Years of education to understand.",
    goodRange: "8–12",
  },
  colemanLiau: {
    label: "Coleman-Liau Index",
    description: "Grade level based on characters.",
    goodRange: "8–10",
  },
  smog: {
    label: "SMOG Index",
    description: "Grade level from polysyllabic words.",
    goodRange: "8–10",
  },
  automatedReadability: {
    label: "Automated Readability",
    description: "Grade level from characters & sentences.",
    goodRange: "8–10",
  },
  daleChall: {
    label: "Dale-Chall Score",
    description: "Based on familiar word usage.",
    goodRange: "7–8",
  },
};

function getMetricRating(
  key: string,
  value: number
): "good" | "acceptable" | "poor" {
  switch (key) {
    case "fleschReadingEase":
      if (value >= 60) return "good";
      if (value >= 40) return "acceptable";
      return "poor";
    case "fleschKincaidGrade":
    case "colemanLiau":
    case "smog":
    case "automatedReadability":
      if (value <= 10) return "good";
      if (value <= 14) return "acceptable";
      return "poor";
    case "gunningFog":
      if (value <= 12) return "good";
      if (value <= 15) return "acceptable";
      return "poor";
    case "daleChall":
      if (value <= 8) return "good";
      if (value <= 9) return "acceptable";
      return "poor";
    default:
      return "acceptable";
  }
}

const RATING_COLORS = {
  good: "bg-[var(--status-compliant-bg)] text-[var(--status-compliant-text)]",
  acceptable: "bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]",
  poor: "bg-[var(--status-non-compliant-bg)] text-[var(--status-non-compliant-text)]",
};

function MetricCard({
  metricKey,
  value,
}: {
  metricKey: string;
  value: number;
}) {
  const info = METRIC_INFO[metricKey];
  if (!info) return null;
  const rating = getMetricRating(metricKey, value);

  return (
    <div className="border border-[var(--border)] rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-[var(--muted-foreground)]">
          {info.label}
        </p>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${RATING_COLORS[rating]}`}
        >
          {rating === "poor" ? "Concerning" : rating === "acceptable" ? "OK" : "Good"}
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
        {info.description} Aim: {info.goodRange}
      </p>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="text-[10px] text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}

export function ReadabilityResults({
  result,
  compact = false,
}: {
  result: ReadabilityResult;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = FCA_COLORS[result.fcaAssessment];

  if (compact) {
    return (
      <div className="mt-3 border border-[var(--border)] rounded-md overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2.5 bg-[var(--muted)] text-left text-sm flex items-center justify-between hover:bg-[var(--border)] transition-colors"
        >
          <span className="flex items-center gap-2 font-medium">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Readability Analysis
          </span>
          <span className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
              {result.readingLevel}
            </span>
            <span className={`px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
              {result.readingAge}
            </span>
          </span>
        </button>

        {expanded && (
          <div className="p-4">
            <ReadabilityFullContent result={result} />
          </div>
        )}
      </div>
    );
  }

  return <ReadabilityFullContent result={result} />;
}

function ReadabilityFullContent({ result }: { result: ReadabilityResult }) {
  const colors = FCA_COLORS[result.fcaAssessment];

  return (
    <div className="space-y-4">
      {/* FCA Assessment Banner */}
      <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
        <div className="flex items-start gap-2">
          <Info size={14} className={`${colors.text} shrink-0 mt-0.5`} />
          <div>
            <p className={`text-sm font-medium ${colors.text}`}>
              FCA Consumer Duty Assessment
            </p>
            <p className={`text-xs ${colors.text} mt-1 leading-relaxed`}>
              {result.fcaSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Reading Level + Consensus */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-[var(--border)] rounded-lg p-4 text-center">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">Reading Level</p>
          <p className="text-xl font-semibold tracking-tight">{result.readingLevel}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{result.readingAge}</p>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-4 text-center">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">Consensus Grade</p>
          <p className="text-lg font-semibold tracking-tight">{result.scores.consensusGrade}</p>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-4 text-center">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">Flesch Ease</p>
          <p className="text-3xl font-semibold tracking-tight">{result.scores.fleschReadingEase}</p>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">out of 100</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="border border-[var(--border)] rounded-lg p-3 flex justify-around">
        <StatItem label="Words" value={result.stats.wordCount.toLocaleString()} />
        <StatItem label="Sentences" value={result.stats.sentenceCount.toLocaleString()} />
        <StatItem label="Avg sentence" value={`${result.stats.avgSentenceLength} words`} />
        <StatItem label="Avg word" value={`${result.stats.avgWordLength} chars`} />
        <StatItem label="Difficult words" value={result.stats.difficultWords.toLocaleString()} />
      </div>

      {/* Score Grid */}
      <div>
        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">
          Readability Metrics
        </p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(METRIC_INFO).map(([key]) => (
            <MetricCard
              key={key}
              metricKey={key}
              value={result.scores[key as keyof ReadabilityScores] as number}
            />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="border border-[var(--border)] rounded-lg p-3">
          <p className="text-xs font-medium mb-2">Recommendations</p>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
                <span className="shrink-0 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
