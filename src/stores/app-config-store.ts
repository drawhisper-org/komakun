import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIProvider } from "@/lib/ai-validator";
import { validateAPIKey } from "@/lib/ai-validator";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeConfig {
  mode: ThemeMode;
  accentColor: string;
}

export interface WatermarkConfig {
  enabled: boolean;
  imageBase64: string | null;
  size: "small" | "default" | "large";
}

interface AppConfigState {
  theme: ThemeConfig;
  aiProvider: AIProvider;
  aiModel: string;
  apiKeys: Record<string, string>;
  watermark: WatermarkConfig;
}

interface AppConfigActions {
  setTheme: (theme: Partial<ThemeConfig>) => void;
  setAIProvider: (provider: AIProvider) => void;
  setAIModel: (model: string) => void;
  /** Validates the API key before saving. Returns true if valid. */
  validateAndSetAIConfig: (
    provider: AIProvider,
    model: string,
    key: string
  ) => Promise<{ success: boolean; error?: string }>;
  setWatermark: (watermark: Partial<WatermarkConfig>) => void;
}

export type AppConfigStore = AppConfigState & AppConfigActions;

export const useAppConfigStore = create<AppConfigStore>()(
  persist(
    (set, get) => ({
      // State
      theme: {
        mode: "dark",
        accentColor: "#303F9F",
      },
      aiProvider: "google",
      aiModel: "gemini-2.0-flash",
      apiKeys: {},
      watermark: {
        enabled: false,
        imageBase64: null,
        size: "default",
      },

      // Actions
      setTheme: (partial) =>
        set((s) => ({ theme: { ...s.theme, ...partial } })),

      setAIProvider: (provider) => set({ aiProvider: provider }),

      setAIModel: (model) => set({ aiModel: model }),

      validateAndSetAIConfig: async (provider, model, key) => {
        const result = await validateAPIKey(provider, key);
        if (result.valid) {
          set((s) => ({
            aiProvider: provider,
            aiModel: model,
            apiKeys: { ...s.apiKeys, [provider]: key },
          }));
          return { success: true };
        }
        return { success: false, error: result.error };
      },

      setWatermark: (partial) =>
        set((s) => ({ watermark: { ...s.watermark, ...partial } })),
    }),
    {
      name: "komaflip-app-config",
      // Uses localStorage by default (lightweight store)
    }
  )
);
