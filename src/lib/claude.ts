import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { prisma } from "./db";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096,
  options?: { userId?: string; endpoint?: string }
): Promise<string> {
  console.log(`[Claude] Calling API (max_tokens: ${maxTokens})...`);
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  console.log(`[Claude] Response received (${response.usage.input_tokens} in, ${response.usage.output_tokens} out)`);

  // Log usage (fire-and-forget)
  if (options?.userId) {
    prisma.apiUsage
      .create({
        data: {
          userId: options.userId,
          endpoint: options.endpoint ?? "askClaude",
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      })
      .catch(() => {});
  }

  const block = response.content[0];
  if (block.type === "text") return block.text;
  throw new Error("Unexpected response type");
}

export function stripFences(text: string): string {
  text = text.trim();
  const fenceMatch = text.match(/^```\s*(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?\s*```\s*$/i);
  if (fenceMatch) return fenceMatch[1].trim();
  if (text.startsWith("```")) {
    return text.replace(/^```\s*(?:json)?\s*\r?\n?/i, "").replace(/\r?\n?\s*```\s*$/i, "").trim();
  }
  return text;
}

export const JSON_INSTRUCTION = `

CRITICAL RESPONSE FORMAT RULES:
- Your entire response must be a single valid JSON object.
- Start your response with { and end with }.
- Do NOT wrap the JSON in markdown code fences (\`\`\`json or \`\`\`).
- Do NOT include any text, explanation, or commentary before or after the JSON.
- Ensure all strings are properly escaped (no unescaped newlines, quotes, or backslashes inside string values).
- When quoting document text in evidence fields, escape any double quotes as \\" and replace newlines with \\n.`;

export async function askClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096,
  label?: string,
  options?: { userId?: string; endpoint?: string }
): Promise<T> {
  const tag = label ? `[Claude JSON: ${label}]` : "[Claude JSON]";

  let text = await askClaude(systemPrompt + JSON_INSTRUCTION, userMessage, maxTokens, options);
  text = stripFences(text);

  // Layer 1: Direct parse
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn(`${tag} Direct parse failed: ${e instanceof Error ? e.message : e}`);
  }

  // Layer 2: jsonrepair
  try {
    const repaired = jsonrepair(text);
    const result = JSON.parse(repaired) as T;
    console.log(`${tag} Repair succeeded`);
    return result;
  } catch (e) {
    console.warn(`${tag} Repair failed: ${e instanceof Error ? e.message : e}. Retrying API call...`);
  }

  // Layer 3: Retry once, then repair again if needed
  text = await askClaude(systemPrompt + JSON_INSTRUCTION, userMessage, maxTokens, options);
  text = stripFences(text);

  try {
    return JSON.parse(text) as T;
  } catch {
    // Final attempt: repair the retry response
    const repaired = jsonrepair(text);
    const result = JSON.parse(repaired) as T;
    console.log(`${tag} Retry + repair succeeded`);
    return result;
  }
}

export { anthropic };
