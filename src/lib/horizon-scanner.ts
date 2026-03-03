import { prisma } from "./db";
import { askClaudeJSON } from "./claude";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

/** Safely parse a date string to ISO, returning null for unparseable values. */
function safeParseDateToISO(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  // Try standard parsing first
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  // Handle FCA format: "Tuesday, March 3, 2026 - 10:00"
  const cleaned = dateStr.replace(/^\w+,\s*/, "").replace(/\s*-\s*/, " ");
  d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

// ── Handbook Notice Ingestion ──

interface HandbookNoticeExtraction {
  noticeTitle: string;
  publishedDate: string | null;
  overview: string;
  instruments: {
    name: string;
    description: string;
    sourceConsultation: string | null;
    effectiveDates: string[];
    handbookAreasAffected: string[];
  }[];
}

export async function ingestHandbookNotice(noticeNumber: number) {
  // Dedup check
  const existing = await prisma.horizonItem.findFirst({
    where: { handbookNoticeNumber: noticeNumber },
  });
  if (existing) {
    throw new Error(`Handbook Notice ${noticeNumber} already ingested`);
  }

  // Fetch PDF
  const pdfUrl = `https://www.fca.org.uk/publication/handbook/handbook-notice-${noticeNumber}.pdf`;
  const res = await fetch(pdfUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch PDF: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  // Extract text with pdf-parse
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const pdf = await pdfParse(buffer);
  const pdfText: string = pdf.text;

  if (!pdfText || pdfText.trim().length < 100) {
    throw new Error("PDF text extraction returned insufficient content");
  }

  // Find FCA regulator
  const fcaRegulator = await prisma.regulator.findFirst({
    where: { abbreviation: "FCA" },
  });

  // Extract structured data via Claude
  const systemPrompt = `You are an expert UK financial regulation analyst. Extract structured data from an FCA Handbook Notice PDF.

Return a JSON object with:
- noticeTitle: the full title (e.g. "Handbook Notice No. 138")
- publishedDate: ISO date string (YYYY-MM-DD) or null
- overview: 2-3 sentence summary of the notice
- instruments: array of instruments/rule changes, each with:
  - name: the instrument name (e.g. "Deferred Payment Credit Instrument 2026")
  - description: 1-2 sentence description of what the instrument does
  - sourceConsultation: the source CP/PS reference if mentioned (e.g. "CP25/23") or null
  - effectiveDates: array of ISO date strings (YYYY-MM-DD) for when parts come into force
  - handbookAreasAffected: array of handbook module abbreviations affected (e.g. ["CONC", "BCOBS"])

Extract ALL instruments mentioned in the notice. Be thorough.`;

  const extraction = await askClaudeJSON<HandbookNoticeExtraction>(
    systemPrompt,
    pdfText.slice(0, 30000),
    4096,
    `handbook-notice-${noticeNumber}`,
    { model: HAIKU_MODEL, endpoint: "handbook-notice-ingest" }
  );

  // Create parent HorizonItem for the notice itself
  const parent = await prisma.horizonItem.create({
    data: {
      title: extraction.noticeTitle || `FCA Handbook Notice No. ${noticeNumber}`,
      sourceType: "manual",
      itemType: "handbook_notice",
      regulatorId: fcaRegulator?.id ?? null,
      summary: extraction.overview,
      sourceUrl: pdfUrl,
      publishedDate: extraction.publishedDate ? new Date(extraction.publishedDate) : null,
      status: "completed",
      priority: "medium",
      handbookNoticeNumber: noticeNumber,
      rawContent: pdfText.slice(0, 50000),
    },
  });

  // Create child HorizonItems for each instrument
  const now = new Date();
  let instrumentCount = 0;

  for (const inst of extraction.instruments) {
    // Parse effective dates and pick the earliest
    const parsedDates = inst.effectiveDates
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const earliestDate = parsedDates[0] ?? null;
    const allFuture = parsedDates.length > 0 && parsedDates.every((d) => d > now);
    const status = allFuture ? "pending_change" : "completed";

    await prisma.horizonItem.create({
      data: {
        title: inst.name,
        sourceType: "manual",
        itemType: "handbook_notice",
        regulatorId: fcaRegulator?.id ?? null,
        summary: inst.description,
        sourceUrl: pdfUrl,
        publishedDate: extraction.publishedDate ? new Date(extraction.publishedDate) : null,
        effectiveDate: earliestDate,
        status,
        priority: "medium",
        parentId: parent.id,
        referenceNumber: inst.sourceConsultation,
        aiClassification: {
          effectiveDates: inst.effectiveDates,
          handbookAreasAffected: inst.handbookAreasAffected,
        },
      },
    });
    instrumentCount++;
  }

  return { parentId: parent.id, instrumentCount };
}

// ── AI Classification ──

interface ClassificationResult {
  affectedRegulations: {
    regulationId: string;
    confidence: number;
    reasoning: string;
  }[];
  affectedObligations: {
    reference: string;
    obligationId?: string;
    impactType: "amendment" | "new_requirement" | "repeal" | "clarification" | "unknown";
    confidence: number;
    reasoning: string;
  }[];
  relevanceScore: number;
  suggestedPriority: "high" | "medium" | "low" | "info";
  summary: string;
}

export async function classifyHorizonItem(horizonItemId: string) {
  const item = await prisma.horizonItem.findUnique({
    where: { id: horizonItemId },
  });
  if (!item) throw new Error("Horizon item not found");

  // Load regulation index
  const regulations = await prisma.regulation.findMany({
    select: { id: true, title: true, citation: true },
  });

  const regIndex = regulations
    .map((r) => `- ${r.id}: ${r.citation} — ${r.title}`)
    .join("\n");

  const systemPrompt = `You are an expert UK financial regulation analyst. Your task is to analyse a regulatory development (consultation paper, policy statement, statutory instrument, etc.) and identify which existing regulations and obligations it may affect.

You have access to the following regulation index:
${regIndex}

Analyse the regulatory development and return a JSON object with:
- affectedRegulations: array of { regulationId, confidence (0-1), reasoning }
- affectedObligations: array of { reference (e.g. "BCOBS 5.1.1R"), impactType ("amendment"|"new_requirement"|"repeal"|"clarification"|"unknown"), confidence (0-1), reasoning }
- relevanceScore: 0-10 (how relevant this development is to the tracked regulations)
- suggestedPriority: "high"|"medium"|"low"|"info"
- summary: one-sentence summary of the regulatory impact

Only include regulations where you have reasonable confidence (>0.3) they are affected.
For obligation references, use the standard FCA citation format (e.g. "BCOBS 5.1.1R", "PRIN 2A.1.1R").`;

  const userMessage = `Title: ${item.title}
${item.referenceNumber ? `Reference: ${item.referenceNumber}` : ""}
Type: ${item.itemType}

Summary: ${item.summary}

${item.rawContent ? `Full text:\n${item.rawContent.slice(0, 8000)}` : ""}`;

  const classification = await askClaudeJSON<ClassificationResult>(
    systemPrompt,
    userMessage,
    4096,
    "horizon-classify",
    { model: HAIKU_MODEL, endpoint: "horizon-classify" }
  );

  // Create regulation links
  for (const reg of classification.affectedRegulations) {
    const exists = regulations.find((r) => r.id === reg.regulationId);
    if (!exists) continue;

    await prisma.horizonRegulationLink.upsert({
      where: {
        horizonItemId_regulationId: {
          horizonItemId: item.id,
          regulationId: reg.regulationId,
        },
      },
      update: { confidence: reg.confidence, source: "ai" },
      create: {
        horizonItemId: item.id,
        regulationId: reg.regulationId,
        confidence: reg.confidence,
        source: "ai",
      },
    });
  }

  // Try to match obligation references to actual obligations
  for (const ob of classification.affectedObligations) {
    let obligationId = ob.obligationId;

    if (!obligationId && ob.reference) {
      const match = await prisma.obligation.findFirst({
        where: {
          rule: { reference: { contains: ob.reference, mode: "insensitive" } },
        },
        select: { id: true },
      });
      if (match) obligationId = match.id;
    }

    if (!obligationId) continue;

    await prisma.horizonObligationLink.upsert({
      where: {
        horizonItemId_obligationId: {
          horizonItemId: item.id,
          obligationId,
        },
      },
      update: {
        impactType: ob.impactType,
        confidence: ob.confidence,
        source: "ai",
      },
      create: {
        horizonItemId: item.id,
        obligationId,
        impactType: ob.impactType,
        confidence: ob.confidence,
        source: "ai",
      },
    });
  }

  // Update item
  await prisma.horizonItem.update({
    where: { id: item.id },
    data: {
      aiClassified: true,
      aiClassification: JSON.parse(JSON.stringify(classification)),
      priority: classification.suggestedPriority,
    },
  });

  return classification;
}

// ── AI Text Extraction ──

interface ExtractionResult {
  title: string;
  itemType: string;
  referenceNumber: string | null;
  summary: string;
  publishedDate: string | null;
  responseDeadline: string | null;
  effectiveDate: string | null;
  sourceUrl: string | null;
  affectedRegulations: string[];
}

export async function extractHorizonItemFromText(
  rawText: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are an expert UK financial regulation analyst. Extract structured metadata from the provided regulatory text.

Return a JSON object with:
- title: concise title for this regulatory development
- itemType: one of "consultation_paper", "policy_statement", "statutory_instrument", "handbook_notice", "dear_ceo_letter", "guidance", "enforcement_notice", "other"
- referenceNumber: the official reference (e.g. "CP26/7", "PS25/3", "SI 2026/142") or null
- summary: 2-3 sentence summary of the development and its impact
- publishedDate: ISO date string (YYYY-MM-DD) or null
- responseDeadline: ISO date string or null
- effectiveDate: ISO date string or null
- sourceUrl: URL if found in the text, or null
- affectedRegulations: array of regulation names/citations mentioned (e.g. ["BCOBS", "Consumer Duty"])`;

  const result = await askClaudeJSON<ExtractionResult>(
    systemPrompt,
    rawText.slice(0, 10000),
    2048,
    "horizon-extract",
    { model: HAIKU_MODEL, endpoint: "horizon-extract" }
  );

  return result;
}

// ── Feed Parsing (Phase 3) ──

const REF_PATTERN = /\b(CP|PS|GC|TR|DP|FS|FG)\d{2}\/\d+\b/;

export function extractReferenceNumber(text: string): string | null {
  const match = text.match(REF_PATTERN);
  return match ? match[0] : null;
}

export function matchesFilterTerms(
  text: string,
  filterTerms: string[]
): boolean {
  if (filterTerms.length === 0) return true;
  const lower = text.toLowerCase();
  return filterTerms.some((term) => lower.includes(term.toLowerCase()));
}

interface FeedItem {
  title: string;
  summary: string;
  url: string | null;
  publishedDate: string | null;
  feedEntryId: string;
}

export function parseRSSItems(xmlText: string): FeedItem[] {
  // Lazy-load fast-xml-parser only when needed (Phase 3)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { XMLParser } = require("fast-xml-parser");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const feed = parser.parse(xmlText);

  const channel = feed?.rss?.channel;
  if (!channel) return [];

  const rawItems = Array.isArray(channel.item)
    ? channel.item
    : channel.item
    ? [channel.item]
    : [];

  return rawItems.map((item: Record<string, string>) => ({
    title: item.title || "",
    summary: item.description || "",
    url: item.link || null,
    publishedDate: safeParseDateToISO(item.pubDate),
    feedEntryId: item.guid || item.link || item.title || "",
  }));
}

export function parseAtomItems(xmlText: string): FeedItem[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { XMLParser } = require("fast-xml-parser");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const feed = parser.parse(xmlText);

  const atomFeed = feed?.feed;
  if (!atomFeed) return [];

  const entries = Array.isArray(atomFeed.entry)
    ? atomFeed.entry
    : atomFeed.entry
    ? [atomFeed.entry]
    : [];

  return entries.map((entry: Record<string, unknown>) => {
    const link = entry.link;
    let href: string | null = null;
    if (typeof link === "string") href = link;
    else if (link && typeof link === "object" && "@_href" in link) href = String(link["@_href"]);

    const content = entry.content || entry.summary;
    const summary = typeof content === "string"
      ? content
      : content && typeof content === "object" && "#text" in content
        ? String(content["#text"])
        : "";

    return {
      title: String(entry.title || ""),
      summary,
      url: href,
      publishedDate: entry.updated
        ? safeParseDateToISO(String(entry.updated))
        : entry.published
        ? safeParseDateToISO(String(entry.published))
        : null,
      feedEntryId: String(entry.id || href || entry.title || ""),
    };
  });
}

export async function pollFeedSource(feedSourceId: string): Promise<number> {
  const source = await prisma.feedSource.findUnique({
    where: { id: feedSourceId },
    include: { regulator: { select: { id: true } } },
  });
  if (!source || !source.isActive) return 0;

  const res = await fetch(source.feedUrl);
  if (!res.ok) {
    console.error(`[Horizon] Feed fetch failed for ${source.name}: ${res.status}`);
    return 0;
  }

  const xmlText = await res.text();
  const items =
    source.feedType === "atom"
      ? parseAtomItems(xmlText)
      : parseRSSItems(xmlText);

  let created = 0;

  for (const item of items) {
    // Skip if no entry ID for dedup
    if (!item.feedEntryId) continue;

    // Keyword pre-filter
    const text = `${item.title} ${item.summary}`;
    if (!matchesFilterTerms(text, source.filterTerms)) continue;

    // Dedup check
    const existing = await prisma.horizonItem.findUnique({
      where: { feedEntryId: item.feedEntryId },
    });

    if (existing) {
      // Update if content changed
      if (existing.summary !== item.summary) {
        await prisma.horizonItem.update({
          where: { id: existing.id },
          data: { summary: item.summary },
        });
      }
      continue;
    }

    // Detect item type from reference number or title
    const ref = extractReferenceNumber(item.title);
    let itemType = "other";
    if (ref) {
      const prefix = ref.slice(0, 2);
      const typeMap: Record<string, string> = {
        CP: "consultation_paper",
        PS: "policy_statement",
        GC: "guidance",
        FG: "guidance",
        TR: "other",
        DP: "consultation_paper",
        FS: "other",
      };
      itemType = typeMap[prefix] || "other";
    }

    await prisma.horizonItem.create({
      data: {
        title: item.title,
        sourceType: source.feedType === "atom" ? "legislation_api" : "rss",
        itemType,
        regulatorId: source.regulatorId,
        summary: item.summary,
        sourceUrl: item.url,
        referenceNumber: ref,
        publishedDate: item.publishedDate ? new Date(item.publishedDate) : null,
        feedEntryId: item.feedEntryId,
        aiClassified: false,
      },
    });
    created++;
  }

  // Update feed source polling timestamp
  await prisma.feedSource.update({
    where: { id: source.id },
    data: {
      lastPolledAt: new Date(),
      lastEntryAt: items.length > 0 && items[0].publishedDate
        ? new Date(items[0].publishedDate)
        : undefined,
    },
  });

  return created;
}

export async function pollAllFeeds(): Promise<{ total: number; byFeed: Record<string, number> }> {
  const feeds = await prisma.feedSource.findMany({
    where: { isActive: true },
  });

  let total = 0;
  const byFeed: Record<string, number> = {};

  for (const feed of feeds) {
    try {
      const count = await pollFeedSource(feed.id);
      byFeed[feed.name] = count;
      total += count;
    } catch (e) {
      console.error(`[Horizon] Error polling ${feed.name}:`, e);
      byFeed[feed.name] = -1;
    }
  }

  return { total, byFeed };
}
