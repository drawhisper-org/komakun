"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  SunIcon,
  MoonIcon,
  DesktopIcon,
  KeyIcon,
  CheckCircleIcon,
  PaletteIcon,
  OpenAiLogoIcon,
  DropIcon,
  SpinnerGapIcon,
  ImageIcon,
  TrashIcon,
  ScanIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppConfigStore } from "@/stores/app-config-store";
import { useLocaleStore, type Locale } from "@/stores/locale-store";
import {
  AI_PROVIDERS,
  AI_MODELS,
  type AIProvider,
  validateLocalEndpoint,
} from "@/lib/ai-validator";
import { ACCENT_COLORS } from "@/lib/theme-colors";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type SettingsTab = "appearance" | "ai" | "watermark";

/* ── Reusable layout primitives ──────────────────────────────────── */

/** Card wrapper for each settings group */
function SettingsCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-variant/5 p-5">
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-on-surface">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-on-surface-variant/50">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** A single row: label + description on left, control widget on right */
function SettingRow({ label, description, children, vertical }: {
  label: string;
  description?: string;
  children: React.ReactNode;
  vertical?: boolean;
}) {
  if (vertical) {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-on-surface">{label}</p>
          {description && (
            <p className="mt-0.5 text-[11px] text-on-surface-variant/50">{description}</p>
          )}
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="shrink-0">
        <p className="text-xs font-medium text-on-surface">{label}</p>
        {description && (
          <p className="mt-0.5 max-w-xs text-[11px] text-on-surface-variant/50">{description}</p>
        )}
      </div>
      <div className="flex-1 max-w-sm">{children}</div>
    </div>
  );
}

/* ── Main view ───────────────────────────────────────────────────── */

