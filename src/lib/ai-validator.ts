/**
 * AI Provider Validation Logic
 * Makes lightweight API calls to validate keys before saving.
 */

export type AIProvider = "google" | "openai" | "anthropic";

export const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "google", label: "Google (Gemini)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

export const AI_MODELS: Record<AIProvider, { value: string; label: string }[]> =
  {
    google: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-2.0-pro", label: "Gemini 2.0 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
    openai: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    anthropic: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ],
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

      case "anthropic": {
        // Use a minimal messages request to validate
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        if (res.ok) return { valid: true };
        const data = await res.json().catch(() => null);
        // 400 with "credit" or "billing" means key is valid but no credits
        // 401 means invalid key
        if (res.status === 401) {
          return {
            valid: false,
            error: data?.error?.message || "Invalid API key",
          };
        }
        // Other errors (rate limit, etc.) mean the key is likely valid
        if (res.status === 429 || res.status === 400) {
          return { valid: true };
        }
        return {
          valid: false,
          error: data?.error?.message || `HTTP ${res.status}`,
        };
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
