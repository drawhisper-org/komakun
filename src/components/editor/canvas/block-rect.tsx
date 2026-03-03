import { useEffect, useRef, useMemo, memo } from "react";
import { Rect, Transformer, Group } from "react-konva";
import type Konva from "konva";
import type { TextBlock } from "@/stores/project-store";
import { useEditorSelectionStore } from "@/stores/editor-selection-store";
import { isTextOverflowing } from "./utils/text-overflow";

/* ── Multi-select group bounding box with proportional resize ── */
export function MultiSelectGroup({
  blocks,
  strokeW,
  scale,
  tertiaryColor,
  stageRef,
  onBeforeChange,
  bulkResizeRef,
  bulkChangeRef,
}: {
  blocks: TextBlock[];
  strokeW: number;
  scale: number;
  tertiaryColor: string;
  stageRef: React.RefObject<Konva.Stage | null>;
  onBeforeChange: () => void;
  bulkResizeRef: React.MutableRefObject<(changes: { id: string; x: number; y: number; width: number; height: number }[]) => void>;
  bulkChangeRef: React.MutableRefObject<(changes: { id: string; x: number; y: number }[]) => void>;
}) {
  const groupRectRef = useRef<Konva.Rect>(null);
  const groupTrRef = useRef<Konva.Transformer>(null);

  // Snapshot of child rects at the start of a transform, relative to the group box
  const transformCtxRef = useRef<{
    groupX: number;
    groupY: number;
    groupW: number;
    groupH: number;
    children: { id: string; rx: number; ry: number; rw: number; rh: number }[];
  } | null>(null);

  // Compute bounding box of all selected blocks
  const minX = Math.min(...blocks.map((b) => b.x));
  const minY = Math.min(...blocks.map((b) => b.y));
  const maxX = Math.max(...blocks.map((b) => b.x + b.width));
  const maxY = Math.max(...blocks.map((b) => b.y + b.height));
  const groupW = maxX - minX;
  const groupH = maxY - minY;

  // Attach transformer to the group rect
  useEffect(() => {
    if (groupTrRef.current && groupRectRef.current) {
      groupTrRef.current.nodes([groupRectRef.current]);
      groupTrRef.current.getLayer()?.batchDraw();
    }
  }, [blocks.length, minX, minY, groupW, groupH]);

  const handleTransformStart = () => {
    transformCtxRef.current = {
      groupX: minX,
      groupY: minY,
      groupW,
      groupH,
      children: blocks.map((b) => ({
        id: b.id,
        rx: (b.x - minX) / groupW,
        ry: (b.y - minY) / groupH,
        rw: b.width / groupW,
        rh: b.height / groupH,
      })),
    };
  };

  const handleTransformEnd = () => {
    const node = groupRectRef.current;
    const ctx = transformCtxRef.current;
    if (!node || !ctx) return;

    onBeforeChange();
    const sx = node.scaleX();
    const sy = node.scaleY();
    const newX = node.x();
    const newY = node.y();
    const newW = Math.max(20, groupW * sx);
    const newH = Math.max(14, groupH * sy);

    // Reset scale on the proxy rect
    node.scaleX(1);
    node.scaleY(1);

    // Proportionally update each child block
    const changes = ctx.children.map((c) => ({
      id: c.id,
      x: newX + c.rx * newW,
      y: newY + c.ry * newH,
      width: Math.max(10, c.rw * newW),
      height: Math.max(10, c.rh * newH),
    }));
    bulkResizeRef.current(changes);
    transformCtxRef.current = null;
  };

  // Drag: snapshot at start, apply delta at end
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = () => {
    dragStartRef.current = { x: minX, y: minY };
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const start = dragStartRef.current;
    if (!start) return;
    onBeforeChange();
    const dx = e.target.x() - start.x;
    const dy = e.target.y() - start.y;
    const changes = blocks.map((b) => ({
      id: b.id,
      x: b.x + dx,
      y: b.y + dy,
    }));
    bulkChangeRef.current(changes);
    dragStartRef.current = null;
  };

  const accent = tertiaryColor;
  const anchorSz = 8;
  const anchorCorner = 4;

  return (
    <>
      <Rect
        ref={groupRectRef}
        x={minX}
        y={minY}
        width={groupW}
        height={groupH}
        stroke={accent}
        strokeWidth={strokeW * 0.5}
        dash={[3 / scale, 2 / scale]}
        fill="transparent"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
        onMouseEnter={() => {
          const container = stageRef.current?.container();
          if (container) container.style.cursor = "move";
        }}
        onMouseLeave={() => {
          const container = stageRef.current?.container();
          if (container) container.style.cursor = "";
        }}
      />
      <Transformer
        ref={groupTrRef}
        rotateEnabled={false}
        keepRatio={false}
        enabledAnchors={[
          "top-left", "top-right", "bottom-left", "bottom-right",
        ]}
        anchorSize={anchorSz}
        anchorCornerRadius={anchorCorner}
        anchorStroke={accent}
        anchorStrokeWidth={1.5}
        anchorFill="#fff"
        borderStroke={accent}
        borderStrokeWidth={0}
        borderDash={[0]}
        boundBoxFunc={(_oldBox, newBox) => {
          if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 14) {
            return _oldBox;
          }
          return newBox;
        }}
      />
    </>
  );
}

