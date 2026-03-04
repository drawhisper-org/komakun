"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Line } from "react-konva";
import type Konva from "konva";
import { useProjectStore, type TextBlock } from "@/stores/project-store";
import { useLayerVisibilityStore } from "@/stores/layer-visibility-store";
import { useOcrUiStore } from "@/stores/ocr-store";
import { useEditorSelectionStore } from "@/stores/editor-selection-store";
import { useHistoryStore } from "@/stores/history-store";
import { useAppConfigStore } from "@/stores/app-config-store";
import { useImage, useMarchingAnts, useFontGeneration } from "./utils/canvas-hooks";
import { TextBlockNode } from "./text-block-node";
import { ResizableBlockRect, MultiSelectGroup } from "./block-rect";

/* ── Re-exports consumed by other editor components ── */
export type ActiveTool = "select" | "hand" | "rect-select" | "lasso-select" | "inpaint" | "text";
export { computeAutoFitFontSize } from "./utils/text-overflow";

interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

interface KonvaStageProps {
  viewport: CanvasViewport;
  onViewportChange: (v: CanvasViewport) => void;
  activeTool: ActiveTool;
  fitSignal: number;
  brushSize: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

/** Check if the keyboard event target is an interactive input element. */
function isInputFocused(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement;
  const tag = el?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el?.isContentEditable;
}

/** Generate a unique ID with the given prefix (e.g. "text", "stroke"). */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ── Main component ── */

export function KonvaStage({
  viewport,
  onViewportChange,
  activeTool,
  fitSignal,
  brushSize,
}: KonvaStageProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  const fontGeneration = useFontGeneration();

  // Stable ref for viewport — avoids re-creating callbacks on every viewport change
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Store
  const activePage = useProjectStore(
    (s) => s.pages.find((p) => p.id === s.activePageId) ?? null
  );
  const addTextBlocks = useProjectStore((s) => s.addTextBlocks);
  const updateTextBlock = useProjectStore((s) => s.updateTextBlock);
  const removeTextBlock = useProjectStore((s) => s.removeTextBlock);
  const addInpaintStroke = useProjectStore((s) => s.addInpaintStroke);
  const removeInpaintStroke = useProjectStore((s) => s.removeInpaintStroke);
  const visibility = useLayerVisibilityStore((s) => s.visibility);
  const pendingSelection = useOcrUiStore((s) => s.pendingSelection);
  const clearSelection = useOcrUiStore((s) => s.clearSelection);

  // Selection store
  const selectedBlockId = useEditorSelectionStore((s) => s.selectedBlockId);
  const selectedBlockIds = useEditorSelectionStore((s) => s.selectedBlockIds);
  const selectedStrokeId = useEditorSelectionStore((s) => s.selectedStrokeId);
  const selectBlock = useEditorSelectionStore((s) => s.selectBlock);
  const selectBlocks = useEditorSelectionStore((s) => s.selectBlocks);
  const toggleBlock = useEditorSelectionStore((s) => s.toggleBlock);
  const selectStroke = useEditorSelectionStore((s) => s.selectStroke);
  const clearAllSelections = useEditorSelectionStore((s) => s.clearAll);

  // History store — push snapshot before any undoable mutation
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);

  const pushCurrentSnapshot = useCallback(() => {
    if (!activePage) return;
    pushSnapshot({
      pageId: activePage.id,
      textBlocks: [...activePage.textBlocks],
      inpaintStrokes: [...(activePage.inpaintStrokes ?? [])],
      cleanedImageBase64: activePage.cleanedImageBase64 ?? null,
    });
  }, [activePage, pushSnapshot]);

  // Images
  const originalImage = useImage(activePage?.originalImageBase64 ?? null);
  const cleanedImage = useImage(activePage?.cleanedImageBase64 ?? null);

