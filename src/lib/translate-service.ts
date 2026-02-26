/**
 * Client-side translation helper.
 * Calls /api/translate which uses LangChain under the hood.
 */

import type { AIProvider } from "@/lib/ai-validator";

export interface TranslateInput {
  id: string;
  originalText: string;
  type: "speech" | "narration" | "sfx";
}

export interface TranslateResult {
  id: string;
  translatedText: string;
  type?: "speech" | "narration" | "sfx";
}

export interface TranslateOptions {
  provider: AIProvider;
  model: string;
  apiKey: string;
  targetLanguage: string;
  textBlocks: TranslateInput[];
  localEndpoint?: string;
}

/**
 * Translate an array of text blocks via the /api/translate server route.
 * Returns an array of { id, translatedText }.
 */
export async function translateTextBlocks(
  options: TranslateOptions
): Promise<TranslateResult[]> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: options.provider,
      model: options.model,
      apiKey: options.apiKey,
      targetLanguage: options.targetLanguage,
      textBlocks: options.textBlocks.map((b) => ({
        id: b.id,
        originalText: b.originalText,
        type: b.type,
      })),
      localEndpoint: options.localEndpoint,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Translation failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.translations as TranslateResult[];
}
