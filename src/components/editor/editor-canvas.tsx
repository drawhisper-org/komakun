"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { CloudArrowUpIcon, ImageIcon, FileImageIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProjectStore } from "@/stores/project-store";
import type { ActiveTool } from "@/components/editor/canvas/konva-stage";

// react-konva requires browser APIs — lazy-load with SSR disabled
const KonvaStage = dynamic(
  () => import("@/components/editor/canvas/konva-stage").then((m) => m.KonvaStage),
  { ssr: false }
);

interface EditorCanvasProps {
  viewport: { x: number; y: number; scale: number };
  onViewportChange: (v: { x: number; y: number; scale: number }) => void;
  activeTool: ActiveTool;
  fitSignal: number;
  brushSize: number;
}

export function EditorCanvas({ viewport, onViewportChange, activeTool, fitSignal, brushSize }: EditorCanvasProps) {
  const t = useTranslations("editor");
  const addPages = useProjectStore((s) => s.addPages);
  const pages = useProjectStore((s) => s.pages);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const result = await addPages(files);
        if (result?.skippedOversize) {
          toast.error(t("fileTooLarge"), { description: t("fileTooLargeDesc", { count: result.skippedOversize }) });
        }
      }
    },
    [addPages, t]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        const result = await addPages(files);
        if (result?.skippedOversize) {
          toast.error(t("fileTooLarge"), { description: t("fileTooLargeDesc", { count: result.skippedOversize }) });
        }
      }
      e.target.value = "";
    },
    [addPages, t]
  );

  // Pages loaded — show Konva canvas
  if (pages.length > 0) {
    return (
      <div
        className="h-full w-full bg-neutral-100 dark:bg-neutral-900"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <KonvaStage
          viewport={viewport}
          onViewportChange={onViewportChange}
          activeTool={activeTool}
          fitSignal={fitSignal}
          brushSize={brushSize}
        />
      </div>
    );
  }

  // Empty state — dropzone
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-background p-8"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <label
        htmlFor="editor-file-input"
        className="group relative flex h-full w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-outline-variant/30 bg-surface-variant/5 transition-all duration-300 hover:border-primary/40 hover:bg-primary-container/5"
      >
        <div className="absolute inset-0 rounded-3xl bg-linear-to-b from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-primary/10 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container/30 transition-colors group-hover:bg-primary-container/50">
              <CloudArrowUpIcon
                weight="fill"
                className="h-8 w-8 text-primary transition-transform group-hover:scale-110"
              />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold tracking-tight text-on-surface">
              {t("dropHeading")}
            </h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-on-surface-variant/60">
              {t("dropDescription")}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/40">
            <span className="rounded-full bg-surface-variant/30 px-2.5 py-0.5">PNG</span>
            <span className="rounded-full bg-surface-variant/30 px-2.5 py-0.5">JPG</span>
            <span className="rounded-full bg-surface-variant/30 px-2.5 py-0.5">WEBP</span>
            <span className="text-outline-variant/50">•</span>
            <span>Max 80 pages, 10MB each</span>
          </div>

          <div className="mt-1 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-all group-hover:shadow-primary/20">
            <ImageIcon weight="fill" className="h-4 w-4" />
            {t("browseFiles")}
          </div>
        </div>

        <input
          id="editor-file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </label>
    </div>
  );
}
