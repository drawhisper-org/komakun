"use client";

import { useCallback } from "react";
import { CloudArrowUpIcon, ImageIcon, FileImageIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useProjectStore } from "@/stores/project-store";

export function EditorCanvas() {
  const t = useTranslations("editor");
  const addPages = useProjectStore((s) => s.addPages);
  const pages = useProjectStore((s) => s.pages);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) addPages(files);
    },
    [addPages]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) addPages(files);
      e.target.value = "";
    },
    [addPages]
  );

  // Pages loaded — canvas placeholder
  if (pages.length > 0) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-background"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="text-center">
          <FileImageIcon
            weight="fill"
            className="mx-auto mb-3 h-16 w-16 text-primary/30"
          />
          <p className="text-sm font-medium text-on-surface/50">
            {t("canvasPlaceholder")}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant/40">
            {t("pagesLoaded", { count: pages.length })}
          </p>
        </div>
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
            <span>Max 80 pages, 5MB each</span>
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
