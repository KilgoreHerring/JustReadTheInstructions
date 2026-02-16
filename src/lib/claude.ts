import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096
): Promise<string> {
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const response = await stream.finalMessage();
  const block = response.content[0];
  if (block.type === "text") return block.text;
  throw new Error("Unexpected response type");
}

export async function askClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096
): Promise<T> {
  let text = await askClaude(
    systemPrompt + "\n\nRespond with valid JSON only. No markdown fences.",
    userMessage,
    maxTokens
  );
  text = text.trim();
  // Strip markdown fences — greedy match between first opening and last closing fence
  const fenceMatch = text.match(/^```(?:json)?\s*\n([\s\S]*)\n```/i);
  if (fenceMatch) text = fenceMatch[1].trim();
  return JSON.parse(text) as T;
}

export { anthropic };
