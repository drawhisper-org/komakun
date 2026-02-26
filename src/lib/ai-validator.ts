/**
 * AI Provider Validation Logic
 * Makes lightweight API calls to validate keys before saving.
 */

export type AIProvider = "google" | "openai" | "openrouter" | "local";

export const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "google", label: "Google (Gemini)" },
  { value: "openai", label: "OpenAI" },
  { value: "local", label: "Local (OpenAI Compatible)" },
];

export const AI_MODELS: Record<AIProvider, { value: string; label: string }[]> =
  {
    google: [
      { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
    ],
    openai: [
      { value: "gpt-5.2-2025-12-11", label: "GPT-5.2" },
      { value: "gpt-5-mini-2025-08-07", label: "GPT-5 Mini" },
      { value: "gpt-4.1-2025-04-14", label: "GPT-4.1" },
      { value: "gpt-5.2-pro-2025-12-11", label: "GPT-5.2 Pro" },
    ],
    openrouter: [], // dynamically fetched from OpenRouter API
    local: [],
  };

/**
 * Validate an API key by making a lightweight request to the provider.
 * Returns { valid: boolean; error?: string }
 */
export async function validateAPIKey(
  provider: AIProvider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey.trim()) {
    return { valid: false, error: "API key is required" };
  }

  try {
    switch (provider) {
      case "google": {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          { method: "GET" }
        );
        if (res.ok) return { valid: true };
        const data = await res.json().catch(() => null);
        return {
          valid: false,
          error: data?.error?.message || `HTTP ${res.status}`,
        };
      }

      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { valid: true };
        const data = await res.json().catch(() => null);
        return {
          valid: false,
          error: data?.error?.message || `HTTP ${res.status}`,
        };
      }

      case "openrouter": {
        // GET /api/v1/models with the API key — lightweight, no cost
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { valid: true };
        if (res.status === 401) {
          return { valid: false, error: "Invalid OpenRouter API key" };
        }
        return { valid: false, error: `HTTP ${res.status}` };
      }

      default:
        return { valid: false, error: "Unknown provider" };
    }
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Validate a local OpenAI-compatible endpoint by hitting /models.
 * No API key required — localhost only.
 */
export async function validateLocalEndpoint(
  url: string
): Promise<{ valid: boolean; error?: string }> {
  if (!url.trim()) {
    return { valid: false, error: "Endpoint URL is required" };
  }

  try {
    const base = url.replace(/\/+$/, "");
    const res = await fetch(`${base}/models`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { valid: true };
    return { valid: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
