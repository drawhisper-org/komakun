"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  AlignTopSimpleIcon,
  AlignCenterVerticalSimpleIcon,
  AlignBottomSimpleIcon,
  FileArrowDownIcon,
  CaretDownIcon,
  CircleNotchIcon,
  CheckCircleIcon,
  SelectionIcon,
  XIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  ArrowsHorizontalIcon,
  ArrowsDownUpIcon,
  TextBolderIcon,
  TextItalicIcon,
  FileZipIcon,
  ImageIcon,
  ExportIcon,
  StackIcon,
  TrashIcon,
  GitMergeIcon,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MANGA_FONTS, DEFAULT_FONT } from "@/lib/manga-fonts";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProjectStore, type TextBlock } from "@/stores/project-store";
import { useAppConfigStore } from "@/stores/app-config-store";
import { useOcrUiStore } from "@/stores/ocr-store";
import { useEditorSelectionStore } from "@/stores/editor-selection-store";
import { useUserStore } from "@/stores/user-store";
import { useHistoryStore } from "@/stores/history-store";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { detectText, cropImageRegion, cropAndMaskRegion } from "@/lib/google-vision";
import { exportPageAsPng, exportPageAsPsd, exportProjectAsZip, exportProjectAsPsdZip } from "@/lib/export-utils";
import { inpaintImage } from "@/lib/lama-inpaint";
import { translateTextBlocks } from "@/lib/translate-service";