/* ── Resizable Block Rect — unified for OCR & manual blocks ── */
export const ResizableBlockRect = memo(function ResizableBlockRect({
  block,
  isSelected,
  isMultiSelected,
  strokeW,
  scale,
  listening,
  stageRef,
  primaryColor,
  tertiaryColor,
  errorColor,
  blockNodesRef,
  bulkChangeRef,
  onSelect,
  onBeforeChange,
  onChange,
}: {
  block: TextBlock;
  isSelected: boolean;
  isMultiSelected: boolean;
  strokeW: number;
  scale: number;
  listening: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  primaryColor: string;
  tertiaryColor: string;
  errorColor: string;
  blockNodesRef: React.MutableRefObject<Map<string, Konva.Rect>>;
  bulkChangeRef: React.MutableRefObject<(changes: { id: string; x: number; y: number }[]) => void>;
  onSelect: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onBeforeChange: () => void;
  onChange: (attrs: Partial<TextBlock>) => void;
}) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const isManual = block.source === "manual";

  // Register this node in the shared map for multi-drag coordination
  useEffect(() => {
    if (shapeRef.current) blockNodesRef.current.set(block.id, shapeRef.current);
    return () => { blockNodesRef.current.delete(block.id); };
  }, [block.id, blockNodesRef]);

  useEffect(() => {
    if (isSelected && !isMultiSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isMultiSelected]);

  /* ── Multi-drag tracking ── */
  const dragCtxRef = useRef<{
    startX: number;
    startY: number;
    peers: Map<string, { x: number; y: number }>;
  } | null>(null);

  const handleDragStart = () => {
    if (!isMultiSelected) return;
    const ids = useEditorSelectionStore.getState().selectedBlockIds;
    if (ids.size <= 1) return;
    const peers = new Map<string, { x: number; y: number }>();
    ids.forEach((id) => {
      if (id !== block.id) {
        const node = blockNodesRef.current.get(id);
        if (node) peers.set(id, { x: node.x(), y: node.y() });
      }
    });
    dragCtxRef.current = {
      startX: shapeRef.current!.x(),
      startY: shapeRef.current!.y(),
      peers,
    };
  };

  const handleDragMove = () => {
    const ctx = dragCtxRef.current;
    if (!ctx) return;
    const dx = shapeRef.current!.x() - ctx.startX;
    const dy = shapeRef.current!.y() - ctx.startY;
    ctx.peers.forEach(({ x, y }, id) => {
      const node = blockNodesRef.current.get(id);
      if (node) {
        node.x(x + dx);
        node.y(y + dy);
      }
    });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const ctx = dragCtxRef.current;
    if (ctx) {
      // Bulk-move: push one undo snapshot, then update all selected blocks
      onBeforeChange();
      const changes: { id: string; x: number; y: number }[] = [
        { id: block.id, x: e.target.x(), y: e.target.y() },
      ];
      ctx.peers.forEach(({ x, y }, id) => {
        const node = blockNodesRef.current.get(id);
        if (node) changes.push({ id, x: node.x(), y: node.y() });
      });
      bulkChangeRef.current(changes);
      dragCtxRef.current = null;
    } else {
      onBeforeChange();
      onChange({ x: e.target.x(), y: e.target.y() });
    }
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
  const selectedAccent = tertiaryColor;
  const multiSelectAccent = primaryColor;

  // Detect text overflow — show warning color when text doesn't fit
  const overflowing = useMemo(() => isTextOverflowing(block), [block]);
  const overflowColor = errorColor;

  const stroke = isMultiSelected
    ? multiSelectAccent
    : isSelected
      ? (overflowing ? overflowColor : selectedAccent)
      : overflowing
        ? overflowColor
        : (isManual ? manualColor : ocrColor);
  const fill = isMultiSelected
    ? undefined
    : isSelected
      ? (overflowing ? "rgba(186, 26, 26, 0.08)" : undefined)
      : "rgba(0, 0, 0, 0.01)";

  // Multi-selected blocks get solid border (no dash), single unselected OCR blocks get dashed
  const dashStyle = isMultiSelected
    ? undefined
    : isManual
      ? undefined
      : (isSelected ? undefined : [6 / scale, 3 / scale]);

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
        strokeWidth={isSelected ? strokeW * 1 : strokeW * 0.5}
        fill={fill}
        dash={dashStyle}
        cornerRadius={2 / scale}
        listening={listening}
        draggable={isSelected && !isMultiSelected}
        perfectDrawEnabled={false}
        onClick={(e) => onSelect(e)}
        onTap={(e) => onSelect(e as unknown as Konva.KonvaEventObject<MouseEvent>)}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
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
      {isSelected && !isMultiSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotateAnchorOffset={20}
          rotateAnchorCursor={`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 256 256'%3E%3Cpath fill='%23333' d='M228 48v64a12 12 0 0 1-12 12h-64a12 12 0 0 1 0-24h35L168.4 81.35a76 76 0 1 0 1.14 108.88 12 12 0 0 1 16.92 17A100 100 0 1 1 153 64.52L176 87V52a12 12 0 0 1 24 0Z'/%3E%3C/svg%3E") 10 10, pointer`}
          keepRatio={false}
          enabledAnchors={[
            "top-left", "top-right", "bottom-left", "bottom-right",
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
  prev.isMultiSelected === next.isMultiSelected &&
  prev.strokeW === next.strokeW &&
  prev.scale === next.scale &&
  prev.listening === next.listening &&
  prev.primaryColor === next.primaryColor &&
  prev.tertiaryColor === next.tertiaryColor &&
  prev.errorColor === next.errorColor
));