export function SettingsView() {
  const t = useTranslations("settings");
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  const tabs: { value: SettingsTab; icon: React.ElementType; label: string }[] = [
    { value: "appearance", icon: PaletteIcon, label: t("appearance") },
    { value: "ai", icon: OpenAiLogoIcon, label: t("modelConfig") },
    { value: "watermark", icon: DropIcon, label: t("watermark") },
  ];

  return (
    <div className="px-8 py-6">
      {/* Tab row */}
      <div className="mb-6 flex items-center gap-1">
        {tabs.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === value
                ? "bg-surface-variant/40 text-on-surface"
                : "text-on-surface-variant/50 hover:text-on-surface"
            }`}
          >
            <Icon weight={activeTab === value ? "fill" : "regular"} className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Settings content — left-aligned, wide */}
      <div className="max-w-2xl space-y-5">
        {activeTab === "appearance" && <AppearanceSection />}
        {activeTab === "ai" && <AIConfigSection />}
        {activeTab === "watermark" && <WatermarkSection />}
      </div>
    </div>
  );
}

/* =================================================================
   Appearance Section
   ================================================================= */
function AppearanceSection() {
  const t = useTranslations("settings");
  const { setTheme: setNextTheme } = useTheme();
  const accentColor = useAppConfigStore((s) => s.theme.accentColor);
  const themeMode = useAppConfigStore((s) => s.theme.mode);
  const setTheme = useAppConfigStore((s) => s.setTheme);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const handleModeChange = (mode: "light" | "dark" | "system") => {
    setTheme({ mode });
    setNextTheme(mode);
  };

  const localeOptions: { value: Locale; label: string }[] = [
    { value: "en", label: "English" },
    { value: "zh", label: "简体中文" },
    { value: "zh-TW", label: "繁體中文" },
    { value: "ja", label: "日本語" },
  ];

  return (
    <>
      <SettingsCard title={t("language")}>
        <div className="flex gap-1.5 rounded-xl border border-outline-variant/20 p-1 max-w-sm">
          {localeOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setLocale(value)}
              className={`flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-medium transition-all ${
                locale === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-variant/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title={t("colorMode")}>
        <div className="flex gap-1.5 rounded-xl border border-outline-variant/20 p-1 max-w-xs">
          {[
            { value: "light" as const, icon: SunIcon, label: t("light") },
            { value: "dark" as const, icon: MoonIcon, label: t("dark") },
            { value: "system" as const, icon: DesktopIcon, label: t("system") },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => handleModeChange(value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                themeMode === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-variant/40"
              }`}
            >
              <Icon weight="fill" className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title={t("themeAccent")}>
        <div className="grid grid-cols-8 gap-2.5 max-w-xs">
          {Object.entries(ACCENT_COLORS).map(([hex, palette]) => (
            <button
              key={hex}
              onClick={() => setTheme({ accentColor: hex })}
              className={`group relative flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                accentColor === hex
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-surface scale-110"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: hex }}
              title={palette.label}
            >
              {accentColor === hex && (
                <CheckIcon
                  weight="bold"
                  className="h-3.5 w-3.5 text-white drop-shadow-md"
                />
              )}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-on-surface-variant/50">
          {t("active")}
          <span className="font-medium text-primary">
            {ACCENT_COLORS[accentColor]?.label ?? accentColor}
          </span>
        </p>
      </SettingsCard>
    </>
  );
}

/* =================================================================
   AI Configuration Section
   ================================================================= */
function AIConfigSection() {
  const t = useTranslations("settings");
  const aiProvider = useAppConfigStore((s) => s.aiProvider);
  const aiModel = useAppConfigStore((s) => s.aiModel);
  const apiKeys = useAppConfigStore((s) => s.apiKeys);
  const visionApiKey = useAppConfigStore((s) => s.visionApiKey);
  const replicateApiKey = useAppConfigStore((s) => s.replicateApiKey);
  const inpaintMode = useAppConfigStore((s) => s.inpaintMode);
  const localInpaintUrl = useAppConfigStore((s) => s.localInpaintUrl);
  const localLlmUrl = useAppConfigStore((s) => s.localLlmUrl);
  const localLlmModel = useAppConfigStore((s) => s.localLlmModel);
  const targetLanguage = useAppConfigStore((s) => s.targetLanguage);
  const setTargetLanguage = useAppConfigStore((s) => s.setTargetLanguage);
  const setReplicateApiKey = useAppConfigStore((s) => s.setReplicateApiKey);
  const validateAndSetReplicateKey = useAppConfigStore((s) => s.validateAndSetReplicateKey);
  const setInpaintMode = useAppConfigStore((s) => s.setInpaintMode);
  const setLocalInpaintUrl = useAppConfigStore((s) => s.setLocalInpaintUrl);
  const setLocalLlmUrl = useAppConfigStore((s) => s.setLocalLlmUrl);
  const setLocalLlmModel = useAppConfigStore((s) => s.setLocalLlmModel);
  const validateAndSetAIConfig = useAppConfigStore((s) => s.validateAndSetAIConfig);
  const validateAndSetLocalLlm = useAppConfigStore((s) => s.validateAndSetLocalLlm);
  const validateAndSetVisionKey = useAppConfigStore((s) => s.validateAndSetVisionKey);

  const [localProvider, setLocalProvider] = useState<AIProvider>(aiProvider);
  const [localModel, setLocalModel] = useState(aiModel);
  const [localKey, setLocalKey] = useState(apiKeys[aiProvider] ?? "");
  const [localVisionKey, setLocalVisionKey] = useState(visionApiKey);
  const [localReplicateKey, setLocalReplicateKey] = useState(replicateApiKey);
  const [localUrl, setLocalUrl] = useState(localInpaintUrl);
  const [draftLlmUrl, setDraftLlmUrl] = useState(localLlmUrl);
  const [draftLlmModel, setDraftLlmModel] = useState(localLlmModel);
  const [validating, setValidating] = useState(false);
  const [validatingVision, setValidatingVision] = useState(false);
  const [validatingReplicate, setValidatingReplicate] = useState(false);

  // Dynamic model list for OpenRouter
  const [openrouterModels, setOpenrouterModels] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch OpenRouter models when provider is openrouter
  useEffect(() => {
    if (localProvider !== "openrouter") return;
    let cancelled = false;
    setLoadingModels(true);
    fetch("/api/openrouter/models", {
      headers: localKey
        ? { Authorization: `Bearer ${localKey}` }
        : undefined,
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const models = (data.models ?? []) as {
          value: string;
          label: string;
        }[];
        setOpenrouterModels(models);
        // Auto-select default model if current is empty
        if (!localModel) {
          const defaultModel = models.find(
            (m: { value: string }) => m.value === "google/gemini-3-flash-preview"
          );
          setLocalModel(defaultModel?.value ?? models[0]?.value ?? "");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingModels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [localProvider]);

  // Determine which model list to show
  const modelOptions =
    localProvider === "openrouter"
      ? openrouterModels
      : AI_MODELS[localProvider];
  const hasModels = modelOptions.length > 0;

  // Available providers (filter "local" to dev-only)
  const isDev = process.env.NODE_ENV === "development";
  const visibleProviders = AI_PROVIDERS.filter(
    (p) => p.value !== "local" || isDev
  );

  const targetLanguageOptions = [
    { value: "English", label: "English" },
    { value: "简体中文", label: "简体中文 (Simplified Chinese)" },
    { value: "繁體中文", label: "繁體中文 (Traditional Chinese)" },
    { value: "日本語", label: "日本語 (Japanese)" },
    { value: "한국어", label: "한국어 (Korean)" },
    { value: "Español", label: "Español (Spanish)" },
    { value: "Français", label: "Français (French)" },
    { value: "Deutsch", label: "Deutsch (German)" },
    { value: "Português", label: "Português (Portuguese)" },
    { value: "Italiano", label: "Italiano (Italian)" },
    { value: "Русский", label: "Русский (Russian)" },
    { value: "العربية", label: "العربية (Arabic)" },
    { value: "हिन्दी", label: "हिन्दी (Hindi)" },
    { value: "Bahasa Indonesia", label: "Bahasa Indonesia" },
    { value: "Bahasa Melayu", label: "Bahasa Melayu (Malay)" },
    { value: "Tiếng Việt", label: "Tiếng Việt (Vietnamese)" },
    { value: "ไทย", label: "ไทย (Thai)" },
    { value: "Türkçe", label: "Türkçe (Turkish)" },
    { value: "Polski", label: "Polski (Polish)" },
    { value: "Nederlands", label: "Nederlands (Dutch)" },
    { value: "Українська", label: "Українська (Ukrainian)" },
    { value: "Filipino", label: "Filipino (Tagalog)" },
    { value: "Čeština", label: "Čeština (Czech)" },
    { value: "Svenska", label: "Svenska (Swedish)" },
  ];

  const handleProviderChange = (value: string) => {
    const provider = value as AIProvider;
    setLocalProvider(provider);
    if (provider === "local") {
      setDraftLlmUrl(localLlmUrl);
      setDraftLlmModel(localLlmModel);
    } else if (provider === "replicate") {
      const models = AI_MODELS[provider];
      setLocalModel(models[0]?.value ?? "");
    } else {
      const models =
        provider === "openrouter"
          ? openrouterModels
          : AI_MODELS[provider];
      if (provider === "openrouter") {
        const def = models.find((m) => m.value === "google/gemini-3-flash-preview");
        setLocalModel(def?.value ?? models[0]?.value ?? "");
      } else {
        setLocalModel(models[0]?.value ?? "");
      }
      setLocalKey(apiKeys[provider] ?? "");
    }
  };

  const handleValidateAndSave = useCallback(async () => {
    setValidating(true);
    try {
      if (localProvider === "local") {
        const result = await validateAndSetLocalLlm(draftLlmUrl, draftLlmModel);
        if (result.success) {
          toast.success(t("connectionSuccess"), {
            description: `${draftLlmUrl} — ${draftLlmModel || "custom"}`,
          });
        } else {
          toast.error(t("validationFailed"), { description: result.error || t("connectionFailed") });
        }
      } else if (localProvider === "replicate") {
        // Replicate uses the shared replicateApiKey
        if (!replicateApiKey) {
          toast.error(t("validationFailed"), { description: t("replicateKeyRequiredForLlm") });
        } else {
          const result = await validateAndSetAIConfig(localProvider, localModel, replicateApiKey);
          if (result.success) {
            toast.success(t("apiKeyValidated"), {
              description: `Replicate \u2014 ${localModel}`,
            });
          } else {
            toast.error(t("validationFailed"), { description: result.error || t("invalidApiKey") });
          }
        }
      } else {
        const result = await validateAndSetAIConfig(localProvider, localModel, localKey);
        if (result.success) {
          toast.success(t("apiKeyValidated"), {
            description: `${AI_PROVIDERS.find((p) => p.value === localProvider)?.label} — ${localModel}`,
          });
        } else {
          toast.error(t("validationFailed"), { description: result.error || t("invalidApiKey") });
        }
      }
    } catch {
      toast.error(t("validationFailed"), { description: t("unexpectedError") });
    } finally {
      setValidating(false);
    }
  }, [localProvider, localModel, localKey, replicateApiKey, draftLlmUrl, draftLlmModel, validateAndSetAIConfig, validateAndSetLocalLlm, t]);

  const handleValidateVisionKey = useCallback(async () => {
    setValidatingVision(true);
    try {
      const result = await validateAndSetVisionKey(localVisionKey);
      if (result.success) {
        toast.success(t("visionKeySaved"));
      } else {
        toast.error(t("validationFailed"), { description: result.error || t("invalidApiKey") });
      }
    } catch {
      toast.error(t("validationFailed"), { description: t("unexpectedError") });
    } finally {
      setValidatingVision(false);
    }
  }, [localVisionKey, validateAndSetVisionKey, t]);

  const handleSaveReplicateKey = useCallback(async () => {
    setValidatingReplicate(true);
    try {
      const result = await validateAndSetReplicateKey(localReplicateKey);
      if (result.success) {
        toast.success(t("replicateKeySaved"));
      } else {
        toast.error(t("validationFailed"), { description: result.error || t("invalidApiKey") });
      }
    } catch {
      toast.error(t("validationFailed"), { description: t("unexpectedError") });
    } finally {
      setValidatingReplicate(false);
    }
  }, [localReplicateKey, validateAndSetReplicateKey, t]);

  const handleSaveLocalUrl = useCallback(() => {
    setLocalInpaintUrl(localUrl);
    toast.success(t("localUrlSaved"));
  }, [localUrl, setLocalInpaintUrl, t]);

  return (
    <>
      {/* ── Translation LLM ── */}
      <SettingsCard
        title={t("translationLlm")}
        description={t("translationLlmDesc")}
      >
        <SettingRow label={t("targetLanguage")}>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="h-9 border-outline-variant/30 bg-surface-variant/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targetLanguageOptions.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label={t("aiProvider")}>
          <Select value={localProvider} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-9 border-outline-variant/30 bg-surface-variant/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleProviders.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        {localProvider === "local" ? (
          <>
            <SettingRow label={t("localLlmEndpoint")} vertical>
              <div className="flex items-center gap-2 max-w-sm">
                <Input
                  value={draftLlmUrl}
                  onChange={(e) => setDraftLlmUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="h-9 flex-1 border-outline-variant/30 bg-surface-variant/10 text-sm font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-on-surface-variant/50">
                {t("localLlmEndpointDesc")}
              </p>
            </SettingRow>

            <SettingRow label={t("localLlmModel")} vertical>
              <div className="flex items-center gap-2 max-w-sm">
                <Input
                  value={draftLlmModel}
                  onChange={(e) => setDraftLlmModel(e.target.value)}
                  placeholder="llama3, gemma2, qwen2.5..."
                  className="h-9 flex-1 border-outline-variant/30 bg-surface-variant/10 text-sm font-mono"
                />
                <Button
                  onClick={handleValidateAndSave}
                  disabled={validating || !draftLlmUrl.trim()}
                  size="sm"
                  className="h-9 gap-1.5 bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {validating ? (
                    <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircleIcon weight="fill" className="h-3.5 w-3.5" />
                  )}
                  {validating ? t("validating") : t("testConnection")}
                </Button>
              </div>
            </SettingRow>

            {aiProvider === "local" && localLlmUrl && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <CheckCircleIcon weight="fill" className="h-3.5 w-3.5 text-green-500" />
                <span className="text-on-surface-variant/60">
                  {t("localLlmSaved")}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <SettingRow label={t("model")}>
              {hasModels ? (
                <Select value={localModel} onValueChange={setLocalModel}>
                  <SelectTrigger className="h-9 border-outline-variant/30 bg-surface-variant/10 text-sm">
                    <SelectValue placeholder={loadingModels ? "Loading models…" : undefined} />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  placeholder={t("modelNamePlaceholder")}
                  className="h-9 border-outline-variant/30 bg-surface-variant/10 text-sm"
                />
              )}
              {loadingModels && (
                <SpinnerGapIcon className="ml-1.5 inline h-3 w-3 animate-spin text-primary" />
              )}
            </SettingRow>

            <SettingRow label={t("apiKey")} vertical>
            {localProvider === "replicate" ? (
              /* Replicate uses the shared API key from the Inpainting section */
              replicateApiKey ? (
                <div className="flex items-center gap-2 max-w-sm">
                  <div className="flex-1 flex items-center gap-1.5 text-xs">
                    <CheckCircleIcon weight="fill" className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-on-surface-variant/60">{t("replicateKeyShared")}</span>
                  </div>
                  <Button
                    onClick={handleValidateAndSave}
                    disabled={validating}
                    size="sm"
                    className="h-9 gap-1.5 bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {validating ? (
                      <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircleIcon weight="fill" className="h-3.5 w-3.5" />
                    )}
                    {validating ? t("validating") : t("validateAndSave")}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant/60">{t("replicateKeyRequiredForLlm")}</p>
              )
            ) : (
              <>
              <div className="flex items-center gap-2 max-w-sm">
                <div className="relative flex-1">
                  <KeyIcon weight="fill" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/40" />
                  <Input
                    type="password"
                    value={localKey}
                    onChange={(e) => setLocalKey(e.target.value)}
                    placeholder={t("apiKeyPlaceholder", { provider: AI_PROVIDERS.find((p) => p.value === localProvider)?.label ?? "" })}
                    className="h-9 border-outline-variant/30 bg-surface-variant/10 pl-8 text-sm"
                  />
                </div>
                <Button
                  onClick={handleValidateAndSave}
                  disabled={validating || !localKey.trim()}
                  size="sm"
                  className="h-9 gap-1.5 bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {validating ? (
                    <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircleIcon weight="fill" className="h-3.5 w-3.5" />
                  )}
                  {validating ? t("validating") : t("validateAndSave")}
                </Button>
              </div>
              {apiKeys[localProvider] && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <CheckCircleIcon weight="fill" className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-on-surface-variant/60">
                    {t("keySaved", { provider: AI_PROVIDERS.find((p) => p.value === localProvider)?.label ?? "" })}
                  </span>
                </div>
              )}
              </>
            )}
            </SettingRow>
          </>
        )}
      </SettingsCard>

      {/* ── Vision API Key (OCR) ── */}
      <SettingsCard
        title={t("ocrVision")}
        description={t("visionApiKeyDesc")}
      >
        <SettingRow label={t("visionApiKey")} vertical>
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <ScanIcon weight="fill" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/40" />
              <Input
                type="password"
                value={localVisionKey}
                onChange={(e) => setLocalVisionKey(e.target.value)}
                placeholder={t("visionKeyPlaceholder")}
                className="h-9 border-outline-variant/30 bg-surface-variant/10 pl-8 text-sm"
              />
            </div>
            <Button
              onClick={handleValidateVisionKey}
              disabled={validatingVision || !localVisionKey.trim()}
              size="sm"
              className="h-9 gap-1.5 bg-secondary px-4 font-semibold text-secondary-foreground hover:bg-secondary/90"
            >
              {validatingVision ? (
                <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ScanIcon weight="fill" className="h-3.5 w-3.5" />
              )}
              {validatingVision ? t("validating") : t("validateVisionKey")}
            </Button>
          </div>
          {visionApiKey && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <CheckCircleIcon weight="fill" className="h-3.5 w-3.5 text-green-500" />
              <span className="text-on-surface-variant/60">{t("visionKeySaved")}</span>
            </div>
          )}
        </SettingRow>
      </SettingsCard>

      {/* ── Image Inpainting ── */}
      <SettingsCard
        title={t("imageInpainting")}
        description={t("inpaintDesc")}
      >
        {isDev && (
          <SettingRow label={t("inpaintMode")}>
            <div className="flex gap-1.5 rounded-xl border border-outline-variant/20 p-1">
              <button
                onClick={() => setInpaintMode("replicate")}
                className={`flex flex-1 items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-all ${
                  inpaintMode === "replicate"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-variant/40"
                }`}
              >
                {t("replicateCloud")}
              </button>
              <button
                onClick={() => setInpaintMode("local")}
                className={`flex flex-1 items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-all ${
                  inpaintMode === "local"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-variant/40"
                }`}
              >
                {t("localService")}
              </button>
            </div>
          </SettingRow>
        )}

        {inpaintMode === "replicate" ? (
          <SettingRow
            label={t("replicateApiKey")}
            description={t("replicateApiKeyDesc")}
            vertical
          >
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <KeyIcon weight="fill" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/40" />
                <Input
                  type="password"
                  value={localReplicateKey}
                  onChange={(e) => setLocalReplicateKey(e.target.value)}
                  placeholder="r8_xxxx..."
                  className="h-9 border-outline-variant/30 bg-surface-variant/10 pl-8 text-sm"
                />
              </div>
              <Button
                onClick={handleSaveReplicateKey}
                disabled={validatingReplicate || !localReplicateKey.trim()}
                size="sm"
                className="h-9 gap-1.5 bg-secondary px-4 font-semibold text-secondary-foreground hover:bg-secondary/90"
              >
                {validatingReplicate ? (
                  <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircleIcon weight="fill" className="h-3.5 w-3.5" />
                )}
                {validatingReplicate ? t("validating") : t("validateAndSave")}
              </Button>
            </div>
            {replicateApiKey && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <CheckCircleIcon weight="fill" className="h-3.5 w-3.5 text-green-500" />
                <span className="text-on-surface-variant/60">{t("replicateKeySaved")}</span>
              </div>
            )}
          </SettingRow>
        ) : (
          <SettingRow
            label={t("localEndpoint")}
            description={t("localEndpointDesc")}
            vertical
          >
            <div className="flex items-center gap-2 max-w-sm">
              <Input
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="h-9 flex-1 border-outline-variant/30 bg-surface-variant/10 text-sm font-mono"
              />
              <Button
                onClick={handleSaveLocalUrl}
                disabled={!localUrl.trim()}
                size="sm"
                className="h-9 gap-1.5 bg-secondary px-4 font-semibold text-secondary-foreground hover:bg-secondary/90"
              >
                <CheckCircleIcon weight="fill" className="h-3.5 w-3.5" />
                {t("saveLocalUrl")}
              </Button>
            </div>
          </SettingRow>
        )}
      </SettingsCard>
    </>
  );
}

