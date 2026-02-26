import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/openrouter/models
 *
 * Fetches top-weekly language models from OpenRouter.
 * Used by the settings UI to dynamically populate the model selector.
 * Returns up to 50 models, always including the default model.
 */

const DEFAULT_MODEL_ID = "google/gemini-3-flash-preview";
const DEFAULT_MODEL_LABEL = "Google: Gemini 3 Flash (Preview)";

interface OpenRouterModel {
  id: string;
  name: string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
  top_provider?: { is_moderated?: boolean };
  architecture?: { modality?: string; tokenizer?: string };
  supported_parameters?: string[];
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Fetch top-weekly ranked models
    const res = await fetch(
      "https://openrouter.ai/api/v1/models?order=top-weekly&supported_parameters=structured_output",
      { method: "GET", headers }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter returned ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    const allModels: OpenRouterModel[] = json.data ?? [];

    // Filter: must be a text language model with structured output support
    const languageModels = allModels.filter((m) => {
      const modality = m.architecture?.modality ?? "";
      // Must produce text output (e.g. "text->text", "text+image->text")
      if (modality && !modality.includes("text")) return false;
      // Exclude image/audio generation models
      if (modality.includes("->image") || modality.includes("->audio")) return false;
      // Exclude embedding/moderation utility models
      if (m.id.includes("embed") || m.id.includes("moderat")) return false;
      // Must support structured output or response_format
      const params = m.supported_parameters ?? [];
      if (
        !params.includes("structured_output") &&
        !params.includes("response_format")
      ) {
        return false;
      }
      return true;
    });

    // Take top 50
    const top50 = languageModels.slice(0, 50).map((m) => ({
      value: m.id,
      label: m.name || m.id,
      contextLength: m.context_length,
    }));

    // Ensure default model is always present at the top
    const hasDefault = top50.some((m) => m.value === DEFAULT_MODEL_ID);
    if (!hasDefault) {
      top50.unshift({
        value: DEFAULT_MODEL_ID,
        label: DEFAULT_MODEL_LABEL,
        contextLength: 1000000,
      });
    } else {
      // Move default to the top
      const idx = top50.findIndex((m) => m.value === DEFAULT_MODEL_ID);
      if (idx > 0) {
        const [item] = top50.splice(idx, 1);
        top50.unshift(item);
      }
    }

    return NextResponse.json({ models: top50 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch models" },
      { status: 500 }
    );
  }
}
