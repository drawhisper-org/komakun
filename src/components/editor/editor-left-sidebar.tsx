"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ImageIcon,
  StackIcon,
  TextTIcon,
  DropIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  CaretUpIcon,
  CaretDownIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { useProjectStore, type PageState } from "@/stores/project-store";
import { useLayerVisibilityStore, type LayerKey } from "@/stores/layer-visibility-store";

interface EditorLeftSidebarProps {
  projectId: string;
  onManagePages: () => void;
}

export function EditorLeftSidebar({ projectId, onManagePages }: EditorLeftSidebarProps) {
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
  const [pagesOpen, setPagesOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <aside className="flex h-full w-65 shrink-0 flex-col border-r border-outline-variant/20 bg-surface">
      {/* Header: Back + Project Name */}
      <div className="flex shrink-0 items-center gap-2 border-b border-outline-variant/15 px-3 py-2.5">
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

      {/* Pages section — collapsible, shares space with layers */}
      <div className={`flex flex-col border-b border-outline-variant/15 ${
        pagesOpen ? "min-h-0 flex-1" : "shrink-0"
      }`}>
        {/* Pages header with inline actions */}
        <div className="flex shrink-0 items-center gap-1 px-3 py-1.5">
          <button
            onClick={() => setPagesOpen((v) => !v)}
            className="flex items-center gap-1 transition-colors hover:text-on-surface-variant"
          >
            {pagesOpen ? (
              <CaretDownIcon weight="fill" className="h-3 w-3 text-on-surface-variant/30" />
            ) : (
              <CaretUpIcon weight="fill" className="h-3 w-3 text-on-surface-variant/30" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
              {t("pages")}
            </span>
          </button>
          <div className="flex-1" />
          {pagesOpen && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-5 w-5 items-center justify-center rounded text-on-surface-variant/40 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant"
                title={t("addImages")}
              >
                <PlusIcon weight="bold" className="h-3 w-3" />
              </button>
              <button
                onClick={onManagePages}
                className="flex h-5 w-5 items-center justify-center rounded text-on-surface-variant/40 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant"
                title={t("managePages")}
              >
                <SlidersHorizontalIcon weight="bold" className="h-3 w-3" />
              </button>
            </>
          )}
        </div>

        {pagesOpen && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PagesPanel
              pages={pages}
              activePageId={activePageId}
              setActivePage={setActivePage}
              reorderPages={reorderPages}
            />
          </div>
        )}
      </div>

      {/* Layers section — collapsible, dynamic height based on content */}
      <div className="shrink-0">
        <div className="flex items-center gap-1 px-3 py-1.5">
          <button
            onClick={() => setLayersOpen((v) => !v)}
            className="flex items-center gap-1 transition-colors hover:text-on-surface-variant"
          >
            {layersOpen ? (
              <CaretDownIcon weight="fill" className="h-3 w-3 text-on-surface-variant/30" />
            ) : (
              <CaretUpIcon weight="fill" className="h-3 w-3 text-on-surface-variant/30" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
              {t("layers")}
            </span>
          </button>
        </div>
        {layersOpen && <LayersPanel />}
      </div>

      {/* Page count footer */}
      <div className="shrink-0 border-t border-outline-variant/15 px-3 py-1.5 text-[10px] text-on-surface-variant/40">
        {t("pagesCount", { count: pages.length })}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleAddFiles}
      />
    </aside>
  );
}

/* ── Sortable Page Card ── */
function SortablePageCard({
  page,
  index,
  isActive,
  onClick,
}: {
  page: PageState;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group cursor-grab overflow-hidden rounded-lg transition-shadow active:cursor-grabbing ${
        isActive
          ? "ring-2 ring-primary/60 ring-offset-1 ring-offset-surface"
          : "ring-1 ring-outline-variant/15 hover:ring-outline-variant/30"
      } ${isDragging ? "shadow-xl shadow-black/25" : ""}`}
    >
      {/* 3:4 thumbnail */}
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-surface-variant/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.originalImageBase64}
          alt={page.fileName}
          className="pointer-events-none h-full w-full object-cover"
          draggable={false}
        />
        {/* Page number badge */}
        <div className="absolute top-1 left-1 flex h-4 min-w-4 items-center justify-center rounded bg-surface/80 px-0.5 text-[9px] font-bold text-on-surface backdrop-blur-sm">
          {index + 1}
        </div>
      </div>
    </div>
  );
}

/* ── Pages Panel ── */
function PagesPanel({
  pages,
  activePageId,
  setActivePage,
  reorderPages,
}: {
  pages: PageState[];
  activePageId: string | null;
  setActivePage: (id: string) => void;
  reorderPages: (newOrder: PageState[]) => void;
}) {
  const t = useTranslations("editor");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const updated = [...pages];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      reorderPages(updated);
    },
    [pages, reorderPages]
  );

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
        <ImageIcon weight="fill" className="h-8 w-8 text-on-surface-variant/20" />
        <p className="text-xs text-on-surface-variant/40">{t("noPagesYet")}</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={pageIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-2">
            {pages.map((page, index) => (
              <SortablePageCard
                key={page.id}
                page={page}
                index={index}
                isActive={activePageId === page.id}
                onClick={() => setActivePage(page.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ── Layers Panel ── */
function LayersPanel() {
  const t = useTranslations("editor");
  const visibility = useLayerVisibilityStore((s) => s.visibility);
  const toggle = useLayerVisibilityStore((s) => s.toggle);

  const layers: { key: LayerKey; icon: typeof DropIcon; label: string; color: string }[] = [
    { key: "watermark", icon: DropIcon, label: t("watermark"), color: "text-tertiary" },
    { key: "text", icon: TextTIcon, label: t("textNodes"), color: "text-primary" },
    { key: "cleaned", icon: ImageIcon, label: t("cleanedBackground"), color: "text-secondary" },
    { key: "original", icon: StackIcon, label: t("originalImage"), color: "text-on-surface-variant" },
  ];

  return (
    <div className="flex flex-col gap-0.5 px-2 py-2">
      {layers.map((layer) => {
        const isVisible = visibility[layer.key];
        return (
          <div
            key={layer.key}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-surface-variant/20"
          >
            <layer.icon weight="fill" className={`h-3.5 w-3.5 ${isVisible ? layer.color : "text-on-surface-variant/20"}`} />
            <span className={`flex-1 ${isVisible ? "text-on-surface/80" : "text-on-surface-variant/30 line-through"}`}>{layer.label}</span>
            <button
              onClick={() => toggle(layer.key)}
              className="transition-opacity"
            >
              {isVisible ? (
                <EyeIcon
                  weight="fill"
                  className="h-3.5 w-3.5 text-on-surface-variant/40 opacity-0 group-hover:opacity-100 hover:text-on-surface"
                />
              ) : (
                <EyeSlashIcon
                  weight="fill"
                  className="h-3.5 w-3.5 text-on-surface-variant/30"
                />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
