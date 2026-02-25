"use client";

import { useState, useCallback, useRef } from "react";
import {
  ScanIcon,
  EraserIcon,
  TranslateIcon,
  TextTIcon,
  ChatCircleTextIcon,
  MegaphoneIcon,
  LightningIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  CaretUpIcon,
  CaretDownIcon,
  DownloadSimpleIcon,
  FilePngIcon,
  StackIcon,
  FileArrowDownIcon,
  FileArrowUpIcon,
  CaretDown as CaretDownSmIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectStore } from "@/stores/project-store";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function EditorRightSidebar() {
  const t = useTranslations("editor");
  const exportProject = useProjectStore((s) => s.exportProject);
  const importProject = useProjectStore((s) => s.importProject);
  const importInputRef = useRef<HTMLInputElement>(null);

  const activePage = useProjectStore(
    (s) => s.pages.find((p) => p.id === s.activePageId) ?? null
  );

  const speechBlocks =
    activePage?.textBlocks.filter((b) => b.type === "speech") ?? [];
  const narrationBlocks =
    activePage?.textBlocks.filter((b) => b.type === "narration") ?? [];
  const sfxBlocks =
    activePage?.textBlocks.filter((b) => b.type === "sfx") ?? [];

  const handleExportKoma = useCallback(() => {
    const data = exportProject();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.projectName || "project"}.koma`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("projectExported"), {
      description: `${data.projectName}.koma`,
    });
  }, [exportProject]);

  const handleImportKoma = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          importProject(data);
          toast.success(t("projectImported"), { description: data.projectName });
        } catch {
          toast.error(t("importFailed"), { description: t("invalidKomaFile") });
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [importProject]
  );

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-outline-variant/20 bg-surface">
      {/* Header: Export Dropdown + Import .koma */}
      <div className="flex items-center gap-2 border-b border-outline-variant/15 px-3 py-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-7 gap-1 bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <DownloadSimpleIcon weight="fill" className="h-3.5 w-3.5" />
              {t("export")}
              <CaretDownSmIcon weight="fill" className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuItem className="gap-2 text-sm">
              <FilePngIcon weight="fill" className="h-4 w-4" />
              {t("exportPng")}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-sm">
              <StackIcon weight="fill" className="h-4 w-4" />
              {t("exportPsd")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm" onClick={handleExportKoma}>
              <FileArrowDownIcon weight="fill" className="h-4 w-4" />
              {t("exportKoma")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 border-outline-variant/40 px-2.5 text-xs text-on-surface-variant hover:text-on-surface"
          onClick={() => importInputRef.current?.click()}
        >
          <FileArrowUpIcon weight="fill" className="h-3.5 w-3.5" />
          {t("importKoma")}
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept=".koma,.json"
          className="hidden"
          onChange={handleImportKoma}
        />
      </div>

      {/* AI Actions */}
      <div className="space-y-2 border-b border-outline-variant/15 px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
          {t("aiActions")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 justify-start gap-2 border-primary/30 bg-primary-container/20 text-xs font-semibold text-primary hover:bg-primary-container/40"
          >
            <ScanIcon weight="fill" className="h-4 w-4" />
            {t("runOcr")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 justify-start gap-2 border-secondary/30 bg-secondary-container/20 text-xs font-semibold text-secondary hover:bg-secondary-container/40"
          >
            <EraserIcon weight="fill" className="h-4 w-4" />
            {t("cleanBackground")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 justify-start gap-2 border-tertiary/30 bg-tertiary-container/20 text-xs font-semibold text-tertiary hover:bg-tertiary-container/40"
          >
            <TranslateIcon weight="fill" className="h-4 w-4" />
            {t("autoTranslate")}
          </Button>
        </div>
      </div>

      {/* Text Blocks */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
          {t("textBlocks")}
        </div>
        {!activePage ? (
          <EmptyState
            icon={TextTIcon}
            text={t("selectPageForBlocks")}
          />
        ) : speechBlocks.length === 0 &&
          narrationBlocks.length === 0 &&
          sfxBlocks.length === 0 ? (
          <EmptyState
            icon={ChatCircleTextIcon}
            text={t("runOcrToDetect")}
          />
        ) : (
          <div className="mt-2 space-y-3">
            {speechBlocks.length > 0 && (
              <TextBlockSection
                icon={ChatCircleTextIcon}
                label={t("speechBubbles")}
                blocks={speechBlocks}
              />
            )}
            {narrationBlocks.length > 0 && (
              <TextBlockSection
                icon={MegaphoneIcon}
                label={t("narration")}
                blocks={narrationBlocks}
              />
            )}
            {sfxBlocks.length > 0 && (
              <TextBlockSection
                icon={LightningIcon}
                label={t("soundEffects")}
                blocks={sfxBlocks}
              />
            )}
          </div>
        )}
      </div>

      {/* Typography (Collapsible) */}
      <TypographyPanel />
    </aside>
  );
}

/* ── Empty state ── */
function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ weight: "fill"; className: string }>;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon weight="fill" className="h-8 w-8 text-on-surface-variant/20" />
      <p className="text-xs text-on-surface-variant/40">{text}</p>
    </div>
  );
}

/* ── Text block section ── */
function TextBlockSection({
  icon: Icon,
  label,
  blocks,
}: {
  icon: React.ComponentType<{ weight: "fill"; className: string }>;
  label: string;
  blocks: { id: string; originalText: string; translatedText: string }[];
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon weight="fill" className="h-3.5 w-3.5 text-on-surface-variant" />
        <span className="text-[11px] font-semibold text-on-surface-variant">
          {label}
        </span>
        <span className="ml-auto text-[10px] text-on-surface-variant/50">
          {blocks.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="space-y-1 rounded-lg border border-outline-variant/15 bg-surface-variant/10 p-2"
          >
            <p className="text-[11px] leading-tight text-on-surface-variant/60">
              {block.originalText}
            </p>
            <Textarea
              defaultValue={block.translatedText}
              placeholder="Translation..."
              className="min-h-10 resize-none border-outline-variant/20 bg-surface/60 text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Collapsible Typography Panel ── */
function TypographyPanel() {
  const t = useTranslations("editor");
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-outline-variant/15">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 transition-colors hover:bg-surface-variant/15"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
          {t("typography")}
        </span>
        {open ? (
          <CaretUpIcon weight="fill" className="h-3 w-3 text-on-surface-variant/30" />
        ) : (
          <CaretDownIcon weight="fill" className="h-3 w-3 text-on-surface-variant/30" />
        )}
      </button>

      {open && (
        <div className="space-y-3 px-3 pb-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-on-surface-variant/60">
              {t("fontFamily")}
            </Label>
            <Input
              defaultValue={t("defaultFont")}
              className="h-7 border-outline-variant/30 bg-surface-variant/15 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-on-surface-variant/60">{t("size")}</Label>
              <Input
                type="number"
                defaultValue={16}
                className="h-7 border-outline-variant/30 bg-surface-variant/15 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-on-surface-variant/60">
                {t("lineHeight")}
              </Label>
              <Input
                type="number"
                defaultValue={1.4}
                step={0.1}
                className="h-7 border-outline-variant/30 bg-surface-variant/15 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-on-surface-variant/60">{t("color")}</Label>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md border border-outline-variant/30 bg-black" />
              <Input
                defaultValue="#000000"
                className="h-7 flex-1 border-outline-variant/30 bg-surface-variant/15 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-on-surface-variant/60">
              {t("alignment")}
            </Label>
            <div className="flex gap-0.5 rounded-lg border border-outline-variant/20 p-0.5">
              {[TextAlignLeftIcon, TextAlignCenterIcon, TextAlignRightIcon].map(
                (Icon, i) => (
                  <button
                    key={i}
                    className={`flex h-7 flex-1 items-center justify-center rounded-md text-sm transition-colors ${
                      i === 1
                        ? "bg-primary-container text-on-primary-container"
                        : "text-on-surface-variant hover:bg-surface-variant/30"
                    }`}
                  >
                    <Icon weight="fill" className="h-4 w-4" />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
