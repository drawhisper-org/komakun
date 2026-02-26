"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  ImageIcon,
  PlusIcon,
  XCircleIcon,
  XIcon
} from "@phosphor-icons/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { useProjectStore, type PageState } from "@/stores/project-store";
import { useState } from "react";

interface ManagePagesViewProps {
  onDone: () => void;
}

export function ManagePagesView({ onDone }: ManagePagesViewProps) {
  const t = useTranslations("editor");
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const setActivePage = useProjectStore((s) => s.setActivePage);
  const reorderPages = useProjectStore((s) => s.reorderPages);
  const removePage = useProjectStore((s) => s.removePage);
  const addPages = useProjectStore((s) => s.addPages);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
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

  const handleAddFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) addPages(files);
      e.target.value = "";
    },
    [addPages]
  );

  const activeDragPage = activeDragId
    ? pages.find((p) => p.id === activeDragId)
    : null;

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/10 px-6 py-3">
        <div>
          <h2 className="text-sm font-semibold text-on-surface">
            {t("sortPagesHeading")}
          </h2>
          <p className="text-[11px] text-on-surface-variant/50">
            {t("sortPagesDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant/20 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-variant/20"
          >
            <PlusIcon weight="bold" className="h-3.5 w-3.5" />
            {t("addImages")}
          </button>
          <button
            onClick={onDone}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("done")}
          </button>
        </div>
      </div>

      {/* Page grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {pages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <ImageIcon weight="fill" className="h-12 w-12 text-on-surface-variant/15" />
            <p className="text-sm text-on-surface-variant/40">{t("noPagesYet")}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <PlusIcon weight="bold" className="h-3.5 w-3.5" />
              {t("addImages")}
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => setActiveDragId(event.active.id as string)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            <SortableContext items={pageIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {pages.map((page, index) => (
                  <ManageSortableCard
                    key={page.id}
                    page={page}
                    index={index}
                    isActive={activePageId === page.id}
                    onClick={() => setActivePage(page.id)}
                    onDelete={() => removePage(page.id)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeDragPage ? (
                <ManageCardOverlay page={activeDragPage} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
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
    </div>
  );
}

/* ── Sortable Card for Manage View ── */
function ManageSortableCard({
  page,
  index,
  isActive,
  onClick,
  onDelete,
}: {
  page: PageState;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex flex-col items-center"
    >
      {/* Card */}
      <div
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={`relative w-full cursor-grab overflow-hidden rounded-xl transition-shadow active:cursor-grabbing ${
          isActive
            ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background"
            : "ring-1 ring-outline-variant/15 hover:ring-outline-variant/30"
        }`}
      >
        {/* 3:4 thumbnail */}
        <div className="relative aspect-3/4 w-full overflow-hidden bg-surface-variant/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.originalImageBase64}
            alt={page.fileName}
            className="pointer-events-none h-full w-full object-cover"
            draggable={false}
          />
        </div>
      </div>

      {/* Delete button — top right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-md transition-opacity hover:bg-black/70 group-hover:opacity-100"
      >
        <XIcon weight="bold" className="h-3.5 w-3.5" />
      </button>

      {/* Page number label */}
      <span className="mt-2 text-xs font-medium text-on-surface-variant/60">
        {index + 1}
      </span>
    </div>
  );
}

/* ── Drag Overlay Card ── */
function ManageCardOverlay({ page }: { page: PageState }) {
  return (
    <div className="w-52 overflow-hidden rounded-xl shadow-2xl shadow-black/30 ring-2 ring-primary/60">
      <div className="aspect-3/4 w-full overflow-hidden bg-surface-variant/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.originalImageBase64}
          alt={page.fileName}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
    </div>
  );
}
