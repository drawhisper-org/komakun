"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Rect, Line, Transformer, Group } from "react-konva";
import type Konva from "konva";
import { useProjectStore, type TextBlock } from "@/stores/project-store";
import { useLayerVisibilityStore } from "@/stores/layer-visibility-store";
import { useOcrUiStore } from "@/stores/ocr-store";
import { useEditorSelectionStore } from "@/stores/editor-selection-store";
import { useHistoryStore } from "@/stores/history-store";

/* ── Shared types ── */

export type ActiveTool = "select" | "hand" | "rect-select" | "lasso-select" | "inpaint" | "text";

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

/* ── Image loading hook ── */
function useImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImage(null); return; }
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
    return () => { img.onload = null; img.onerror = null; };
  }, [src]);
  return image;
}

/* ── Marching ants animation hook ── */
function useMarchingAnts(active: boolean) {
  const [dashOffset, setDashOffset] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    let last = 0;
    const tick = (time: number) => {
      if (time - last > 50) {
        setDashOffset((o) => (o + 1) % 200);
        last = time;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return dashOffset;
}

/* ── Font-ready hook ── */
/** Bumps a counter each time a new font face finishes loading, causing Konva text nodes to re-render. */
function useFontGeneration() {
  const [gen, setGen] = useState(0);
  useEffect(() => {
    const bump = () => setGen((g) => g + 1);
    // Re-render once all initially-queued fonts are ready
    document.fonts.ready.then(bump);
    // Re-render each time a new font loads (user picks a Google Font)
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  return gen;
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
  const selectedStrokeId = useEditorSelectionStore((s) => s.selectedStrokeId);
  const selectBlock = useEditorSelectionStore((s) => s.selectBlock);
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
    });
  }, [activePage, pushSnapshot]);

  // Images
  const originalImage = useImage(activePage?.originalImageBase64 ?? null);
  const cleanedImage = useImage(activePage?.cleanedImageBase64 ?? null);

  // Marching ants for persistent selection indicator
  const marchingOffset = useMarchingAnts(!!pendingSelection);

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

  /* ── Backspace to clear selection / delete selected block or stroke ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      // Don't act if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      e.preventDefault();

      const pageId = activePage?.id;
      const { selectedBlockId: blkId, selectedStrokeId: strId } =
        useEditorSelectionStore.getState();

      // Priority: selected block → selected stroke → pending selection
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
      if (pendingSelection) {
        clearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePage?.id, pendingSelection, clearSelection, removeTextBlock, removeInpaintStroke, clearAllSelections, pushCurrentSnapshot]);

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
      const oldScale = viewport.scale;
      const newScale =
        e.evt.deltaY < 0
          ? Math.min(oldScale * scaleBy, MAX_SCALE)
          : Math.max(oldScale / scaleBy, MIN_SCALE);

      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldScale,
        y: (pointer.y - viewport.y) / oldScale,
      };
      onViewportChange({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [viewport, onViewportChange]
  );

  /* ── Pan state ── */

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  /* ── Rect / Lasso selection state (drawing in-progress) ── */

  const [isSelecting, setIsSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ x: number; y: number } | null>(null);
  const [selEnd, setSelEnd] = useState<{ x: number; y: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<number[]>([]);

  /* ── Inpaint brush drawing state ── */
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<number[]>([]);

  /* ── Read primary theme color from CSS variable ── */
  const [primaryColor, setPrimaryColor] = useState("#6750A4");
  useEffect(() => {
    const readPrimary = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      if (raw) setPrimaryColor(raw);
    };
    readPrimary();
    // Re-read when theme might change
    const observer = new MutationObserver(readPrimary);
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
    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  }, [viewport]);

  /* ── Mouse handlers ── */

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Middle-mouse always pans
      if (e.evt.button === 1) {
        isPanning.current = true;
        panStart.current = { x: e.evt.clientX - viewport.x, y: e.evt.clientY - viewport.y };
        e.evt.preventDefault();
        return;
      }

      if (activeTool === "hand") {
        isPanning.current = true;
        panStart.current = { x: e.evt.clientX - viewport.x, y: e.evt.clientY - viewport.y };
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
        // Click on empty space (stage bg or image layer) clears selection.
        // Clicks on bounding box Rects / inpaint Lines are handled in their
        // own onClick props.
        const target = e.target;
        const isBackground =
          target === stageRef.current ||
          target.getClassName() === "Image";
        if (isBackground) {
          clearAllSelections();
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
    [activeTool, viewport.x, viewport.y, toImageSpace, clearSelection, clearAllSelections, activePage?.id, addTextBlocks, selectBlock]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanning.current) {
        onViewportChange({
          ...viewport,
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
      }

      // Text tool drag preview handled by isSelecting + selStart/selEnd
    },
    [viewport, onViewportChange, isSelecting, isDrawing, activeTool, toImageSpace]
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
          id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
          const newId = `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
            fontSize: 14,
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
  }, [isSelecting, isDrawing, drawingPoints, brushSize, activePage?.id, selStart, selEnd, activeTool, lassoPoints, addInpaintStroke, addTextBlocks, selectBlock, pushCurrentSnapshot]);

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
            const isSelected = selectedBlockId === block.id;
            const canInteract = activeTool === "select";
            return (
              <ResizableBlockRect
                key={`bbox-${block.id}`}
                block={block}
                isSelected={isSelected && canInteract}
                strokeW={strokeW}
                scale={viewport.scale}
                listening={canInteract}
                stageRef={stageRef}
                primaryColor={primaryColor}
                onSelect={() => { if (canInteract) selectBlock(block.id); }}
                onBeforeChange={pushCurrentSnapshot}
                onChange={(attrs) => {
                  if (activePage?.id) {
                    updateTextBlock(activePage.id, block.id, attrs);
                  }
                }}
              />
            );
          })}
        </Layer>

        {/* Layer 4: Text Nodes */}
        <Layer visible={visibility.text}>
          {activePage?.textBlocks.map((block) => (
            <TextBlockNode key={block.id} block={block} fontGeneration={fontGeneration} />
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
        <Layer visible={visibility.watermark} />

        {/* Layer 7: Selection overlay (drawing + persistent marching ants) */}
        <Layer listening={false}>
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

/* ── Resizable Block Rect — unified for OCR & manual blocks ── */
const ResizableBlockRect = memo(function ResizableBlockRect({
  block,
  isSelected,
  strokeW,
  scale,
  listening,
  stageRef,
  primaryColor,
  onSelect,
  onBeforeChange,
  onChange,
}: {
  block: TextBlock;
  isSelected: boolean;
  strokeW: number;
  scale: number;
  listening: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  primaryColor: string;
  onSelect: () => void;
  onBeforeChange: () => void;
  onChange: (attrs: Partial<TextBlock>) => void;
}) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const isManual = block.source === "manual";

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onBeforeChange();
    onChange({ x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;
    onBeforeChange();
    const sx = node.scaleX();
    const sy = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * sx),
      height: Math.max(14, node.height() * sy),
      rotation: node.rotation(),
    });
  };

  // Theme-aware colors
  const ocrColor = primaryColor;
  const manualColor = primaryColor;
  const selectedAccent = "#FF6B00";

  const stroke = isSelected ? selectedAccent : (isManual ? manualColor : ocrColor);
  const fill = isSelected
    ? "rgba(255, 107, 0, 0.08)"
    : "rgba(0, 0, 0, 0.01)";

  // Anchor visual config — fixed screen-px (Transformer bypasses Stage transform)
  const anchorSz = 8;
  const anchorCorner = 4; // half → perfect circle

  return (
    <>
      <Rect
        ref={shapeRef}
        x={block.x}
        y={block.y}
        width={block.width}
        height={block.height}
        rotation={block.rotation ?? 0}
        stroke={stroke}
        strokeWidth={isSelected ? strokeW * 1.2 : strokeW * 0.8}
        fill={fill}
        dash={isManual ? undefined : (isSelected ? undefined : [6 / scale, 3 / scale])}
        cornerRadius={2 / scale}
        listening={listening}
        draggable={isSelected}
        perfectDrawEnabled={false}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onMouseEnter={() => {
          if (listening) {
            const container = stageRef.current?.container();
            if (container) container.style.cursor = isSelected ? "move" : "pointer";
          }
        }}
        onMouseLeave={() => {
          const container = stageRef.current?.container();
          if (container) container.style.cursor = "";
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotateAnchorOffset={20}
          rotateAnchorCursor={`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 256 256'%3E%3Cpath fill='%23333' d='M228 48v64a12 12 0 0 1-12 12h-64a12 12 0 0 1 0-24h35L168.4 81.35a76 76 0 1 0 1.14 108.88 12 12 0 0 1 16.92 17A100 100 0 1 1 153 64.52L176 87V52a12 12 0 0 1 24 0Z'/%3E%3C/svg%3E") 10 10, pointer`}
          keepRatio={false}
          enabledAnchors={[
            "top-left", "top-right", "bottom-left", "bottom-right",
            "middle-left", "middle-right", "top-center", "bottom-center",
          ]}
          anchorSize={anchorSz}
          anchorCornerRadius={anchorCorner}
          anchorStroke={selectedAccent}
          anchorStrokeWidth={1.5}
          anchorFill="#ffffff"
          borderStroke={selectedAccent}
          borderStrokeWidth={1}
          borderDash={[0]}
          boundBoxFunc={(_oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 14) {
              return _oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}, (prev, next) => (
  prev.block === next.block &&
  prev.isSelected === next.isSelected &&
  prev.strokeW === next.strokeW &&
  prev.scale === next.scale &&
  prev.listening === next.listening &&
  prev.primaryColor === next.primaryColor
));

/* ── Text Block Node ── */
const TextBlockNode = memo(function TextBlockNode({ block, fontGeneration }: { block: TextBlock; fontGeneration: number }) {
  // fontGeneration is used to force re-render when fonts finish loading
  void fontGeneration;
  const displayText = block.translatedText || block.originalText;
  if (!displayText) return null;

  const isVertical = block.textDirection === "vertical";
  const fontFamily = block.fontFamily || "Comic Neue, sans-serif";
  const fontColor = block.fontColor || "#000000";
  const align = block.textAlign || "center";
  const lineH = block.lineHeight ?? 1.2;
  const rotation = block.rotation ?? 0;
  const fontWeight = block.fontWeight || "normal";
  const fontStyle = block.fontStyle || "normal";
  const letterSpacing = block.letterSpacing ?? 0;
  const strokeEnabled = block.strokeEnabled ?? false;
  const strokeW = block.strokeWidth ?? 4;

  if (isVertical) {
    // Vertical text: multi-column right-to-left layout like real manga.
    // Characters flow top-to-bottom; when a column fills the block height,
    // text wraps to the next column to the left.
    // lineHeight controls column gap (multiplied by fontSize for column width).
    // textAlign maps: left→top, center→center, right→bottom for vertical alignment.
    const fontSize = block.fontSize || 14;
    const charH = fontSize * 1.15 + letterSpacing; // character spacing including user letterSpacing
    const colW = fontSize * lineH; // column width driven by lineHeight (acts as column gap)
    const charsPerCol = Math.max(1, Math.floor(block.height / charH));

    // Split into columns: newlines force a column break,
    // then auto-wrap within each segment when it exceeds block height.
    const segments = displayText.split("\n");
    const columns: string[][] = [];
    for (const seg of segments) {
      const chars = seg.split("");
      if (chars.length === 0) {
        columns.push([]); // empty column for blank newline
      } else {
        for (let i = 0; i < chars.length; i += charsPerCol) {
          columns.push(chars.slice(i, i + charsPerCol));
        }
      }
    }

    const combinedStyle =
      `${fontWeight === "bold" ? "bold" : ""} ${fontStyle}`.trim() || "normal";

    // Horizontal alignment of the column group within the block
    // "left" (top icon) → pack right (RTL start), "center" → center, "right" (bottom icon) → pack left
    const totalColumnsW = columns.length * colW;
    const slack = Math.max(0, block.width - totalColumnsW);
    const groupOffset =
      align === "center" ? slack / 2 :
      align === "right" ? slack :
      0; // "left" → no offset, columns at right edge

    return (
      <Group
        x={block.x}
        y={block.y}
        width={block.width}
        height={block.height}
        rotation={rotation}
        clipX={0}
        clipY={0}
        clipWidth={block.width}
        clipHeight={block.height}
        listening={false}
      >
        {columns.map((col, ci) => {
          // Right-to-left: first column at right edge, shifted by alignment
          const colX = groupOffset + (totalColumnsW - (ci + 1) * colW);
          const sharedProps = {
            x: colX,
            y: 0,
            width: colW,
            text: col.join("\n"),
            fontSize,
            lineHeight: 1.15,
            letterSpacing,
            fontFamily,
            fontStyle: combinedStyle,
            align: "center" as const,
            verticalAlign: "top" as const,
            wrap: "none" as const,
            listening: false,
          };
          return strokeEnabled ? (
            <Group key={ci}>
              {/* Bottom layer: white stroke outline */}
              <KonvaText
                {...sharedProps}
                fill="white"
                stroke="white"
                strokeWidth={strokeW}
                lineJoin="round"
              />
              {/* Top layer: clean fill */}
              <KonvaText
                {...sharedProps}
                fill={fontColor}
                strokeEnabled={false}
              />
            </Group>
          ) : (
            <KonvaText
              key={ci}
              {...sharedProps}
              fill={fontColor}
            />
          );
        })}
      </Group>
    );
  }

  const horizProps = {
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
    rotation,
    text: displayText,
    fontSize: block.fontSize || 14,
    lineHeight: lineH,
    letterSpacing,
    fontFamily,
    fontStyle: `${fontWeight === "bold" ? "bold" : ""} ${fontStyle}`.trim() || "normal",
    align,
    verticalAlign: "middle" as const,
    wrap: "word" as const,
    listening: false,
  };

  if (strokeEnabled) {
    return (
      <Group>
        {/* Bottom layer: white stroke outline */}
        <KonvaText
          {...horizProps}
          fill="white"
          stroke="white"
          strokeWidth={strokeW}
          lineJoin="round"
        />
        {/* Top layer: clean fill */}
        <KonvaText
          {...horizProps}
          fill={fontColor}
          strokeEnabled={false}
        />
      </Group>
    );
  }

  return (
    <KonvaText
      {...horizProps}
      fill={fontColor}
    />
  );
});