  // Watermark
  const watermarkConfig = useAppConfigStore((s) => s.watermark);
  const watermarkImage = useImage(watermarkConfig.enabled ? watermarkConfig.imageBase64 : null);

  // Marching ants for persistent selection indicator
  const marchingOffset = useMarchingAnts(!!pendingSelection);

  // Shared map so ResizableBlockRect can coordinate multi-drag
  const blockNodesRef = useRef<Map<string, Konva.Rect>>(new Map());

  // Stable ref callbacks for bulk-drag commits (avoids busting memo)
  const bulkChangeRef = useRef<(changes: { id: string; x: number; y: number }[]) => void>(() => {});
  bulkChangeRef.current = (changes) => {
    if (!activePage) return;
    for (const { id, x, y } of changes) {
      updateTextBlock(activePage.id, id, { x, y });
    }
  };

  // Stable ref callback for bulk-resize commits (group transform)
  const bulkResizeRef = useRef<(changes: { id: string; x: number; y: number; width: number; height: number }[]) => void>(() => {});
  bulkResizeRef.current = (changes) => {
    if (!activePage) return;
    for (const { id, x, y, width, height } of changes) {
      updateTextBlock(activePage.id, id, { x, y, width, height });
    }
  };

  // Ref for arrow-key undo debounce (single snapshot per key-hold)
  const arrowSnapRef = useRef(false);

  // Internal clipboard for copy/paste text blocks
  const clipboardRef = useRef<TextBlock[]>([]);

  // Container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width: Math.max(1, width), height: Math.max(1, height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Keyboard shortcuts (delete, nudge, copy/paste) ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused(e)) return;

      // ── Delete / Backspace ──
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        const pageId = activePage?.id;
        const { selectedBlockId: blkId, selectedBlockIds: blkIds, selectedStrokeId: strId } =
          useEditorSelectionStore.getState();

