"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ImageIcon,
  StackIcon,
  TextTIcon,
  DropIcon,
  EyeIcon,
  ArrowLeftIcon,
  CaretUpIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { Reorder } from "framer-motion";
import { useTranslations } from "next-intl";
import { useProjectStore } from "@/stores/project-store";

interface EditorLeftSidebarProps {
  projectId: string;
}

export function EditorLeftSidebar({ projectId }: EditorLeftSidebarProps) {
  const t = useTranslations("editor");
  const router = useRouter();
  const projectName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const setActivePage = useProjectStore((s) => s.setActivePage);
  const reorderPages = useProjectStore((s) => s.reorderPages);
  const addPages = useProjectStore((s) => s.addPages);

  const [editingName, setEditingName] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);

  const handleNameSubmit = useCallback(
    (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      setEditingName(false);
      const val = (e.target as HTMLInputElement).value.trim();
      if (val) setProjectName(val);
    },
    [setProjectName]
  );

  const handleAddFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) addPages(files);
      e.target.value = "";
    },
    [addPages]
  );

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-outline-variant/20 bg-surface">
      {/* Header: Back + Project Name */}
      <div className="flex items-center gap-2 border-b border-outline-variant/15 px-3 py-2.5">
        <button
          onClick={() => router.push("/")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-variant/40 hover:text-on-surface"
        >
          <ArrowLeftIcon weight="bold" className="h-4 w-4" />
        </button>
        {editingName ? (
          <input
            autoFocus
            defaultValue={projectName}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleNameSubmit(e)}
            className="h-7 min-w-0 flex-1 rounded-md border border-outline-variant/40 bg-surface-variant/20 px-2 text-sm text-on-surface outline-none focus:border-primary"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant/30"
            title={projectName}
          >
            {projectName}
          </button>
        )}
      </div>

      {/* Pages section — fills remaining space */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
            {t("pages")}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PagesPanel
            pages={pages}
            activePageId={activePageId}
            setActivePage={setActivePage}
            reorderPages={reorderPages}
            onAddFiles={handleAddFiles}
          />
        </div>
      </div>

      {/* Layers section — collapsible, pinned to bottom */}
      <div className="shrink-0 border-t border-outline-variant/15">
        <button
          onClick={() => setLayersOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-1.5 transition-colors hover:bg-surface-variant/10"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
            {t("layers")}
          </span>
          {layersOpen ? (
            <CaretDownIcon weight="fill" className="h-3 w-3 text-on-surface-variant/30" />
          ) : (
            <CaretUpIcon weight="fill" className="h-3 w-3 text-on-surface-variant/30" />
          )}
        </button>
        {layersOpen && <LayersPanel />}
      </div>

      {/* Page count footer */}
      <div className="border-t border-outline-variant/15 px-3 py-1.5 text-[10px] text-on-surface-variant/40">
        {t("pagesCount", { count: pages.length })}
      </div>
    </aside>
  );
}

/* ── Pages Panel ── */
function PagesPanel({
  pages,
  activePageId,
  setActivePage,
  reorderPages,
  onAddFiles,
}: {
  pages: import("@/stores/project-store").PageState[];
  activePageId: string | null;
  setActivePage: (id: string) => void;
  reorderPages: (newOrder: import("@/stores/project-store").PageState[]) => void;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const t = useTranslations("editor");

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
        <ImageIcon weight="fill" className="h-8 w-8 text-on-surface-variant/20" />
        <p className="text-xs text-on-surface-variant/40">{t("noPagesYet")}</p>
        <label className="mt-1 cursor-pointer rounded-lg bg-primary-container/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-container/50">
          {t("addImages")}
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={onAddFiles}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      <Reorder.Group
        axis="y"
        values={pages}
        onReorder={reorderPages}
        className="flex flex-col gap-2.5"
      >
        {pages.map((page, index) => (
          <Reorder.Item
            key={page.id}
            value={page}
            className={`group cursor-grab overflow-hidden rounded-xl transition-all active:cursor-grabbing ${
              activePageId === page.id
                ? "ring-2 ring-primary/60 ring-offset-1 ring-offset-surface"
                : "ring-1 ring-outline-variant/15 hover:ring-outline-variant/30"
            }`}
            onClick={() => setActivePage(page.id)}
          >
            {/* Large thumbnail */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-variant/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.originalImageBase64}
                alt={page.fileName}
                className="h-full w-full object-cover"
              />
              {/* Page number badge */}
              <div className="absolute top-1.5 left-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-surface/80 px-1 text-[10px] font-bold text-on-surface backdrop-blur-sm">
                {index + 1}
              </div>
            </div>
            {/* Info strip */}
            <div className="flex items-center justify-between bg-surface-variant/10 px-2.5 py-1.5">
              <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-on-surface/80">
                {page.fileName}
              </p>
              <span className="shrink-0 text-[10px] text-on-surface-variant/40">
                {t("blocks", { count: page.textBlocks.length })}
              </span>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Add more pages */}
      <label className="mt-2.5 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-outline-variant/25 py-3 text-xs text-on-surface-variant/40 transition-colors hover:border-primary/30 hover:text-primary">
        <ImageIcon weight="fill" className="h-3.5 w-3.5" />
        {t("addMorePages")}
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={onAddFiles}
        />
      </label>
    </div>
  );
}

/* ── Layers Panel ── */
function LayersPanel() {
  const t = useTranslations("editor");
  const layers = [
    { icon: DropIcon, label: t("watermark"), color: "text-tertiary" },
    { icon: TextTIcon, label: t("textNodes"), color: "text-primary" },
    { icon: ImageIcon, label: t("cleanedBackground"), color: "text-secondary" },
    { icon: StackIcon, label: t("originalImage"), color: "text-on-surface-variant" },
  ];

  return (
    <div className="flex flex-col gap-0.5 px-2 py-2">
      {layers.map((layer) => (
        <div
          key={layer.label}
          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-surface-variant/20"
        >
          <layer.icon weight="fill" className={`h-3.5 w-3.5 ${layer.color}`} />
          <span className="flex-1 text-on-surface/80">{layer.label}</span>
          <button className="opacity-0 transition-opacity group-hover:opacity-100">
            <EyeIcon
              weight="fill"
              className="h-3.5 w-3.5 text-on-surface-variant/40 hover:text-on-surface"
            />
          </button>
        </div>
      ))}
    </div>
  );
}
