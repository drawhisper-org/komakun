import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIProvider } from "@/lib/ai-validator";
import { validateAPIKey, validateLocalEndpoint } from "@/lib/ai-validator";
import { validateVisionKey } from "@/lib/google-vision";
import { validateReplicateKey } from "@/lib/lama-inpaint";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeConfig {
  mode: ThemeMode;
  accentColor: string;
}

export interface WatermarkConfig {
  enabled: boolean;
  imageBase64: string | null;
  size: "small" | "default" | "large";
  opacity: number;
}

export type InpaintMode = "replicate" | "local";

interface AppConfigState {
  theme: ThemeConfig;
  aiProvider: AIProvider;
  aiModel: string;
  apiKeys: Record<string, string>;
  /** Target language for manga translation (e.g. "English", "简体中文"). */
  targetLanguage: string;
  visionApiKey: string;
  replicateApiKey: string;
  inpaintMode: InpaintMode;
  localInpaintUrl: string;
  localLlmUrl: string;
  localLlmModel: string;
  watermark: WatermarkConfig;
  /** Default font family for new text blocks. */
  defaultFont: string;
  /** Default font size for new text blocks. */
  defaultFontSize: number;
}

interface AppConfigActions {
  setTheme: (theme: Partial<ThemeConfig>) => void;
  setAIProvider: (provider: AIProvider) => void;
  setAIModel: (model: string) => void;
  setTargetLanguage: (lang: string) => void;
  /** Validates the language model API key before saving. */
  validateAndSetAIConfig: (
    provider: AIProvider,
    model: string,
    key: string
  ) => Promise<{ success: boolean; error?: string }>;
  /** Validates and saves the Vision API key separately. */
  validateAndSetVisionKey: (
    key: string
  ) => Promise<{ success: boolean; error?: string }>;
  setReplicateApiKey: (key: string) => void;
  /** Validates Replicate API key before saving. */
  validateAndSetReplicateKey: (
    key: string
  ) => Promise<{ success: boolean; error?: string }>;
  setInpaintMode: (mode: InpaintMode) => void;
  setLocalInpaintUrl: (url: string) => void;
  setLocalLlmUrl: (url: string) => void;
  setLocalLlmModel: (model: string) => void;
  /** Validates local LLM endpoint connectivity. */
  validateAndSetLocalLlm: (
    url: string,
    model: string
  ) => Promise<{ success: boolean; error?: string }>;
  setWatermark: (watermark: Partial<WatermarkConfig>) => void;
  setDefaultFont: (font: string) => void;
  setDefaultFontSize: (size: number) => void;
}

export type AppConfigStore = AppConfigState & AppConfigActions;

export const useAppConfigStore = create<AppConfigStore>()(
  persist(
    (set, get) => ({
      // State
      theme: {
        mode: "dark",
        accentColor: "#689F38",
      },
      aiProvider: "google",
      aiModel: "gemini-3-flash-preview",
      apiKeys: {},
      targetLanguage: "English",
      visionApiKey: "",
      replicateApiKey: "",
      inpaintMode: "replicate",
      localInpaintUrl: "http://localhost:8080",
      localLlmUrl: "http://localhost:11434/v1",
      localLlmModel: "",
      watermark: {
        enabled: false,
        imageBase64: null,
        size: "default",
        opacity: 0.7,
      },
      defaultFont: "Comic Neue",
      defaultFontSize: 20,

      // Actions
      setTheme: (partial) =>
        set((s) => ({ theme: { ...s.theme, ...partial } })),

      setAIProvider: (provider) => set({ aiProvider: provider }),

      setAIModel: (model) => set({ aiModel: model }),

      setTargetLanguage: (lang) => set({ targetLanguage: lang }),

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

      validateAndSetVisionKey: async (key) => {
        const result = await validateVisionKey(key);
        if (result.valid) {
          set({ visionApiKey: key });
          return { success: true };
        }
        return { success: false, error: result.error };
      },

      setReplicateApiKey: (key) => set({ replicateApiKey: key }),

      validateAndSetReplicateKey: async (key) => {
        const result = await validateReplicateKey(key);
        if (result.valid) {
          set({ replicateApiKey: key });
          return { success: true };
        }
        return { success: false, error: result.error };
      },

      setInpaintMode: (mode) => set({ inpaintMode: mode }),

      setLocalInpaintUrl: (url) => set({ localInpaintUrl: url }),

      setLocalLlmUrl: (url) => set({ localLlmUrl: url }),

      setLocalLlmModel: (model) => set({ localLlmModel: model }),

      validateAndSetLocalLlm: async (url, model) => {
        const result = await validateLocalEndpoint(url);
        if (result.valid) {
          set({ aiProvider: "local", localLlmUrl: url, localLlmModel: model });
          return { success: true };
        }
        return { success: false, error: result.error };
      },

      setWatermark: (partial) =>
        set((s) => ({ watermark: { ...s.watermark, ...partial } })),

      setDefaultFont: (font) => set({ defaultFont: font }),

      setDefaultFontSize: (size) => set({ defaultFontSize: size }),
    }),
    {
      name: "komaflip-app-config",
      // Uses localStorage by default (lightweight store)
    }
  )
);