        if (blkIds.size > 1 && pageId) {
          pushCurrentSnapshot();
          for (const id of blkIds) removeTextBlock(pageId, id);
          clearAllSelections();
          return;
        }
        if (blkId && pageId) {
          pushCurrentSnapshot();
          removeTextBlock(pageId, blkId);
          clearAllSelections();
          return;
        }
        if (strId && pageId) {
          pushCurrentSnapshot();
          removeInpaintStroke(pageId, strId);
          clearAllSelections();
          return;
        }
        if (pendingSelection) clearSelection();
        return;
      }

      // ── Arrow keys to nudge selected block(s) ──
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const pageId = activePage?.id;
        const { selectedBlockId: blkId, selectedBlockIds: blkIds } = useEditorSelectionStore.getState();
        const ids = blkIds.size > 0 ? [...blkIds] : blkId ? [blkId] : [];
        if (ids.length === 0 || !pageId) return;

        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta = { x: 0, y: 0 };
        if (e.key === "ArrowUp") delta.y = -step;
        if (e.key === "ArrowDown") delta.y = step;
        if (e.key === "ArrowLeft") delta.x = -step;
        if (e.key === "ArrowRight") delta.x = step;

        const page = useProjectStore.getState().pages.find((p) => p.id === pageId);
        if (!page) return;

        if (!arrowSnapRef.current) {
          pushCurrentSnapshot();
          arrowSnapRef.current = true;
        }
        for (const id of ids) {
          const block = page.textBlocks.find((b) => b.id === id);
          if (block) updateTextBlock(pageId, id, { x: block.x + delta.x, y: block.y + delta.y });
        }
        return;
      }

      // ── Cmd/Ctrl+C / Cmd/Ctrl+V ──
      if ((e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "v")) {
        const pageId = activePage?.id;
        if (!pageId) return;

        if (e.key === "c") {
          const { selectedBlockId: blkId, selectedBlockIds: blkIds } =
            useEditorSelectionStore.getState();
          const page = useProjectStore.getState().pages.find((p) => p.id === pageId);
          if (!page) return;

          const ids = blkIds.size > 0 ? [...blkIds] : blkId ? [blkId] : [];
          if (ids.length === 0) return;

          const blocks = ids
            .map((id) => page.textBlocks.find((b) => b.id === id))
            .filter(Boolean) as TextBlock[];
          if (blocks.length > 0) {
            clipboardRef.current = blocks.map((b) => ({ ...b }));
          }
          return;
        }

        if (e.key === "v") {
          if (clipboardRef.current.length === 0) return;
          e.preventDefault();

          pushCurrentSnapshot();
          const OFFSET = 20;
          const newBlocks: TextBlock[] = clipboardRef.current.map((b) => ({
            ...b,
            id: generateId("text"),
            source: "manual" as const,
            x: b.x + OFFSET,
            y: b.y + OFFSET,
          }));

          addTextBlocks(pageId, newBlocks);

          if (newBlocks.length === 1) {
            selectBlock(newBlocks[0].id);
          } else {
            selectBlocks(newBlocks.map((b) => b.id));
          }

          clipboardRef.current = newBlocks.map((b) => ({ ...b }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        arrowSnapRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activePage?.id, pendingSelection, clearSelection, removeTextBlock, removeInpaintStroke, clearAllSelections, pushCurrentSnapshot, updateTextBlock, addTextBlocks, selectBlock, selectBlocks]);

  /* ── Fit to screen ── */

  const computeFitViewport = useCallback((): CanvasViewport | null => {
    if (!originalImage || containerSize.width <= 1 || containerSize.height <= 1) return null;
    const imgAspect = originalImage.width / originalImage.height;
    const fill = 0.98; // use 98% of the viewport dimension
    let scale: number;
    if (imgAspect >= 1) {
      // Landscape / square — fit width
      scale = (containerSize.width * fill) / originalImage.width;
      // But don't overflow height
      if (originalImage.height * scale > containerSize.height * fill) {
        scale = (containerSize.height * fill) / originalImage.height;
      }
    } else {
      // Portrait — fit height
      scale = (containerSize.height * fill) / originalImage.height;
      // But don't overflow width
      if (originalImage.width * scale > containerSize.width * fill) {
        scale = (containerSize.width * fill) / originalImage.width;
      }
    }
    scale = Math.min(scale, 1); // don't upscale beyond 100%
    const x = (containerSize.width - originalImage.width * scale) / 2;
    const y = (containerSize.height - originalImage.height * scale) / 2;
    return { x, y, scale };
  }, [originalImage, containerSize]);

  // Auto-fit on first load of each page
  const hasFitted = useRef(false);
  useEffect(() => {
    if (!originalImage || hasFitted.current) return;
    const fit = computeFitViewport();
    if (fit) {
      onViewportChange(fit);
      hasFitted.current = true;
    }
  }, [originalImage, containerSize, computeFitViewport, onViewportChange]);

  const currentPageId = activePage?.id ?? null;
  useEffect(() => {
    hasFitted.current = false;
  }, [currentPageId]);

  // Fit-to-screen button signal from parent
  useEffect(() => {
    if (fitSignal === 0) return;
    const fit = computeFitViewport();
    if (fit) onViewportChange(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  /* ── Mouse wheel zoom ── */

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.08;
      const { scale: oldScale, x: vx, y: vy } = viewportRef.current;
      const newScale =
        e.evt.deltaY < 0
          ? Math.min(oldScale * scaleBy, MAX_SCALE)
          : Math.max(oldScale / scaleBy, MIN_SCALE);

      const mousePointTo = {
        x: (pointer.x - vx) / oldScale,
        y: (pointer.y - vy) / oldScale,
      };
      onViewportChange({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [onViewportChange]
  );

  /* ── Pan state ── */

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  /* ── Rect / Lasso selection state (drawing in-progress) ── */

  const [isSelecting, setIsSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ x: number; y: number } | null>(null);
  const [selEnd, setSelEnd] = useState<{ x: number; y: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<number[]>([]);

  /* ── Drag-select state (select tool multi-select) ── */
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragSelStart, setDragSelStart] = useState<{ x: number; y: number } | null>(null);
  const [dragSelEnd, setDragSelEnd] = useState<{ x: number; y: number } | null>(null);

  /* ── Inpaint brush drawing state ── */
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<number[]>([]);

  /* ── Read theme colors from CSS variables ── */
  const [primaryColor, setPrimaryColor] = useState("#6750A4");
  const [tertiaryColor, setTertiaryColor] = useState("#775368");
  const [errorColor, setErrorColor] = useState("#BA1A1A");
  useEffect(() => {
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      const primary = cs.getPropertyValue("--primary").trim();
      const tertiary = cs.getPropertyValue("--tertiary").trim();
      const destructive = cs.getPropertyValue("--destructive").trim();
      if (primary) setPrimaryColor(primary);
      if (tertiary) setTertiaryColor(tertiary);
      if (destructive) setErrorColor(destructive);
    };
    readColors();
    // Re-read when theme might change
    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => observer.disconnect();
  }, []);

  /** Convert screen pointer to image-space coordinates. */
  const toImageSpace = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const { x: vx, y: vy, scale } = viewportRef.current;
    return {
      x: (pointer.x - vx) / scale,
      y: (pointer.y - vy) / scale,
    };
  }, []);

  /* ── Mouse handlers ── */

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Middle-mouse always pans
      if (e.evt.button === 1) {
        isPanning.current = true;
        panStart.current = { x: e.evt.clientX - viewportRef.current.x, y: e.evt.clientY - viewportRef.current.y };
        e.evt.preventDefault();
        return;
      }

      if (activeTool === "hand") {
        isPanning.current = true;
        panStart.current = { x: e.evt.clientX - viewportRef.current.x, y: e.evt.clientY - viewportRef.current.y };
        e.evt.preventDefault();
        return;
      }

      if (activeTool === "inpaint") {
        const pt = toImageSpace();
        if (!pt) return;
        clearAllSelections();
        setIsDrawing(true);
        setDrawingPoints([pt.x, pt.y]);
        e.evt.preventDefault();
        return;
      }

      if (activeTool === "text") {
        // Drag-to-create: start drawing the text block rectangle
        const target = e.target;
        const isBackground =
          target === stageRef.current ||
          target.getClassName() === "Image";
        if (!isBackground) return;

        const pt = toImageSpace();
        if (!pt) return;
        clearAllSelections();
        setIsSelecting(true);
        setSelStart(pt);
        setSelEnd(pt);
        e.evt.preventDefault();
        return;
      }

      if (activeTool === "select") {
        const target = e.target;
        const isBackground =
          target === stageRef.current ||
          target.getClassName() === "Image";
        if (isBackground) {
          // Start drag-select on background
          const pt = toImageSpace();
          if (pt) {
            clearAllSelections();
            setIsDragSelecting(true);
            setDragSelStart(pt);
            setDragSelEnd(pt);
          } else {
            clearAllSelections();
          }
        }
        return;
      }

      if (activeTool === "rect-select" || activeTool === "lasso-select") {
        const pt = toImageSpace();
        if (!pt) return;
        // Clear any existing selection when starting a new draw
        clearSelection();
        clearAllSelections();
        setIsSelecting(true);
        setSelStart(pt);
        setSelEnd(pt);
        if (activeTool === "lasso-select") setLassoPoints([pt.x, pt.y]);
        e.evt.preventDefault();
      }
    },
    [activeTool, toImageSpace, clearSelection, clearAllSelections]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanning.current) {
        onViewportChange({
          ...viewportRef.current,
          x: e.evt.clientX - panStart.current.x,
          y: e.evt.clientY - panStart.current.y,
        });
        return;
      }

      if (isDrawing && activeTool === "inpaint") {
        const pt = toImageSpace();
        if (!pt) return;
        setDrawingPoints((prev) => [...prev, pt.x, pt.y]);
        return;
      }

      if (isSelecting) {
        const pt = toImageSpace();
        if (!pt) return;
        setSelEnd(pt);
        if (activeTool === "lasso-select") {
          setLassoPoints((prev) => [...prev, pt.x, pt.y]);
        }
        return;
      }

      if (isDragSelecting) {
        const pt = toImageSpace();
        if (pt) setDragSelEnd(pt);
      }
    },
    [onViewportChange, isSelecting, isDragSelecting, isDrawing, activeTool, toImageSpace]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    // Finalize inpaint stroke
    if (isDrawing && drawingPoints.length >= 4) {
      const pageId = activePage?.id;
      if (pageId) {
        pushCurrentSnapshot();
        addInpaintStroke(pageId, {
          id: generateId("stroke"),
          points: [...drawingPoints],
          brushSize,
        });
      }
      setIsDrawing(false);
      setDrawingPoints([]);
      return;
    }
    if (isDrawing) {
      setIsDrawing(false);
      setDrawingPoints([]);
      return;
    }

    if (isSelecting && selStart && selEnd) {
      // Finalize text block creation via drag
      if (activeTool === "text") {
        const x = Math.min(selStart.x, selEnd.x);
        const y = Math.min(selStart.y, selEnd.y);
        const w = Math.abs(selEnd.x - selStart.x);
        const h = Math.abs(selEnd.y - selStart.y);
        if (w > 10 && h > 10 && activePage?.id) {
          pushCurrentSnapshot();
          const newId = generateId("text");
          const { defaultFont, defaultFontSize } = useAppConfigStore.getState();
          addTextBlocks(activePage.id, [{
            id: newId,
            type: "speech",
            source: "manual",
            originalText: "",
            translatedText: "",
            x,
            y,
            width: w,
            height: h,
            fontSize: defaultFontSize,
            fontFamily: defaultFont,
          }]);
          selectBlock(newId);
        }
        setIsSelecting(false);
        setSelStart(null);
        setSelEnd(null);
        return;
      }

      if (activeTool === "lasso-select" && lassoPoints.length >= 6) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 0; i < lassoPoints.length; i += 2) {
          xs.push(lassoPoints[i]);
          ys.push(lassoPoints[i + 1]);
        }
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const region = {
          x: minX,
          y: minY,
          width: Math.max(...xs) - minX,
          height: Math.max(...ys) - minY,
          mode: "lasso" as const,
          lassoPoints: [...lassoPoints],
        };
        if (region.width > 10 && region.height > 10) {
          useOcrUiStore.getState().setPendingSelection(region);
        }
      } else if (activeTool === "rect-select") {
        const x = Math.min(selStart.x, selEnd.x);
        const y = Math.min(selStart.y, selEnd.y);
        const region = {
          x,
          y,
          width: Math.abs(selEnd.x - selStart.x),
          height: Math.abs(selEnd.y - selStart.y),
          mode: "rect" as const,
        };
        if (region.width > 10 && region.height > 10) {
          useOcrUiStore.getState().setPendingSelection(region);
        }
      }

      setIsSelecting(false);
      setSelStart(null);
      setSelEnd(null);
      setLassoPoints([]);
    }

    // Finalize drag-select (select tool multi-select)
    if (isDragSelecting && dragSelStart && dragSelEnd) {
      const rx = Math.min(dragSelStart.x, dragSelEnd.x);
      const ry = Math.min(dragSelStart.y, dragSelEnd.y);
      const rw = Math.abs(dragSelEnd.x - dragSelStart.x);
      const rh = Math.abs(dragSelEnd.y - dragSelStart.y);

      if (rw > 5 && rh > 5 && activePage) {
        // Find blocks fully contained within the drag rect (all 4 corners inside)
        const hits = activePage.textBlocks.filter((b) => {
          return (
            b.x >= rx &&
            b.y >= ry &&
            b.x + b.width <= rx + rw &&
            b.y + b.height <= ry + rh
          );
        });
        if (hits.length > 0) {
          selectBlocks(hits.map((b) => b.id));
        }
      }

      setIsDragSelecting(false);
      setDragSelStart(null);
      setDragSelEnd(null);
      return;
    }
    if (isDragSelecting) {
      setIsDragSelecting(false);
      setDragSelStart(null);
      setDragSelEnd(null);
    }
  }, [isSelecting, isDragSelecting, isDrawing, drawingPoints, brushSize, activePage, dragSelStart, dragSelEnd, selStart, selEnd, activeTool, lassoPoints, addInpaintStroke, addTextBlocks, selectBlock, selectBlocks, pushCurrentSnapshot]);

  /* ── Cursor ── */

  const getInpaintCircleCursor = () => {
    const size = Math.max(4, Math.round(brushSize * viewport.scale));
    const r = size / 2;
    const svgSize = size + 2; // 1px padding for the circle stroke
    const center = svgSize / 2;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${svgSize}' height='${svgSize}'><circle cx='${center}' cy='${center}' r='${r}' fill='none' stroke='white' stroke-width='1.5'/><circle cx='${center}' cy='${center}' r='${r}' fill='none' stroke='black' stroke-width='0.75'/></svg>`;
    const encoded = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encoded}") ${Math.round(center)} ${Math.round(center)}, crosshair`;
  };

  const getCursor = () => {
    switch (activeTool) {
      case "hand":
        return isPanning.current ? "grabbing" : "grab";
      case "rect-select":
      case "lasso-select":
        return "crosshair";
      case "inpaint":
        return getInpaintCircleCursor();
      case "text":
        return "crosshair";
      default:
        return "default";
    }
  };

  /* ── In-progress rect selection visual ── */

  const drawingRect =
    isSelecting && selStart && selEnd && (activeTool === "rect-select" || activeTool === "text")
      ? {
          x: Math.min(selStart.x, selEnd.x),
          y: Math.min(selStart.y, selEnd.y),
          width: Math.abs(selEnd.x - selStart.x),
          height: Math.abs(selEnd.y - selStart.y),
        }
      : null;

  /* ── Drag-select rect (select tool multi-select) ── */
  const dragSelectRect =
    isDragSelecting && dragSelStart && dragSelEnd
      ? {
          x: Math.min(dragSelStart.x, dragSelEnd.x),
          y: Math.min(dragSelStart.y, dragSelEnd.y),
          width: Math.abs(dragSelEnd.x - dragSelStart.x),
          height: Math.abs(dragSelEnd.y - dragSelStart.y),
        }
      : null;

  /* ── Stroke widths that look constant regardless of zoom ── */
  const strokeW = 2 / viewport.scale;
  const dashA = 6 / viewport.scale;
  const dashB = 3 / viewport.scale;

  /* ── Marching ants dash config ── */
  const antStrokeW = 1.5 / viewport.scale;
  const antDash = [5 / viewport.scale, 5 / viewport.scale];
  const antOffset = marchingOffset / viewport.scale;

  return (
    <div ref={containerRef} className="h-full w-full" style={{ cursor: getCursor() }}>
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Layer 1: Original Image */}
        <Layer visible={visibility.original}>
          {originalImage && (
            <KonvaImage image={originalImage} x={0} y={0} width={originalImage.width} height={originalImage.height} />
          )}
        </Layer>

        {/* Layer 2: Cleaned Background */}
        <Layer visible={visibility.cleaned}>
          {cleanedImage && (
            <KonvaImage image={cleanedImage} x={0} y={0} width={cleanedImage.width} height={cleanedImage.height} />
          )}
        </Layer>

        {/* Layer 3: Bounding Boxes — OCR + Manual, all resizable */}
        <Layer visible={visibility.text} listening={activeTool === "select" || activeTool === "text"}>
          {activePage?.textBlocks.map((block) => {
            const isSingleSelected = selectedBlockId === block.id;
            const isInMultiSelect = selectedBlockIds.has(block.id);
            const canInteract = activeTool === "select";
            return (
              <ResizableBlockRect
                key={`bbox-${block.id}`}
                block={block}
                isSelected={(isSingleSelected || isInMultiSelect) && canInteract}
                isMultiSelected={isInMultiSelect && selectedBlockIds.size > 1}
                strokeW={strokeW}
                scale={viewport.scale}
                listening={canInteract}
                stageRef={stageRef}
                primaryColor={primaryColor}
                tertiaryColor={tertiaryColor}
                errorColor={errorColor}
                blockNodesRef={blockNodesRef}
                bulkChangeRef={bulkChangeRef}
                onSelect={(e?: Konva.KonvaEventObject<MouseEvent>) => {
                  if (!canInteract) return;
                  if (e?.evt?.shiftKey) {
                    toggleBlock(block.id);
                  } else {
                    selectBlock(block.id);
                  }
                }}
                onBeforeChange={pushCurrentSnapshot}
                onChange={(attrs) => {
                  if (activePage?.id) {
                    updateTextBlock(activePage.id, block.id, attrs);
                  }
                }}
              />
            );
          })}
          {/* Multi-select group bounding box with resize */}
          {selectedBlockIds.size > 1 && activeTool === "select" && activePage && (
            <MultiSelectGroup
              blocks={activePage.textBlocks.filter((b) => selectedBlockIds.has(b.id))}
              strokeW={strokeW}
              scale={viewport.scale}
              tertiaryColor={tertiaryColor}
              stageRef={stageRef}
              onBeforeChange={pushCurrentSnapshot}
              bulkResizeRef={bulkResizeRef}
              bulkChangeRef={bulkChangeRef}
            />
          )}
        </Layer>

        {/* Layer 4: Text Nodes */}
        <Layer visible={visibility.text}>
          {activePage?.textBlocks.map((block) => (
            <TextBlockNode
              key={`${block.id}-${block.fontFamily ?? ""}-${fontGeneration}`}
              block={block}
              fontGeneration={fontGeneration}
            />
          ))}
        </Layer>

        {/* Layer 5: Inpaint Strokes */}
        <Layer listening={activeTool === "select"}>
          {(activePage?.inpaintStrokes ?? []).map((stroke) => {
            const isSelected = selectedStrokeId === stroke.id;
            return (
              <Line
                key={stroke.id}
                points={stroke.points}
                stroke={isSelected ? "#FF6B00" : primaryColor}
                strokeWidth={stroke.brushSize}
                opacity={isSelected ? 0.7 : 0.5}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
                listening={activeTool === "select"}
                onClick={() => selectStroke(stroke.id)}
                onTap={() => selectStroke(stroke.id)}
                hitStrokeWidth={Math.max(stroke.brushSize, 20 / viewport.scale)}
              />
            );
          })}
          {/* In-progress inpaint stroke */}
          {isDrawing && drawingPoints.length >= 2 && (
            <Line
              points={drawingPoints}
              stroke={primaryColor}
              strokeWidth={brushSize}
              opacity={0.5}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
              listening={false}
            />
          )}
        </Layer>

        {/* Layer 6: Watermark */}
        <Layer visible={visibility.watermark} listening={false}>
          {watermarkImage && originalImage && (() => {
            const sizeScale = watermarkConfig.size === "small" ? 0.08 : watermarkConfig.size === "large" ? 0.2 : 0.12;
            const imgW = originalImage.width;
            const maxWmW = imgW * sizeScale;
            const wmAspect = watermarkImage.width / watermarkImage.height;
            const wmW = Math.min(maxWmW, watermarkImage.width);
            const wmH = wmW / wmAspect;
            const margin = imgW * 0.008;
            return (
              <KonvaImage
                image={watermarkImage}
                x={originalImage.width - wmW - margin}
                y={originalImage.height - wmH - margin}
                width={wmW}
                height={wmH}
                opacity={watermarkConfig.opacity}
              />
            );
          })()}
        </Layer>

        {/* Layer 7: Selection overlay (drawing + persistent marching ants) */}
        <Layer listening={false}>
          {/* ── Drag-select area (select tool multi-select) ── */}
          {dragSelectRect && dragSelectRect.width > 2 && dragSelectRect.height > 2 && (
            <>
              <Rect
                x={dragSelectRect.x}
                y={dragSelectRect.y}
                width={dragSelectRect.width}
                height={dragSelectRect.height}
                fill={tertiaryColor}
                opacity={0.12}
                listening={false}
              />
              <Rect
                x={dragSelectRect.x}
                y={dragSelectRect.y}
                width={dragSelectRect.width}
                height={dragSelectRect.height}
                stroke={tertiaryColor}
                strokeWidth={0.5 / viewport.scale}
                listening={false}
              />
            </>
          )}
          {/* ── Drawing in-progress ── */}
          {isSelecting && drawingRect && activeTool === "rect-select" && (
            <Rect
              x={drawingRect.x}
              y={drawingRect.y}
              width={drawingRect.width}
              height={drawingRect.height}
              stroke="#4285F4"
              strokeWidth={strokeW}
              fill="rgba(66, 133, 244, 0.15)"
              dash={[dashA * 1.5, dashB * 1.5]}
              listening={false}
            />
          )}
          {/* ── Text tool drag preview ── */}
          {isSelecting && drawingRect && activeTool === "text" && (
            <Rect
              x={drawingRect.x}
              y={drawingRect.y}
              width={drawingRect.width}
              height={drawingRect.height}
              stroke="#0D99FF"
              strokeWidth={strokeW}
              fill="rgba(13, 153, 255, 0.10)"
              dash={[4 / viewport.scale, 3 / viewport.scale]}
              listening={false}
            />
          )}
          {isSelecting && activeTool === "lasso-select" && lassoPoints.length >= 4 && (
            <Line
              points={lassoPoints}
              stroke="#4285F4"
              strokeWidth={strokeW}
              fill="rgba(66, 133, 244, 0.15)"
              closed
              dash={[dashA * 1.5, dashB * 1.5]}
              listening={false}
            />
          )}

          {/* ── Persistent selection: marching ants ── */}
          {!isSelecting && pendingSelection && pendingSelection.mode === "rect" && (
            <>
              {/* White underline for contrast */}
              <Rect
                x={pendingSelection.x}
                y={pendingSelection.y}
                width={pendingSelection.width}
                height={pendingSelection.height}
                stroke="#FFFFFF"
                strokeWidth={antStrokeW}
                listening={false}
              />
              {/* Black marching ants */}
              <Rect
                x={pendingSelection.x}
                y={pendingSelection.y}
                width={pendingSelection.width}
                height={pendingSelection.height}
                stroke="#000000"
                strokeWidth={antStrokeW}
                dash={antDash}
                dashOffset={antOffset}
                listening={false}
              />
            </>
          )}
          {!isSelecting && pendingSelection && pendingSelection.mode === "lasso" && pendingSelection.lassoPoints && (
            <>
              <Line
                points={pendingSelection.lassoPoints}
                stroke="#FFFFFF"
                strokeWidth={antStrokeW}
                closed
                listening={false}
              />
              <Line
                points={pendingSelection.lassoPoints}
                stroke="#000000"
                strokeWidth={antStrokeW}
                dash={antDash}
                dashOffset={antOffset}
                closed
                listening={false}
              />
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
}