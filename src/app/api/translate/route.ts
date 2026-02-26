import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * POST /api/translate
 *
 * LangChain-powered manga text translation endpoint.
 * Accepts text blocks, target language, and model/provider config.
 * Returns structured translations mapped to block IDs.
 *
 * Body: {
 *   provider: "google" | "openai" | "openrouter" | "local",
 *   model: string,
 *   apiKey: string,
 *   targetLanguage: string,
 *   textBlocks: { id: string, originalText: string, type: "speech"|"narration"|"sfx" }[],
 *   localEndpoint?: string,  // for "local" provider
 * }
 */

// Zod schema for a single translated block
const TranslatedBlockSchema = z.object({
  id: z.string().describe("The original text block ID"),
  translatedText: z.string().describe("The translated text"),
  type: z.enum(["speech", "narration", "sfx"]).describe("The classified type of this text block: speech (dialogue in bubbles), narration (caption boxes / inner monologue), or sfx (sound effects / onomatopoeia)"),
});

// Zod schema for the full response
const TranslationResponseSchema = z.object({
  translations: z
    .array(TranslatedBlockSchema)
    .describe("Array of translated text blocks"),
});

function createModel(
  provider: string,
  model: string,
  apiKey: string,
  localEndpoint?: string
): BaseChatModel {
  switch (provider) {
    case "google":
      return new ChatGoogleGenerativeAI({
        model,
        apiKey,
        temperature: 0.3,
      });

    case "openai":
      return new ChatOpenAI({
        model,
        apiKey,
        temperature: 0.3,
      });

    case "openrouter":
      return new ChatOpenAI({
        model,
        apiKey,
        temperature: 0.3,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://komakun.app",
            "X-Title": "KomaKun Manga Translation",
          },
        },
      });

    case "local":
      return new ChatOpenAI({
        model: model || "default",
        apiKey: "not-needed",
        temperature: 0.3,
        configuration: {
          baseURL: localEndpoint || "http://localhost:11434/v1",
        },
      });

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

function buildPrompt(
  targetLanguage: string,
  textBlocks: { id: string; originalText: string; type: string }[]
): string {
  const blockList = textBlocks
    .map(
      (b, i) =>
        `[${i + 1}] ID: "${b.id}" | Text: "${b.originalText}"`
    )
    .join("\n");

  return `You are an expert manga/comic translator. Translate AND classify the following Japanese manga text blocks into ${targetLanguage}.

IMPORTANT — CLASSIFICATION:
Each text block must be classified as one of:
- "speech": dialogue spoken by characters (found inside speech bubbles)
- "narration": narrative captions, inner monologue, chapter titles, scene descriptions
- "sfx": sound effects / onomatopoeia (ドキドキ, ゴゴゴ, バタン etc.)

Note: The OCR engine detects text column-by-column for vertical Japanese text, so a single word may be split across multiple blocks. Consider the content meaning, not just length. A short block is NOT necessarily SFX — it could be a fragment of a longer sentence read column-by-column (e.g. "スイカ" split into "ス", "イ", "カ" or "行こ" and "う").

TRANSLATION RULES:
- Preserve the original meaning, tone, and emotion
- For "speech": use natural conversational dialogue
- For "narration": use a narrative/descriptive tone
- For "sfx": translate sound effects into the target language equivalent (e.g., ドキドキ → *ba-dump ba-dump* for English)
- Keep translations concise to fit within speech bubbles
- Do NOT add any explanation or notes — only provide translations
- Maintain any line breaks if they seem intentional

TEXT BLOCKS TO TRANSLATE:
${blockList}

Respond with a JSON object containing a "translations" array. Each element must have "id" (matching the original block ID), "translatedText" (the translated text), and "type" (one of "speech", "narration", "sfx").`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider,
      model,
      apiKey,
      targetLanguage,
      textBlocks,
      localEndpoint,
    } = body as {
      provider: string;
      model: string;
      apiKey: string;
      targetLanguage: string;
      textBlocks: {
        id: string;
        originalText: string;
        type: string;
      }[];
      localEndpoint?: string;
    };

    if (!provider || !model || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing required fields: provider, model, targetLanguage" },
        { status: 400 }
      );
    }

    if (provider !== "local" && !apiKey) {
      return NextResponse.json(
        { error: "API key is required for cloud providers" },
        { status: 400 }
      );
    }

    if (!textBlocks?.length) {
      return NextResponse.json(
        { error: "No text blocks to translate" },
        { status: 400 }
      );
    }

    const llm = createModel(provider, model, apiKey, localEndpoint);
    const prompt = buildPrompt(targetLanguage, textBlocks);

    // Try structured output first, fall back to raw completion + parse
    try {
      const structuredLlm = llm.withStructuredOutput(
        TranslationResponseSchema,
        { name: "manga_translation" }
      );
      const result = await structuredLlm.invoke(prompt);
      return NextResponse.json(result);
    } catch {
      // Fallback: raw completion + JSON parse
      const response = await llm.invoke(prompt);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ||
        content.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "Failed to parse translation response" },
          { status: 502 }
        );
      }

      const parsed = TranslationResponseSchema.parse(
        JSON.parse(jsonMatch[1])
      );
      return NextResponse.json(parsed);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
