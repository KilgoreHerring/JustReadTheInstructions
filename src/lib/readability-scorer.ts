import _rs from "text-readability";

// text-readability uses ESM `export default` — handle CJS interop edge cases
// where the default export may be nested under `.default`
const rs = (_rs as unknown as { default?: typeof _rs }).default ?? _rs;

export interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  colemanLiau: number;
  smog: number;
  automatedReadability: number;
  daleChall: number;
  consensusGrade: string;
}

export interface ReadabilityStats {
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

function round(n: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function gradeToReadingLevel(grade: number): { level: string; age: string } {
  if (grade <= 6) return { level: "Primary School", age: "7–11 years" };
  if (grade <= 9) return { level: "Secondary School", age: "12–14 years" };
  if (grade <= 11) return { level: "GCSE Level", age: "15–16 years" };
  if (grade <= 13) return { level: "A-Level", age: "16–18 years" };
  if (grade <= 16) return { level: "University", age: "18+ years" };
  return { level: "Postgraduate", age: "21+ years" };
}

function assessFCA(
  fleschEase: number,
  fkGrade: number,
  avgSentenceLen: number
): { assessment: "good" | "acceptable" | "concerning"; summary: string } {
  if (fleschEase >= 60 && fkGrade <= 10) {
    return {
      assessment: "good",
      summary:
        "This document meets FCA Consumer Duty expectations for accessible language. Most adults should be able to understand it without difficulty.",
    };
  }
  if (fleschEase >= 40 && fkGrade <= 14) {
    return {
      assessment: "acceptable",
      summary:
        "This document may challenge some customers. FCA Consumer Duty expects communications that equip customers to make effective decisions — consider simplifying complex passages.",
    };
  }
  return {
    assessment: "concerning",
    summary:
      "This document requires a high reading level and is likely inaccessible to much of the target market. FCA Consumer Duty (PRIN 2A.5) requires firms to communicate in a way customers can understand.",
  };
}

function generateRecommendations(
  scores: ReadabilityScores,
  stats: ReadabilityStats
): string[] {
  const recs: string[] = [];

  if (stats.avgSentenceLength > 25) {
    recs.push(
      `Average sentence length is ${stats.avgSentenceLength} words — aim for under 20 words per sentence for better comprehension.`
    );
  } else if (stats.avgSentenceLength > 20) {
    recs.push(
      `Average sentence length is ${stats.avgSentenceLength} words — good, but under 20 would improve readability further.`
    );
  }

  if (scores.fleschReadingEase < 30) {
    recs.push(
      `Flesch Reading Ease is ${scores.fleschReadingEase} (very difficult). Financial documents should ideally score above 50–60 for consumer accessibility.`
    );
  } else if (scores.fleschReadingEase < 50) {
    recs.push(
      `Flesch Reading Ease is ${scores.fleschReadingEase} (difficult). Consider simplifying language to reach a score of 60+ for broader accessibility.`
    );
  }

  if (scores.fleschKincaidGrade > 14) {
    recs.push(
      `Flesch-Kincaid Grade Level is ${scores.fleschKincaidGrade} (postgraduate) — most consumer-facing documents should target grade 8–10.`
    );
  } else if (scores.fleschKincaidGrade > 10) {
    recs.push(
      `Flesch-Kincaid Grade Level is ${scores.fleschKincaidGrade} — consider reducing to grade 10 or below for wider accessibility.`
    );
  }

  if (scores.gunningFog > 12) {
    recs.push(
      `Gunning Fog Index is ${scores.gunningFog} — text may be hard to read on first pass. Reduce multi-syllable words where possible.`
    );
  }

  if (stats.difficultWords > stats.wordCount * 0.15) {
    const pct = round((stats.difficultWords / stats.wordCount) * 100, 0);
    recs.push(
      `${pct}% of words are classified as difficult. Consider replacing technical or complex terms with simpler alternatives, or provide clear explanations alongside them.`
    );
  }

  if (stats.avgWordLength > 5.5) {
    recs.push(
      `Average word length is ${stats.avgWordLength} characters — shorter words tend to be easier to process. Look for simpler synonyms.`
    );
  }

  if (recs.length === 0) {
    recs.push(
      "This document has good readability scores. Continue to maintain clear, concise language in future revisions."
    );
  }

  return recs;
}

export function calculateReadability(text: string): ReadabilityResult {
  const wordCount = rs.lexiconCount(text, true);
  const sentenceCount = rs.sentenceCount(text);
  const syllableCount = rs.syllableCount(text);
  const difficultWords = rs.difficultWords(text);

  const avgSentenceLength = sentenceCount > 0 ? round(wordCount / sentenceCount) : 0;
  const totalChars = text.replace(/\s+/g, "").replace(/[^\w]/g, "").length;
  const avgWordLength = wordCount > 0 ? round(totalChars / wordCount) : 0;

  const fleschReadingEase = round(rs.fleschReadingEase(text));
  const fleschKincaidGrade = round(rs.fleschKincaidGrade(text));
  const gunningFog = round(rs.gunningFog(text));
  const colemanLiau = round(rs.colemanLiauIndex(text));
  const smog = round(rs.smogIndex(text));
  const automatedReadability = round(rs.automatedReadabilityIndex(text));
  const daleChall = round(rs.daleChallReadabilityScore(text));
  const consensusGrade = rs.textStandard(text);

  const scores: ReadabilityScores = {
    fleschReadingEase,
    fleschKincaidGrade,
    gunningFog,
    colemanLiau,
    smog,
    automatedReadability,
    daleChall,
    consensusGrade,
  };

  const stats: ReadabilityStats = {
    wordCount,
    sentenceCount,
    syllableCount,
    avgSentenceLength,
    avgWordLength,
    difficultWords,
  };

  // Use the average of grade-based metrics for reading level
  const gradeMetrics = [fleschKincaidGrade, gunningFog, colemanLiau, smog, automatedReadability];
  const avgGrade = round(gradeMetrics.reduce((a, b) => a + b, 0) / gradeMetrics.length);
  const { level: readingLevel, age: readingAge } = gradeToReadingLevel(avgGrade);

  const { assessment: fcaAssessment, summary: fcaSummary } = assessFCA(
    fleschReadingEase,
    fleschKincaidGrade,
    avgSentenceLength
  );

  const recommendations = generateRecommendations(scores, stats);

  return {
    scores,
    stats,
    readingLevel,
    readingAge,
    fcaAssessment,
    fcaSummary,
    recommendations,
  };
}
