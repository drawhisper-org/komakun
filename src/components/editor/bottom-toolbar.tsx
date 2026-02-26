"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  CursorIcon,
  HandIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  CornersOutIcon,
  CaretLeftIcon,
  CaretRightIcon,
  LassoIcon,
  SelectionIcon,
  PaintBrushIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";
import { useProjectStore } from "@/stores/project-store";
import type { ActiveTool } from "@/components/editor/canvas/konva-stage";

/* ── Platform detection ── */

function useIsMac() {
  return useMemo(() => {
    if (typeof navigator === "undefined") return true;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);
}

/** Format a shortcut for display: ⌥V on Mac, Alt+V on Win */
function formatShortcut(key: string, isMac: boolean) {
  return isMac ? `⌥${key}` : `Alt+${key}`;
}

/* ── Types ── */

interface ToolOption {
  tool: ActiveTool;
  icon: React.ComponentType<{ weight: "fill" | "bold"; className: string }>;
  labelKey: string;
  /** The letter key (used with Cmd/Ctrl) */
  key: string;
}

interface BottomToolbarProps {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
}

/* ── Tool group definitions ── */

const MOVE_TOOLS: ToolOption[] = [
  { tool: "select", icon: CursorIcon, labelKey: "selectTool", key: "V" },
  { tool: "hand", icon: HandIcon, labelKey: "handTool", key: "H" },
];

const SELECTION_TOOLS: ToolOption[] = [
  { tool: "rect-select", icon: SelectionIcon, labelKey: "rectSelect", key: "M" },
  { tool: "lasso-select", icon: LassoIcon, labelKey: "lassoSelect", key: "L" },
];

/* ── Grouped tool button (Figma-style) ── */

function ToolGroup({
  options,
  activeTool,
  onToolChange,
  t,
  isMac,
}: {
  options: ToolOption[];
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  t: ReturnType<typeof useTranslations<"editor">>;
  isMac: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Which option is currently shown in the main button
  const activeOption = options.find((o) => o.tool === activeTool) ?? options[0];
  const isGroupActive = options.some((o) => o.tool === activeTool);
  const Icon = activeOption.icon;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    // Use setTimeout so the current click event finishes first
    const id = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => { clearTimeout(id); document.removeEventListener("click", handleClick); };
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Main icon — click to activate tool */}
      <button
        onClick={() => onToolChange(activeOption.tool)}
        className={`relative flex h-8 items-center justify-center rounded-xl rounded-r-lg pl-2 pr-1 transition-colors ${
          isGroupActive
            ? "text-primary"
            : "text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface"
        }`}
        title={`${t(activeOption.labelKey)} (${formatShortcut(activeOption.key, isMac)})`}
      >
        <Icon weight="bold" className="h-4.5 w-4.5" />
      </button>
      {/* Caret toggle — click to open/close menu */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 w-3.5 items-center justify-center rounded-xl rounded-l-lg transition-colors ${
          isGroupActive
            ? "text-primary"
            : "text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface"
        }`}
      >
        <svg
          className="opacity-50"
          width="6"
          height="4"
          viewBox="0 0 6 4"
          fill="currentColor"
        >
          <path d="M0 0 L6 0 L3 4 Z" />
        </svg>
      </button>

      {/* Flyout menu */}
      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-xl border border-outline-variant/30 bg-surface/95 py-1 shadow-2xl backdrop-blur-xl"
          style={{ minWidth: 190 }}
        >
          {options.map((opt) => {
            const OptIcon = opt.icon;
            const isActive = activeTool === opt.tool;
            return (
              <button
                key={opt.tool}
                onClick={() => {
                  onToolChange(opt.tool);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-[13px] transition-colors ${
                  isActive
                    ? "bg-primary/12 text-primary"
                    : "text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface"
                }`}
              >
                <OptIcon weight="bold" className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left font-medium">
                  {t(opt.labelKey)}
                </span>
                <kbd className="ml-3 text-[11px] font-semibold tracking-wider text-on-surface-variant/40">
                  {formatShortcut(opt.key, isMac)}
                </kbd>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Inpaint tool button with brush size popover ── */

function InpaintToolButton({
  activeTool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  t,
  isMac,
}: {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  t: ReturnType<typeof useTranslations<"editor">>;
  isMac: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = activeTool === "inpaint";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => { clearTimeout(id); document.removeEventListener("click", handleClick); };
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Main icon — click to activate */}
      <button
        onClick={() => onToolChange("inpaint")}
        className={`relative flex h-8 items-center justify-center rounded-xl rounded-r-lg pl-2 pr-1 transition-colors ${
          isActive
            ? "text-primary"
            : "text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface"
        }`}
        title={`${t("inpaintTool")} (${formatShortcut("P", isMac)})`}
      >
        <PaintBrushIcon weight="fill" className="h-4.5 w-4.5" />
      </button>
      {/* Caret toggle — click to open/close size popover */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 w-3.5 items-center justify-center rounded-xl rounded-l-lg transition-colors ${
          isActive
            ? "text-primary"
            : "text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface"
        }`}
      >
        <svg
          className="opacity-50"
          width="6"
          height="4"
          viewBox="0 0 6 4"
          fill="currentColor"
        >
          <path d="M0 0 L6 0 L3 4 Z" />
        </svg>
      </button>

      {/* Brush size popover */}
      {open && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-xl border border-outline-variant/30 bg-surface/95 px-3 py-2.5 shadow-2xl backdrop-blur-xl"
          style={{ minWidth: 180 }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              {t("brushSize")}
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant/60">
              {brushSize}px
            </span>
          </div>
          <Slider
            min={2}
            max={80}
            value={[brushSize]}
            onValueChange={([v]) => onBrushSizeChange(v)}
            className="w-full"
          />
          {/* Visual preview circle */}
          <div className="mt-2 flex items-center justify-center">
            <div
              className="rounded-full bg-primary/40"
              style={{
                width: Math.max(4, Math.min(brushSize, 60)),
                height: Math.max(4, Math.min(brushSize, 60)),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main toolbar ── */

export function BottomToolbar({
  activeTool,
  onToolChange,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  brushSize,
  onBrushSizeChange,
}: BottomToolbarProps) {
  const t = useTranslations("editor");
  const isMac = useIsMac();
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const setActivePage = useProjectStore((s) => s.setActivePage);

  const currentIndex = pages.findIndex((p) => p.id === activePageId);
  const totalPages = pages.length;

  const goToPrev = () => {
    if (currentIndex > 0) setActivePage(pages[currentIndex - 1].id);
  };
  const goToNext = () => {
    if (currentIndex < totalPages - 1) setActivePage(pages[currentIndex + 1].id);
  };

  /* ── Keyboard shortcuts ── */
  const onToolChangeRef = useRef(onToolChange);
  onToolChangeRef.current = onToolChange;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Require Option (Mac) or Alt (Win) for tool shortcuts
      if (!e.altKey) return;
      // Ignore if Cmd/Ctrl/Shift also held
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      // Use e.code instead of e.key — Option/Alt+letter on Mac
      // produces special characters (e.g. √ for Option+V), but
      // e.code always returns "KeyV", "KeyH", etc.
      switch (e.code) {
        case "KeyV":
          onToolChangeRef.current("select");
          break;
        case "KeyH":
          onToolChangeRef.current("hand");
          break;
        case "KeyM":
          onToolChangeRef.current("rect-select");
          break;
        case "KeyL":
          onToolChangeRef.current("lasso-select");
          break;
        case "KeyP":
          onToolChangeRef.current("inpaint");
          break;
        case "KeyT":
          onToolChangeRef.current("text");
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-outline-variant/30 bg-surface/90 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
      {/* Group 1: Move / Hand */}
      <ToolGroup
        options={MOVE_TOOLS}
        activeTool={activeTool}
        onToolChange={onToolChange}
        t={t}
        isMac={isMac}
      />

      <div className="mx-0.5 h-5 w-px bg-outline-variant/30" />

      {/* Group 2: Rect Select / Lasso */}
      <ToolGroup
        options={SELECTION_TOOLS}
        activeTool={activeTool}
        onToolChange={onToolChange}
        t={t}
        isMac={isMac}
      />

      <div className="mx-0.5 h-5 w-px bg-outline-variant/30" />

      {/* Inpaint tool with brush size popover */}
      <InpaintToolButton
        activeTool={activeTool}
        onToolChange={onToolChange}
        brushSize={brushSize}
        onBrushSizeChange={onBrushSizeChange}
        t={t}
        isMac={isMac}
      />

      <div className="mx-0.5 h-5 w-px bg-outline-variant/30" />

      {/* Text tool (standalone) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToolChange("text")}
        className={`h-8 w-8 rounded-xl p-0 ${
          activeTool === "text"
            ? "text-primary"
            : "text-on-surface-variant hover:text-on-surface"
        }`}
        title={`${t("textTool")} (${formatShortcut("T", isMac)})`}
      >
        <TextTIcon weight="bold" className="h-4.5 w-4.5" />
      </Button>

      <div className="mx-0.5 h-5 w-px bg-outline-variant/30" />

      {/* Zoom controls */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        className="h-8 w-8 rounded-xl p-0 text-on-surface-variant hover:text-on-surface"
        title={t("zoomOut")}
      >
        <MagnifyingGlassMinusIcon weight="fill" className="h-4.5 w-4.5" />
      </Button>
      <span className="min-w-[3rem] text-center text-xs font-medium text-on-surface-variant">
        {zoomPercent}%
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        className="h-8 w-8 rounded-xl p-0 text-on-surface-variant hover:text-on-surface"
        title={t("zoomIn")}
      >
        <MagnifyingGlassPlusIcon weight="fill" className="h-4.5 w-4.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onFitToScreen}
        className="h-8 w-8 rounded-xl p-0 text-on-surface-variant hover:text-on-surface"
        title={t("fitToScreen")}
      >
        <CornersOutIcon weight="fill" className="h-4.5 w-4.5" />
      </Button>

      {totalPages > 0 && (
        <>
          <div className="mx-0.5 h-5 w-px bg-outline-variant/30" />

          {/* Page navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrev}
            disabled={currentIndex <= 0}
            className="h-8 w-8 rounded-xl p-0 text-on-surface-variant hover:text-on-surface disabled:opacity-30"
          >
            <CaretLeftIcon weight="bold" className="h-4 w-4" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-xs font-medium text-on-surface-variant">
            {currentIndex + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            disabled={currentIndex >= totalPages - 1}
            className="h-8 w-8 rounded-xl p-0 text-on-surface-variant hover:text-on-surface disabled:opacity-30"
          >
            <CaretRightIcon weight="bold" className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
