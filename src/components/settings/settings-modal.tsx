"use client";

import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  GearSixIcon,
  SunIcon,
  MoonIcon,
  DesktopIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaletteIcon,
  OpenAiLogoIcon,
  DropIcon,
  SpinnerGapIcon,
  ImageIcon,
  TrashIcon,
  ScanIcon,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppConfigStore } from "@/stores/app-config-store";
import {
  AI_PROVIDERS,
  AI_MODELS,
  type AIProvider,
} from "@/lib/ai-validator";
import { ACCENT_COLORS } from "@/lib/theme-colors";
import { useTranslations } from "next-intl";
import { useLocaleStore, type Locale } from "@/stores/locale-store";
import { toast } from "sonner";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const t = useTranslations("settings");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-outline-variant/30 bg-surface/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-on-surface">
            <GearSixIcon weight="fill" className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="mt-2">
          <TabsList className="w-full bg-surface-variant/30">
            <TabsTrigger value="appearance" className="flex-1 gap-1.5 text-xs">
              <PaletteIcon weight="fill" className="h-3.5 w-3.5" />
              {t("appearance")}
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 gap-1.5 text-xs">
              <OpenAiLogoIcon weight="regular" className="h-3.5 w-3.5" />
              {t("modelConfig")}
            </TabsTrigger>
            <TabsTrigger value="watermark" className="flex-1 gap-1.5 text-xs">
              <DropIcon weight="fill" className="h-3.5 w-3.5" />
              {t("watermark")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="mt-4 space-y-5">
            <AppearanceSection />
          </TabsContent>
          <TabsContent value="ai" className="mt-4 space-y-5">
            <AIConfigSection />
          </TabsContent>
          <TabsContent value="watermark" className="mt-4 space-y-5">
            <WatermarkSection />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* =================================================================
   Appearance Section
   ================================================================= */
function AppearanceSection() {
  const t = useTranslations("settings");
  const { theme: currentTheme, setTheme: setNextTheme } = useTheme();
  const accentColor = useAppConfigStore((s) => s.theme.accentColor);
  const themeMode = useAppConfigStore((s) => s.theme.mode);
  const setTheme = useAppConfigStore((s) => s.setTheme);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const handleModeChange = (mode: "light" | "dark" | "system") => {
    setTheme({ mode });
    setNextTheme(mode);
  };

  const handleAccentChange = (hex: string) => {
    setTheme({ accentColor: hex });
  };

  const localeOptions: { value: Locale; label: string }[] = [
    { value: "en", label: "English" },
    { value: "zh", label: "简体中文" },
    { value: "zh-TW", label: "繁體中文" },
    { value: "ja", label: "日本語" },
  ];

  return (
    <>
      {/* Language */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-on-surface-variant">
          {t("language")}
        </Label>
        <div className="flex gap-1.5 rounded-xl border border-outline-variant/30 p-1">
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
      </div>

      <Separator className="bg-outline-variant/20" />

      {/* Color Mode */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-on-surface-variant">
          {t("colorMode")}
        </Label>
        <div className="flex gap-1.5 rounded-xl border border-outline-variant/30 p-1">
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
      </div>

      <Separator className="bg-outline-variant/20" />

      {/* Accent Color */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-on-surface-variant">
          {t("themeAccent")}
        </Label>
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(ACCENT_COLORS).map(([hex, palette]) => (
            <button
              key={hex}
              onClick={() => handleAccentChange(hex)}
              className={`group relative flex h-9 w-full items-center justify-center rounded-xl transition-all ${
                accentColor === hex
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: hex }}
              title={palette.label}
            >
              {accentColor === hex && (
                <CheckCircleIcon
                  weight="fill"
                  className="h-4 w-4 text-white drop-shadow-md"
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
      </div>
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
  const validateAndSetAIConfig = useAppConfigStore(
    (s) => s.validateAndSetAIConfig
  );
  const validateAndSetVisionKey = useAppConfigStore(
    (s) => s.validateAndSetVisionKey
  );

  const [localProvider, setLocalProvider] = useState<AIProvider>(aiProvider);
  const [localModel, setLocalModel] = useState(aiModel);
  const [localKey, setLocalKey] = useState(apiKeys[aiProvider] ?? "");
  const [localVisionKey, setLocalVisionKey] = useState(visionApiKey);
  const [validating, setValidating] = useState(false);
  const [validatingVision, setValidatingVision] = useState(false);

  // When provider changes, update local model + key
  const handleProviderChange = (value: string) => {
    const provider = value as AIProvider;
    setLocalProvider(provider);
    setLocalModel(AI_MODELS[provider][0].value);
    setLocalKey(apiKeys[provider] ?? "");
  };

  const handleValidateAndSave = useCallback(async () => {
    setValidating(true);
    try {
      const result = await validateAndSetAIConfig(
        localProvider,
        localModel,
        localKey
      );
      if (result.success) {
        toast.success(t("apiKeyValidated"), {
          description: `${AI_PROVIDERS.find((p) => p.value === localProvider)?.label} — ${localModel}`,
        });
      } else {
        toast.error(t("validationFailed"), {
          description: result.error || t("invalidApiKey"),
        });
      }
    } catch {
      toast.error(t("validationFailed"), { description: t("unexpectedError") });
    } finally {
      setValidating(false);
    }
  }, [localProvider, localModel, localKey, validateAndSetAIConfig]);

  const handleValidateVisionKey = useCallback(async () => {
    setValidatingVision(true);
    try {
      const result = await validateAndSetVisionKey(localVisionKey);
      if (result.success) {
        toast.success(t("visionKeySaved"));
      } else {
        toast.error(t("validationFailed"), {
          description: result.error || t("invalidApiKey"),
        });
      }
    } catch {
      toast.error(t("validationFailed"), { description: t("unexpectedError") });
    } finally {
      setValidatingVision(false);
    }
  }, [localVisionKey, validateAndSetVisionKey]);

  return (
    <>
      <div className="space-y-3">
        {/* Provider */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-on-surface-variant">
            {t("aiProvider")}
          </Label>
          <Select value={localProvider} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-9 border-outline-variant/40 bg-surface-variant/20 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-on-surface-variant">
            {t("model")}
          </Label>
          <Select value={localModel} onValueChange={setLocalModel}>
            <SelectTrigger className="h-9 border-outline-variant/40 bg-surface-variant/20 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS[localProvider].map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-on-surface-variant">
            {t("apiKey")}
          </Label>
          <div className="relative">
            <KeyIcon
              weight="fill"
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/40"
            />
            <Input
              type="password"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder={t("apiKeyPlaceholder", { provider: AI_PROVIDERS.find((p) => p.value === localProvider)?.label ?? "" })}
              className="h-9 border-outline-variant/40 bg-surface-variant/20 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Status */}
        {apiKeys[localProvider] && (
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircleIcon
              weight="fill"
              className="h-3.5 w-3.5 text-green-500"
            />
            <span className="text-on-surface-variant/60">
              {t("keySaved", { provider: AI_PROVIDERS.find((p) => p.value === localProvider)?.label ?? "" })}
            </span>
          </div>
        )}
      </div>

      <Separator className="bg-outline-variant/20" />

      {/* Validate & Save */}
      <Button
        onClick={handleValidateAndSave}
        disabled={validating || !localKey.trim()}
        className="w-full gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {validating ? (
          <>
            <SpinnerGapIcon
              weight="fill"
              className="h-4 w-4 animate-spin"
            />
            Validating...
          </>
        ) : (
          <>
            <CheckCircleIcon weight="fill" className="h-4 w-4" />
            {t("validateAndSave")}
          </>
        )}
      </Button>

      <Separator className="bg-outline-variant/20" />

      {/* ── Vision API Key (OCR) ── */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-on-surface-variant">
            {t("visionApiKey")}
          </Label>
          <p className="text-[11px] text-on-surface-variant/50">
            {t("visionApiKeyDesc")}
          </p>
          <div className="relative">
            <ScanIcon
              weight="fill"
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/40"
            />
            <Input
              type="password"
              value={localVisionKey}
              onChange={(e) => setLocalVisionKey(e.target.value)}
              placeholder={t("visionKeyPlaceholder")}
              className="h-9 border-outline-variant/40 bg-surface-variant/20 pl-8 text-sm"
            />
          </div>
        </div>

        {visionApiKey && (
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircleIcon
              weight="fill"
              className="h-3.5 w-3.5 text-green-500"
            />
            <span className="text-on-surface-variant/60">
              {t("visionKeySaved")}
            </span>
          </div>
        )}
      </div>

      <Button
        onClick={handleValidateVisionKey}
        disabled={validatingVision || !localVisionKey.trim()}
        className="w-full gap-2 bg-secondary font-semibold text-secondary-foreground hover:bg-secondary/90"
      >
        {validatingVision ? (
          <>
            <SpinnerGapIcon
              weight="fill"
              className="h-4 w-4 animate-spin"
            />
            Validating...
          </>
        ) : (
          <>
            <ScanIcon weight="fill" className="h-4 w-4" />
            {t("validateVisionKey")}
          </>
        )}
      </Button>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-on-surface-variant">
          {t("enableWatermark")}
        </Label>
        <Switch
          checked={watermark.enabled}
          onCheckedChange={(checked) => setWatermark({ enabled: checked })}
        />
      </div>

      {watermark.imageBase64 ? (
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-variant/15 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={watermark.imageBase64}
            alt="Watermark"
            className="h-12 w-12 rounded-lg object-contain"
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-on-surface">
              {t("watermarkUploaded")}
            </p>
            <p className="text-[11px] text-on-surface-variant/50">
              {t("rendersAtCorner")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive"
            onClick={() =>
              setWatermark({ imageBase64: null, enabled: false })
            }
          >
            <TrashIcon weight="fill" className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-outline-variant/30 py-6 transition-colors hover:border-primary/40 hover:bg-primary-container/5">
          <ImageIcon
            weight="fill"
            className="h-8 w-8 text-on-surface-variant/30"
          />
          <span className="text-xs text-on-surface-variant/60">
            {t("uploadWatermark")}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      )}

      {/* Size */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-on-surface-variant">
          Size
        </Label>
        <Select
          value={watermark.size}
          onValueChange={(v) =>
            setWatermark({ size: v as "small" | "default" | "large" })
          }
        >
          <SelectTrigger className="h-9 border-outline-variant/40 bg-surface-variant/20 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">{t("small")}</SelectItem>
            <SelectItem value="default">{t("default")}</SelectItem>
            <SelectItem value="large">{t("large")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