/* =================================================================
   Watermark Section
   ================================================================= */
function WatermarkSection() {
  const t = useTranslations("settings");
  const watermark = useAppConfigStore((s) => s.watermark);
  const setWatermark = useAppConfigStore((s) => s.setWatermark);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setWatermark({ imageBase64: reader.result as string, enabled: true });
      };
      reader.readAsDataURL(file);
    },
    [setWatermark]
  );

  return (
    <SettingsCard title={t("watermark")}>
      <SettingRow label={t("enableWatermark")}>
        <div className="flex justify-end">
          <Switch
            checked={watermark.enabled}
            onCheckedChange={(checked) => setWatermark({ enabled: checked })}
          />
        </div>
      </SettingRow>

      <SettingRow label={t("uploadWatermark")} description={t("rendersAtCorner")} vertical>
        {watermark.imageBase64 ? (
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-variant/10 p-3 max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={watermark.imageBase64}
              alt="Watermark"
              className="h-12 w-12 rounded-lg object-contain"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-on-surface">{t("watermarkUploaded")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive"
              onClick={() => setWatermark({ imageBase64: null, enabled: false })}
            >
              <TrashIcon weight="fill" className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex max-w-sm cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-outline-variant/25 py-5 transition-colors hover:border-primary/40 hover:bg-primary-container/5">
            <ImageIcon weight="fill" className="h-7 w-7 text-on-surface-variant/25" />
            <span className="text-xs text-on-surface-variant/50">{t("uploadWatermark")}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </SettingRow>

      <SettingRow label={t("watermarkSize")}>
        <div className="flex gap-1.5 rounded-xl border border-outline-variant/20 p-1">
          {(["small", "default", "large"] as const).map((sz) => (
            <button
              key={sz}
              onClick={() => setWatermark({ size: sz })}
              className={`flex flex-1 items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-all ${
                watermark.size === sz
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-variant/40"
              }`}
            >
              {t(sz)}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow label={`${t("watermarkOpacity")} — ${Math.round((watermark.opacity ?? 0.7) * 100)}%`}>
        <Slider
          min={10}
          max={100}
          step={5}
          value={[Math.round((watermark.opacity ?? 0.7) * 100)]}
          onValueChange={([v]) => setWatermark({ opacity: v / 100 })}
          className="max-w-sm"
        />
      </SettingRow>
    </SettingsCard>
  );
}