/* \u2500\u2500 Platform detection \u2500\u2500 */
function useIsMac() {
  return useMemo(() => {
    if (typeof navigator === "undefined") return true;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);
}

export function EditorRightSidebar() {
  const t = useTranslations("editor");
  const isMac = useIsMac();
  const exportProject = useProjectStore((s) => s.exportProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const projectId = useProjectStore((s) => s.projectId);
  const addTextBlocks = useProjectStore((s) => s.addTextBlocks);
  const restorePageSnapshot = useProjectStore((s) => s.restorePageSnapshot);
  const setCleanedImage = useProjectStore((s) => s.setCleanedImage);
  const clearInpaintStrokes = useProjectStore((s) => s.clearInpaintStrokes);
  const setPageOcrCompleted = useProjectStore((s) => s.setPageOcrCompleted);
  const pendingSelection = useOcrUiStore((s) => s.pendingSelection);
  const clearSelection = useOcrUiStore((s) => s.clearSelection);

  // Inpaint config
  const inpaintMode = useAppConfigStore((s) => s.inpaintMode);
  const replicateApiKey = useAppConfigStore((s) => s.replicateApiKey);
  const localInpaintUrl = useAppConfigStore((s) => s.localInpaintUrl);

  // Translation config
  const aiProvider = useAppConfigStore((s) => s.aiProvider);
  const aiModel = useAppConfigStore((s) => s.aiModel);
  const apiKeys = useAppConfigStore((s) => s.apiKeys);
  const targetLanguage = useAppConfigStore((s) => s.targetLanguage);
  const localLlmUrl = useAppConfigStore((s) => s.localLlmUrl);
  const localLlmModel = useAppConfigStore((s) => s.localLlmModel);
  const updateTextBlock = useProjectStore((s) => s.updateTextBlock);

  const activePage = useProjectStore(
    (s) => s.pages.find((p) => p.id === s.activePageId) ?? null
  );
  const pages = useProjectStore((s) => s.pages);
  const projectName = useProjectStore((s) => s.projectName);

  // History store
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const undoHistory = useHistoryStore((s) => s.undo);
  const redoHistory = useHistoryStore((s) => s.redo);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

  // Clear history when switching pages
  const activePageId = activePage?.id;
  useEffect(() => {
    clearHistory();
  }, [activePageId, clearHistory]);

  const getCurrentSnapshot = useCallback(() => {
    if (!activePage) return null;
    return {
      pageId: activePage.id,
      textBlocks: [...activePage.textBlocks],
      inpaintStrokes: [...(activePage.inpaintStrokes ?? [])],
    };
  }, [activePage]);

  const handleUndo = useCallback(() => {
    const current = getCurrentSnapshot();
    if (!current) return;
    const snapshot = undoHistory(current);
    if (snapshot) {
      restorePageSnapshot(snapshot.pageId, {
        textBlocks: snapshot.textBlocks,
        inpaintStrokes: snapshot.inpaintStrokes,
      });
      toast.success(t("undone"));
    }
  }, [getCurrentSnapshot, undoHistory, restorePageSnapshot, t]);

  const handleRedo = useCallback(() => {
    const current = getCurrentSnapshot();
    if (!current) return;
    const snapshot = redoHistory(current);
    if (snapshot) {
      restorePageSnapshot(snapshot.pageId, {
        textBlocks: snapshot.textBlocks,
        inpaintStrokes: snapshot.inpaintStrokes,
      });
      toast.success(t("redone"));
    }
  }, [getCurrentSnapshot, redoHistory, restorePageSnapshot, t]);

  // Cmd+Z / Cmd+Shift+Z (or Cmd+Y) keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.key.toLowerCase() === "z" && e.shiftKey) ||
        e.key.toLowerCase() === "y"
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPsd, setExportingPsd] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingPsdZip, setExportingPsdZip] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const speechBlocks =
    activePage?.textBlocks.filter((b) => b.type === "speech" && b.source !== "manual") ?? [];
  const narrationBlocks =
    activePage?.textBlocks.filter((b) => b.type === "narration") ?? [];
  const sfxBlocks =
    activePage?.textBlocks.filter((b) => b.type === "sfx") ?? [];
  const manualBlocks =
    activePage?.textBlocks.filter((b) => b.source === "manual") ?? [];

  // \u2500\u2500 Export handlers \u2500\u2500
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
  }, [exportProject, t]);

  const handleExportPng = useCallback(async () => {
    if (!activePage || exportingPng) return;
    setExportingPng(true);
    try {
      await exportPageAsPng(activePage, projectName);
      toast.success(t("exportedPng"), { description: activePage.fileName });
    } catch (err) {
      toast.error(t("exportFailed"), { description: String(err) });
    } finally {
      setExportingPng(false);
    }
  }, [activePage, exportingPng, projectName, t]);

  const handleExportZip = useCallback(async () => {
    if (pages.length === 0 || exportingZip) return;
    setExportingZip(true);
    try {
      await exportProjectAsZip(pages, projectName);
      toast.success(t("projectExported"), { description: `${projectName}.zip` });
    } catch (err) {
      toast.error(t("exportFailed"), { description: String(err) });
    } finally {
      setExportingZip(false);
    }
  }, [pages, exportingZip, projectName, t]);

  const handleExportPsd = useCallback(async () => {
    if (!activePage || exportingPsd) return;
    setExportingPsd(true);
    try {
      await exportPageAsPsd(activePage, projectName);
      toast.success(t("exportedPsd"), { description: activePage.fileName });
    } catch (err) {
      toast.error(t("exportFailed"), { description: String(err) });
    } finally {
      setExportingPsd(false);
    }
  }, [activePage, exportingPsd, projectName, t]);

  const handleExportPsdZip = useCallback(async () => {
    if (pages.length === 0 || exportingPsdZip) return;
    setExportingPsdZip(true);
    try {
      await exportProjectAsPsdZip(pages, projectName);
      toast.success(t("projectExported"), { description: `${projectName}_psd.zip` });
    } catch (err) {
      toast.error(t("exportFailed"), { description: String(err) });
    } finally {
      setExportingPsdZip(false);
    }
  }, [pages, exportingPsdZip, projectName, t]);

  const handleDeleteProject = useCallback(async () => {
    if (!projectId) return;
    await deleteProject(projectId);
    toast.success(t("projectDeleted"));
    window.location.href = "/";
  }, [projectId, deleteProject, t]);

  const visionApiKey = useAppConfigStore((s) => s.visionApiKey);

  const handleRunOcr = useCallback(async () => {
    if (!activePage || ocrLoading) return;
    if (activePage.ocrCompleted && !pendingSelection) return;
    if (!visionApiKey.trim()) {
      toast.error(t("ocrFailed"), { description: t("visionKeyRequired") });
      return;
    }

    setOcrLoading(true);
    try {
      let result;
      let offsetX = 0;
      let offsetY = 0;

      if (pendingSelection) {
        let croppedBase64: string;
        if (
          pendingSelection.mode === "lasso" &&
          pendingSelection.lassoPoints &&
          pendingSelection.lassoPoints.length >= 6
        ) {
          croppedBase64 = await cropAndMaskRegion(
            activePage.originalImageBase64,
            Math.round(pendingSelection.x),
            Math.round(pendingSelection.y),
            Math.round(pendingSelection.width),
            Math.round(pendingSelection.height),
            pendingSelection.lassoPoints
          );
        } else {
          croppedBase64 = await cropImageRegion(
            activePage.originalImageBase64,
            Math.round(pendingSelection.x),
            Math.round(pendingSelection.y),
            Math.round(pendingSelection.width),
            Math.round(pendingSelection.height)
          );
        }
        result = await detectText(croppedBase64, visionApiKey);
        offsetX = Math.round(pendingSelection.x);
        offsetY = Math.round(pendingSelection.y);
        clearSelection();
      } else {
        result = await detectText(activePage.originalImageBase64, visionApiKey);
      }

      const newBlocks: TextBlock[] = result.blocks.map((b, i) => ({
        id: `ocr-${Date.now()}-${i}`,
        type: b.type,
        source: "ocr" as const,
        originalText: b.text,
        translatedText: "",
        x: b.x + offsetX,
        y: b.y + offsetY,
        width: b.width,
        height: b.height,
        fontSize: Math.max(
          12,
          Math.min(
            24,
            Math.round(
              (b.height / Math.max(1, b.text.split("\n").length)) * 0.8
            )
          )
        ),
        boundingPoly: b.boundingPoly.map((v) => ({
          x: v.x + offsetX,
          y: v.y + offsetY,
        })),
      }));

      addTextBlocks(activePage.id, newBlocks);
      if (!pendingSelection) {
        setPageOcrCompleted(activePage.id, true);
      }

      toast.success(t("ocrCompleted"), {
        description: `${newBlocks.length} ${t("textBlocksDetected")}`,
      });
    } catch (err) {
      toast.error(t("ocrFailed"), { description: String(err) });
    } finally {
      setOcrLoading(false);
    }
  }, [activePage, ocrLoading, pendingSelection, visionApiKey, addTextBlocks, setPageOcrCompleted, clearSelection, t]);

  // ── Clean background ──
  const handleCleanBackground = useCallback(async () => {
    if (!activePage || cleanLoading) return;

    // Validate config
    if (inpaintMode === "replicate" && !replicateApiKey.trim()) {
      toast.error(t("cleanFailed"), { description: t("replicateKeyRequired") });
      return;
    }

    // Need something to inpaint (OCR boxes or strokes)
    const hasContent =
      activePage.textBlocks.length > 0 ||
      (activePage.inpaintStrokes ?? []).length > 0;
    if (!hasContent) {
      toast.error(t("cleanFailed"), { description: t("noMaskContent") });
      return;
    }

    setCleanLoading(true);
    try {
      // Determine image dimensions from the original image
      const img = new Image();
      img.src = activePage.originalImageBase64;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const cleanedBase64 = await inpaintImage(
        activePage,
        img.naturalWidth,
        img.naturalHeight,
        {
          mode: inpaintMode,
          replicateApiKey,
          localEndpoint: localInpaintUrl,
        }
      );

      setCleanedImage(activePage.id, cleanedBase64);
      // Clear inpaint strokes — they've been applied to the cleaned image
      clearInpaintStrokes(activePage.id);
      toast.success(t("cleanCompleted"));
    } catch (err) {
      toast.error(t("cleanFailed"), { description: String(err) });
    } finally {
      setCleanLoading(false);
    }
  }, [activePage, cleanLoading, inpaintMode, replicateApiKey, localInpaintUrl, setCleanedImage, clearInpaintStrokes, t]);

  // ── Auto-translate ──
  const handleTranslate = useCallback(async () => {
    if (!activePage || translateLoading) return;

    // Validate: need text blocks with originalText
    const blocksToTranslate = activePage.textBlocks.filter(
      (b) => b.originalText.trim().length > 0
    );
    if (blocksToTranslate.length === 0) {
      toast.error(t("translateFailed"), { description: t("noTextToTranslate") });
      return;
    }

    // Validate: AI config
    const effectiveModel = aiProvider === "local" ? localLlmModel : aiModel;
    if (!effectiveModel) {
      toast.error(t("translateFailed"), { description: t("noModelSelected") });
      return;
    }
    if (aiProvider !== "local" && aiProvider !== "replicate" && !apiKeys[aiProvider]) {
      toast.error(t("translateFailed"), { description: t("aiKeyRequired") });
      return;
    }
    if (aiProvider === "replicate" && !replicateApiKey) {
      toast.error(t("translateFailed"), { description: t("aiKeyRequired") });
      return;
    }

    setTranslateLoading(true);
    try {
      const results = await translateTextBlocks({
        provider: aiProvider,
        model: effectiveModel,
        apiKey: aiProvider === "replicate" ? replicateApiKey : (apiKeys[aiProvider] ?? ""),
        targetLanguage: targetLanguage || "English",
        textBlocks: blocksToTranslate.map((b) => ({
          id: b.id,
          originalText: b.originalText,
          type: b.type,
        })),
        localEndpoint: aiProvider === "local" ? localLlmUrl : undefined,
      });

      // Apply translations to text blocks
      // Determine if target language should default to vertical text
      const verticalLangs = ["ja", "日本語", "japanese", "zh", "zh-tw", "zh-cn", "简体中文", "繁體中文", "中文", "chinese", "chinese (simplified)", "chinese (traditional)"];
      const isVerticalLang = verticalLangs.some(l => (targetLanguage || "").toLowerCase().includes(l));
      let count = 0;
      for (const r of results) {
        if (r.translatedText) {
          const updates: Partial<TextBlock> = {
            translatedText: r.translatedText,
          };
          // Apply LLM-classified type if returned
          if (r.type && ["speech", "narration", "sfx"].includes(r.type)) {
            updates.type = r.type as TextBlock["type"];
          }
          // Default vertical text direction for CJK target languages
          if (isVerticalLang) {
            updates.textDirection = "vertical";
          }
          updateTextBlock(activePage.id, r.id, updates);
          count++;
        }
      }

      toast.success(t("translateCompleted"), {
        description: `${count} ${t("blocksTranslated")}`,
      });
    } catch (err) {
      toast.error(t("translateFailed"), { description: String(err) });
    } finally {
      setTranslateLoading(false);
    }
  }, [activePage, translateLoading, aiProvider, aiModel, apiKeys, targetLanguage, localLlmUrl, updateTextBlock, t]);

  return (
    <aside className="flex h-full w-70 shrink-0 flex-col border-l border-outline-variant/20 bg-surface">
      {/* \u2500\u2500 Top bar: Undo/Redo + Export \u2500\u2500 */}
      <div className="flex items-center justify-between border-b border-outline-variant/15 px-2.5 py-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-variant/30 disabled:opacity-20 disabled:hover:bg-transparent"
            title={`${t("undo")} (${isMac ? "\u2318Z" : "Ctrl+Z"})`}
          >
            <ArrowUUpLeftIcon weight="bold" className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-variant/30 disabled:opacity-20 disabled:hover:bg-transparent"
            title={`${t("redo")} (${isMac ? "\u2318\u21e7Z" : "Ctrl+Y"})`}
          >
            <ArrowUUpRightIcon weight="bold" className="h-4 w-4" />
          </button>
        </div>

        {/* Export & Import */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 items-center gap-1 rounded-lg border border-outline-variant/25 px-2 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-variant/25">
                <ExportIcon weight="bold" className="h-3.5 w-3.5" />
                {t("export")}
                <CaretDownIcon weight="fill" className="h-3 w-3 opacity-40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              {/* ── Single Page ── */}
              <DropdownMenuLabel className="text-[10px] font-semibold text-on-surface-variant/40">
                {t("exportSinglePage")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="gap-2 text-[12px]"
                onClick={handleExportPng}
                disabled={!activePage || exportingPng}
              >
                <ImageIcon weight="fill" className="h-3.5 w-3.5" />
                {exportingPng ? t("exporting") : t("exportCurrentPng")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-[12px]"
                onClick={handleExportPsd}
                disabled={!activePage || exportingPsd}
              >
                <StackIcon weight="fill" className="h-3.5 w-3.5" />
                {exportingPsd ? t("exporting") : t("exportCurrentPsd")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* ── Package (All Pages) ── */}
              <DropdownMenuLabel className="text-[10px] font-semibold text-on-surface-variant/40">
                {t("exportPackage")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="gap-2 text-[12px]"
                onClick={handleExportZip}
                disabled={pages.length === 0 || exportingZip}
              >
                <FileZipIcon weight="fill" className="h-3.5 w-3.5" />
                {exportingZip ? t("exporting") : t("exportAllPng")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-[12px]"
                onClick={handleExportPsdZip}
                disabled={pages.length === 0 || exportingPsdZip}
              >
                <FileZipIcon weight="fill" className="h-3.5 w-3.5" />
                {exportingPsdZip ? t("exporting") : t("exportAllPsd")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* ── Project ── */}
              <DropdownMenuLabel className="text-[10px] font-semibold text-on-surface-variant/40">
                {t("exportProjectLabel")}
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-2 text-[12px]" onClick={handleExportKoma}>
                <FileArrowDownIcon weight="fill" className="h-3.5 w-3.5" />
                {t("exportKoma")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/25 text-red-500/70 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            onClick={() => setShowDeleteDialog(true)}
            title={t("deleteProject")}
          >
            <TrashIcon weight="bold" className="h-3.5 w-3.5" />
          </button>

          {/* Delete confirmation dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("deleteProjectTitle")}</DialogTitle>
                <DialogDescription>
                  {t("deleteProjectConfirm")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-3 sm:gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  {t("cancel")}
                </Button>
                <Button variant="destructive" onClick={handleDeleteProject}>
                  {t("delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* \u2500\u2500 Tabbed Content: Workflow | Blocks | Design \u2500\u2500 */}
      <Tabs defaultValue="blocks" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-2.5 mt-2 mb-0 h-8 w-auto justify-start gap-0 rounded-lg bg-surface-variant/20 p-0.5">
          <TabsTrigger
            value="workflow"
            className="h-7 rounded-md px-3 text-[11px] font-semibold data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container data-[state=active]:shadow-none"
          >
            {t("workflow")}
          </TabsTrigger>
          <TabsTrigger
            value="blocks"
            className="h-7 rounded-md px-3 text-[11px] font-semibold data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container data-[state=active]:shadow-none"
          >
            {t("textBlocks")}
          </TabsTrigger>
          <TabsTrigger
            value="design"
            className="h-7 rounded-md px-3 text-[11px] font-semibold data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container data-[state=active]:shadow-none"
          >
            {t("design")}
          </TabsTrigger>
        </TabsList>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="flex-1 overflow-y-auto px-2.5 py-3">
          <div className="space-y-2">
            <WorkflowStep
              icon={
                ocrLoading
                  ? CircleNotchIcon
                  : activePage?.ocrCompleted && !pendingSelection
                    ? CheckCircleIcon
                    : pendingSelection
                      ? SelectionIcon
                      : ScanIcon
              }
              label={
                ocrLoading
                  ? t("ocrRunning")
                  : activePage?.ocrCompleted && !pendingSelection
                    ? t("ocrDone")
                    : pendingSelection
                      ? t("ocrSelection")
                      : t("runOcr")
              }
              description={t("ocrStepDesc")}
              variant={
                activePage?.ocrCompleted && !pendingSelection
                  ? "done"
                  : pendingSelection
                    ? "selection"
                    : "primary"
              }
              spinning={ocrLoading}
              disabled={
                !activePage ||
                ocrLoading ||
                (activePage?.ocrCompleted === true && !pendingSelection)
              }
              onClick={handleRunOcr}
              step={1}
            />
            <WorkflowStep
              icon={
                cleanLoading
                  ? CircleNotchIcon
                  : activePage?.cleanedImageBase64
                    ? CheckCircleIcon
                    : EraserIcon
              }
              label={
                cleanLoading
                  ? t("cleanRunning")
                  : activePage?.cleanedImageBase64
                    ? t("cleanDone")
                    : t("cleanBackground")
              }
              description={t("cleanStepDesc")}
              variant={activePage?.cleanedImageBase64 ? "done" : "secondary"}
              spinning={cleanLoading}
              disabled={!activePage || cleanLoading || !activePage?.ocrCompleted}
              onClick={handleCleanBackground}
              step={2}
            />
            <WorkflowStep
              icon={translateLoading ? CircleNotchIcon : TranslateIcon}
              label={translateLoading ? t("translateRunning") : t("autoTranslate")}
              description={t("translateStepDesc")}
              variant="tertiary"
              spinning={translateLoading}
              disabled={!activePage || translateLoading || !activePage?.ocrCompleted}
              onClick={handleTranslate}
              step={3}
            />
          </div>
        </TabsContent>

        {/* Blocks Tab */}
        <TabsContent value="blocks" className="flex-1 overflow-y-auto px-2.5 py-3">
          {!activePage ? (
            <EmptyState
              icon={TextTIcon}
              text={t("selectPageForBlocks")}
            />
          ) : speechBlocks.length === 0 &&
            narrationBlocks.length === 0 &&
            sfxBlocks.length === 0 &&
            manualBlocks.length === 0 ? (
            <EmptyState
              icon={ChatCircleTextIcon}
              text={t("runOcrToDetect")}
            />
          ) : (
            <div className="space-y-3">
              {manualBlocks.length > 0 && (
                <TextBlockSection
                  icon={TextTIcon}
                  label={t("manualText")}
                  blocks={manualBlocks}
                  pageId={activePage.id}
                  pushSnapshot={pushSnapshot}
                  getCurrentSnapshot={getCurrentSnapshot}
                />
              )}
              {speechBlocks.length > 0 && (
                <TextBlockSection
                  icon={ChatCircleTextIcon}
                  label={t("speechBubbles")}
                  blocks={speechBlocks}
                  pageId={activePage.id}
                  pushSnapshot={pushSnapshot}
                  getCurrentSnapshot={getCurrentSnapshot}
                />
              )}
              {narrationBlocks.length > 0 && (
                <TextBlockSection
                  icon={MegaphoneIcon}
                  label={t("narration")}
                  blocks={narrationBlocks}
                  pageId={activePage.id}
                  pushSnapshot={pushSnapshot}
                  getCurrentSnapshot={getCurrentSnapshot}
                />
              )}
              {sfxBlocks.length > 0 && (
                <TextBlockSection
                  icon={LightningIcon}
                  label={t("soundEffects")}
                  blocks={sfxBlocks}
                  pageId={activePage.id}
                  pushSnapshot={pushSnapshot}
                  getCurrentSnapshot={getCurrentSnapshot}
                />
              )}
            </div>
          )}
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="flex-1 overflow-y-auto px-2.5 py-3">
          <DesignPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

/* \u2500\u2500 Empty state \u2500\u2500 */
function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon weight="fill" className="h-7 w-7 text-on-surface-variant/15" />
      <p className="text-[11px] text-on-surface-variant/35">{text}</p>
    </div>
  );
}

/* \u2500\u2500 Workflow step \u2014 card layout \u2500\u2500 */
type WorkflowVariant = "primary" | "secondary" | "tertiary" | "done" | "selection";

function WorkflowStep({
  icon: Icon,
  label,
  description,
  variant,
  spinning,
  disabled,
  onClick,
  step,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  variant: WorkflowVariant;
  spinning?: boolean;
  disabled?: boolean;
  onClick: () => void;
  step: number;
}) {
  const variantStyles: Record<WorkflowVariant, string> = {
    primary:
      "border-primary/25 hover:border-primary/40 bg-primary-container/10 hover:bg-primary-container/20",
    secondary:
      "border-secondary/25 hover:border-secondary/40 bg-secondary-container/10 hover:bg-secondary-container/20",
    tertiary:
      "border-tertiary/25 hover:border-tertiary/40 bg-tertiary-container/10 hover:bg-tertiary-container/20",
    done: "border-green-500/25 bg-green-50/15 dark:bg-green-900/15",
    selection:
      "border-amber-500/25 hover:border-amber-500/40 bg-amber-50/15 hover:bg-amber-100/20 dark:bg-amber-900/15 dark:hover:bg-amber-900/25",
  };

  const iconColors: Record<WorkflowVariant, string> = {
    primary: "text-primary",
    secondary: "text-secondary",
    tertiary: "text-tertiary",
    done: "text-green-600 dark:text-green-400",
    selection: "text-amber-600 dark:text-amber-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all disabled:opacity-35 disabled:cursor-not-allowed ${variantStyles[variant]}`}
    >
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface/60 ${iconColors[variant]}`}>
        <Icon
          weight={variant === "done" ? "fill" : "bold"}
          className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-on-surface/90">{label}</div>
        <div className="mt-0.5 text-[10px] leading-snug text-on-surface-variant/50">
          {description}
        </div>
      </div>
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-variant/20 text-[10px] font-bold text-on-surface-variant/35">
        {step}
      </span>
    </button>
  );
}

/* \u2500\u2500 Text block section \u2500\u2500 */
function TextBlockSection({
  icon: Icon,
  label,
  blocks,
  pageId,
  pushSnapshot,
  getCurrentSnapshot,
}: {
  icon: React.ElementType;
  label: string;
  blocks: TextBlock[];
  pageId: string;
  pushSnapshot: (snapshot: { pageId: string; textBlocks: TextBlock[]; inpaintStrokes: { id: string; points: number[]; brushSize: number }[] }) => void;
  getCurrentSnapshot: () => { pageId: string; textBlocks: TextBlock[]; inpaintStrokes: { id: string; points: number[]; brushSize: number }[] } | null;
}) {
  const selectedBlockId = useEditorSelectionStore((s) => s.selectedBlockId);
  const selectBlock = useEditorSelectionStore((s) => s.selectBlock);
  const removeTextBlock = useProjectStore((s) => s.removeTextBlock);
  const updateTextBlock = useProjectStore((s) => s.updateTextBlock);
  const mergeTextBlocks = useProjectStore((s) => s.mergeTextBlocks);
  const userName = useUserStore((s) => s.userName);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingEditBlockRef = useRef<string | null>(null);
  // Ordered array: click order determines merge sequence (1st, 2nd, ...)
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedBlockId) return;
    const el = blockRefs.current[selectedBlockId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedBlockId]);

  const handleDelete = useCallback(
    (blockId: string) => {
      const snap = getCurrentSnapshot();
      if (snap) pushSnapshot(snap);
      removeTextBlock(pageId, blockId);
      setCheckedIds((prev) => prev.filter((id) => id !== blockId));
    },
    [getCurrentSnapshot, pushSnapshot, removeTextBlock, pageId]
  );

  const handleMerge = useCallback(() => {
    if (checkedIds.length < 2) return;
    const snap = getCurrentSnapshot();
    if (snap) pushSnapshot(snap);
    mergeTextBlocks(pageId, checkedIds);
    setCheckedIds([]);
  }, [checkedIds, getCurrentSnapshot, pushSnapshot, mergeTextBlocks, pageId]);

  const toggleCheck = useCallback((blockId: string) => {
    setCheckedIds((prev) =>
      prev.includes(blockId)
        ? prev.filter((id) => id !== blockId)
        : [...prev, blockId]
    );
  }, []);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const handleFieldChange = useCallback(
    (blockId: string, field: "originalText" | "translatedText", value: string) => {
      const timerKey = `${blockId}:${field}`;
      if (pendingEditBlockRef.current === blockId) {
        const snap = getCurrentSnapshot();
        if (snap) pushSnapshot(snap);
        pendingEditBlockRef.current = null;
      }
      // Debounce store update for smooth typing
      clearTimeout(debounceTimers.current[timerKey]);
      debounceTimers.current[timerKey] = setTimeout(() => {
        updateTextBlock(pageId, blockId, { [field]: value });
        delete debounceTimers.current[timerKey];
      }, 200);
    },
    [getCurrentSnapshot, pushSnapshot, updateTextBlock, pageId]
  );

  const handleFocus = useCallback((blockId: string) => {
    pendingEditBlockRef.current = blockId;
  }, []);

  const handleBlur = useCallback(() => {
    pendingEditBlockRef.current = null;
  }, []);

  return (
    <div>
      {/* Sticky section header */}
      <div className="sticky -top-3 z-10 -mx-2.5 mb-1.5 flex items-center gap-1.5 border-b border-outline-variant/15 bg-surface px-2.5 pb-1.5 pt-3">
        <Icon weight="fill" className="h-3 w-3 text-on-surface-variant/50" />
        <span className="text-[11px] font-semibold text-on-surface-variant/70">
          {label}
        </span>
        {checkedIds.length >= 2 && (
          <button
            onClick={handleMerge}
            className="ml-1 flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary transition-colors hover:bg-primary/20"
            title="Merge selected blocks"
          >
            <GitMergeIcon weight="bold" className="h-2.5 w-2.5" />
            Merge {checkedIds.length}
          </button>
        )}
        <span className="ml-auto rounded-full bg-surface-variant/25 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-on-surface-variant/40">
          {blocks.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {blocks.map((block) => {
          const isSelected = selectedBlockId === block.id;
          const mergeIndex = checkedIds.indexOf(block.id); // -1 if not checked
          const isChecked = mergeIndex >= 0;
          return (
            <div
              key={block.id}
              ref={(el) => { blockRefs.current[block.id] = el; }}
              onClick={() => selectBlock(block.id)}
              className={`group relative cursor-pointer space-y-1 rounded-lg border p-2 transition-all ${
                isSelected
                  ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/5"
                  : "border-outline-variant/12 bg-surface-variant/8 hover:border-outline-variant/25 hover:bg-surface-variant/15"
              }`}
            >
              {/* Original text (editable) + action buttons in a single row */}
              <div className="flex items-start gap-1">
                <Textarea
                  defaultValue={block.originalText}
                  placeholder={block.source === "manual" ? (userName || "Manual") : "Original..."}
                  className="min-h-6 min-w-0 flex-1 resize-none border-none bg-transparent p-1 text-[10px] leading-tight text-on-surface-variant/50 shadow-none focus-visible:ring-0"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={() => handleFocus(block.id)}
                  onBlur={handleBlur}
                  onChange={(e) => handleFieldChange(block.id, "originalText", e.target.value)}
                />
                <div className={`flex shrink-0 items-center gap-0.5 transition-opacity ${isChecked ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCheck(block.id);
                    }}
                    className={`flex h-4.5 w-4.5 items-center justify-center rounded transition-colors ${
                      isChecked
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-surface-variant/30 text-on-surface-variant/40"
                    }`}
                    title={isChecked ? `Merge order: ${mergeIndex + 1}` : "Select for merge"}
                  >
                    {isChecked ? (
                      <span className="text-[8px] font-bold leading-none">{mergeIndex + 1}</span>
                    ) : (
                      <GitMergeIcon weight="regular" className="h-2.5 w-2.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(block.id);
                    }}
                    className="flex h-4.5 w-4.5 items-center justify-center rounded hover:bg-error/15 hover:text-error"
                    title="Remove"
                  >
                    <XIcon weight="bold" className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
              <Textarea
                defaultValue={block.translatedText}
                placeholder="Translation..."
                className="min-h-9 resize-none border-outline-variant/15 bg-surface/80 text-[11px] leading-snug"
                onClick={(e) => e.stopPropagation()}
                onFocus={() => handleFocus(block.id)}
                onBlur={handleBlur}
                onChange={(e) => handleFieldChange(block.id, "translatedText", e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* \u2500\u2500 Design Panel (Typography + Properties) \u2500\u2500 */
function DesignPanel() {
  const t = useTranslations("editor");

  const selectedBlockId = useEditorSelectionStore((s) => s.selectedBlockId);
  const activePage = useProjectStore(
    (s) => s.pages.find((p) => p.id === s.activePageId) ?? null
  );
  const updateTextBlock = useProjectStore((s) => s.updateTextBlock);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);

  const selectedBlock = activePage?.textBlocks.find((b) => b.id === selectedBlockId) ?? null;
  const pageId = activePage?.id;

  const pushSnap = useCallback(() => {
    if (!activePage) return;
    pushSnapshot({
      pageId: activePage.id,
      textBlocks: [...activePage.textBlocks],
      inpaintStrokes: [...(activePage.inpaintStrokes ?? [])],
    });
  }, [activePage, pushSnapshot]);

  const update = useCallback(
    (attrs: Partial<TextBlock>) => {
      if (!pageId || !selectedBlockId) return;
      pushSnap();
      updateTextBlock(pageId, selectedBlockId, attrs);
    },
    [pageId, selectedBlockId, pushSnap, updateTextBlock]
  );

  // For continuous inputs (typing, color dragging) — one undo snapshot per edit session
  const liveSnapRef = useRef(false);

  const updateLive = useCallback(
    (attrs: Partial<TextBlock>) => {
      if (!pageId || !selectedBlockId) return;
      if (!liveSnapRef.current) {
        pushSnap();
        liveSnapRef.current = true;
      }
      updateTextBlock(pageId, selectedBlockId, attrs);
    },
    [pageId, selectedBlockId, pushSnap, updateTextBlock]
  );

  const commitLive = useCallback(() => {
    liveSnapRef.current = false;
  }, []);

  // Reset snapshot flag when selected block changes
  useEffect(() => {
    liveSnapRef.current = false;
  }, [selectedBlockId]);

  // Current values
  const fontFamily = selectedBlock?.fontFamily ?? DEFAULT_FONT;
  const fontSize = selectedBlock?.fontSize ?? 14;
  const lineHeight = selectedBlock?.lineHeight ?? 1.2;
  const fontColor = selectedBlock?.fontColor ?? "#000000";
  const textAlign = selectedBlock?.textAlign ?? "center";
  const textDirection = selectedBlock?.textDirection ?? "horizontal";
  const rotation = selectedBlock?.rotation ?? 0;
  const fontWeight = selectedBlock?.fontWeight ?? "normal";
  const fontStyle = selectedBlock?.fontStyle ?? "normal";
  const letterSpacing = selectedBlock?.letterSpacing ?? 0;
  const strokeEnabled = selectedBlock?.strokeEnabled ?? false;
  const strokeWidth = selectedBlock?.strokeWidth ?? 4;

  const comicFonts = MANGA_FONTS.filter((f) => f.category === "comic");
  const handFonts = MANGA_FONTS.filter((f) => f.category === "handwriting");
  const jpFonts = MANGA_FONTS.filter((f) => f.category === "japanese");
  const cnFonts = MANGA_FONTS.filter((f) => f.category === "chinese");
  const krFonts = MANGA_FONTS.filter((f) => f.category === "korean");
  const sysFonts = MANGA_FONTS.filter((f) => f.category === "system");

  if (!selectedBlock) {
    return (
      <EmptyState
        icon={TextTIcon}
        text={t("selectBlockForDesign")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* \u2500\u2500 Font Family \u2500\u2500 */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium text-on-surface-variant/60">
          {t("fontFamily")}
        </Label>
        <Select
          value={fontFamily}
          onValueChange={(v) => update({ fontFamily: v })}
        >
          <SelectTrigger className="h-8 border-outline-variant/25 bg-surface-variant/10 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-[10px] text-on-surface-variant/40">Comic</SelectLabel>
              {comicFonts.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-[10px] text-on-surface-variant/40">Handwriting</SelectLabel>
              {handFonts.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-[10px] text-on-surface-variant/40">Japanese</SelectLabel>
              {jpFonts.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-[10px] text-on-surface-variant/40">Chinese</SelectLabel>
              {cnFonts.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-[10px] text-on-surface-variant/40">Korean</SelectLabel>
              {krFonts.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-[10px] text-on-surface-variant/40">System</SelectLabel>
              {sysFonts.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* \u2500\u2500 Style: Bold / Italic \u2500\u2500 */}
      <div className="flex gap-1">
        <button
          onClick={() => update({ fontWeight: fontWeight === "bold" ? "normal" : "bold" })}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all ${
            fontWeight === "bold"
              ? "border-primary/30 bg-primary-container/30 text-on-primary-container"
              : "border-outline-variant/20 text-on-surface-variant/60 hover:bg-surface-variant/20"
          }`}
        >
          <TextBolderIcon weight="bold" className="h-3.5 w-3.5" />
          {t("bold")}
        </button>
        <button
          onClick={() => update({ fontStyle: fontStyle === "italic" ? "normal" : "italic" })}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all ${
            fontStyle === "italic"
              ? "border-primary/30 bg-primary-container/30 text-on-primary-container"
              : "border-outline-variant/20 text-on-surface-variant/60 hover:bg-surface-variant/20"
          }`}
        >
          <TextItalicIcon weight="bold" className="h-3.5 w-3.5" />
          {t("italic")}
        </button>
      </div>

      {/* \u2500\u2500 Size + Line Height + Letter Spacing \u2500\u2500 */}
      <div className="grid grid-cols-3 gap-2">
        <FieldGroup label={t("size")}>
          <Input
            type="number"
            min={6}
            max={200}
            value={fontSize}
            onChange={(e) => updateLive({ fontSize: Math.max(6, Number(e.target.value) || 14) })}
            onBlur={commitLive}
            className="h-8 border-outline-variant/25 bg-surface-variant/10 text-[12px] tabular-nums"
          />
        </FieldGroup>
        <FieldGroup label={textDirection === "vertical" ? t("columnGap") : t("lineHeight")}>
          <Input
            type="number"
            min={0.5}
            max={4}
            step={0.1}
            value={lineHeight}
            onChange={(e) => updateLive({ lineHeight: Math.max(0.5, Number(e.target.value) || 1.2) })}
            onBlur={commitLive}
            className="h-8 border-outline-variant/25 bg-surface-variant/10 text-[12px] tabular-nums"
          />
        </FieldGroup>
        <FieldGroup label={t("letterSpacing")}>
          <Input
            type="number"
            min={-10}
            max={50}
            step={0.5}
            value={letterSpacing}
            onChange={(e) => updateLive({ letterSpacing: Number(e.target.value) || 0 })}
            onBlur={commitLive}
            className="h-8 border-outline-variant/25 bg-surface-variant/10 text-[12px] tabular-nums"
          />
        </FieldGroup>
      </div>

      {/* \u2500\u2500 Color + Rotation \u2500\u2500 */}
      <div className="grid grid-cols-2 gap-2">
        <FieldGroup label={t("color")}>
          <div className="flex items-center gap-1.5">
            <label className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-outline-variant/25 transition-colors hover:border-primary/40">
              <span
                className="block h-5 w-5 rounded-md shadow-sm ring-1 ring-black/5"
                style={{ backgroundColor: fontColor }}
              />
              <input
                type="color"
                value={fontColor}
                onChange={(e) => updateLive({ fontColor: e.target.value })}
                onBlur={commitLive}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <Input
              value={fontColor}
              onChange={(e) => updateLive({ fontColor: e.target.value })}
              onBlur={commitLive}
              className="h-8 flex-1 border-outline-variant/25 bg-surface-variant/10 text-[12px] font-mono uppercase"
            />
          </div>
        </FieldGroup>
        <FieldGroup label={t("rotation")}>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={-360}
              max={360}
              value={rotation}
              onChange={(e) => updateLive({ rotation: Number(e.target.value) || 0 })}
              onBlur={commitLive}
              className="h-8 flex-1 border-outline-variant/25 bg-surface-variant/10 text-[12px] tabular-nums"
            />
          </div>
        </FieldGroup>
      </div>

      {/* \u2500\u2500 Stroke \u2500\u2500 */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <button
            onClick={() => update({ strokeEnabled: !strokeEnabled })}
            className={`flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all ${
              strokeEnabled
                ? "border-primary/30 bg-primary-container/30 text-on-primary-container"
                : "border-outline-variant/20 text-on-surface-variant/60 hover:bg-surface-variant/20"
            }`}
          >
            {t("stroke")}
          </button>
        </div>
        {strokeEnabled && (
          <FieldGroup label={t("strokeWidth")}>
            <Input
              type="number"
              min={1}
              max={20}
              step={1}
              value={strokeWidth}
              onChange={(e) => updateLive({ strokeWidth: Math.max(1, Number(e.target.value) || 4) })}
              onBlur={commitLive}
              className="h-8 w-20 border-outline-variant/25 bg-surface-variant/10 text-[12px] tabular-nums"
            />
          </FieldGroup>
        )}
      </div>

      {/* \u2500\u2500 Text Direction \u2500\u2500 */}
      <FieldGroup label={t("textDirection")}>
        <div className="flex gap-1">
          <button
            onClick={() => update({ textDirection: "horizontal" })}
            className={`flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border text-[10px] font-medium transition-all ${
              textDirection === "horizontal"
                ? "border-primary/30 bg-primary-container/30 text-on-primary-container"
                : "border-outline-variant/20 text-on-surface-variant/50 hover:bg-surface-variant/20"
            }`}
          >
            <ArrowsHorizontalIcon weight="bold" className="h-3.5 w-3.5" />
            {t("horizontal")}
          </button>
          <button
            onClick={() => update({ textDirection: "vertical" })}
            className={`flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border text-[10px] font-medium transition-all ${
              textDirection === "vertical"
                ? "border-primary/30 bg-primary-container/30 text-on-primary-container"
                : "border-outline-variant/20 text-on-surface-variant/50 hover:bg-surface-variant/20"
            }`}
          >
            <ArrowsDownUpIcon weight="bold" className="h-3.5 w-3.5" />
            {t("vertical")}
          </button>
        </div>
      </FieldGroup>

      {/* \u2500\u2500 Alignment \u2500\u2500 */}
      <FieldGroup label={textDirection === "vertical" ? t("verticalAlign") : t("alignment")}>
        <div className="flex gap-1">
          {textDirection === "vertical" ? (
            (["left", "center", "right"] as const).map((align) => {
              const Icon =
                align === "left" ? AlignTopSimpleIcon :
                align === "center" ? AlignCenterVerticalSimpleIcon :
                AlignBottomSimpleIcon;
              return (
                <button
                  key={align}
                  onClick={() => update({ textAlign: align })}
                  className={`flex h-8 flex-1 items-center justify-center rounded-lg border transition-all ${
                    textAlign === align
                      ? "border-primary/30 bg-primary-container/30 text-on-primary-container"
                      : "border-outline-variant/20 text-on-surface-variant/50 hover:bg-surface-variant/20"
                  }`}
                >
                  <Icon weight="fill" className="h-4 w-4" />
                </button>
              );
            })
          ) : (
            (["left", "center", "right"] as const).map((align) => {
              const AlignIcon =
                align === "left" ? TextAlignLeftIcon :
                align === "center" ? TextAlignCenterIcon :
                TextAlignRightIcon;
              return (
                <button
                  key={align}
                  onClick={() => update({ textAlign: align })}
                  className={`flex h-8 flex-1 items-center justify-center rounded-lg border transition-all ${
                    textAlign === align
                      ? "border-primary/30 bg-primary-container/30 text-on-primary-container"
                      : "border-outline-variant/20 text-on-surface-variant/50 hover:bg-surface-variant/20"
                  }`}
                >
                  <AlignIcon weight="fill" className="h-4 w-4" />
                </button>
              );
            })
          )}
        </div>
      </FieldGroup>
    </div>
  );
}

/* \u2500\u2500 Field Group Helper \u2500\u2500 */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-medium text-on-surface-variant/60">{label}</Label>
      {children}
    </div>
  );
}
