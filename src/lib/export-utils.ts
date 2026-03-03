/**
 * Export utilities for KomaKun!
 * Provides PNG/PSD export (single page) and ZIP export (all pages as PNG or PSD).
 */
import type { PageState, TextBlock } from "@/stores/project-store";
import type { WatermarkConfig } from "@/stores/app-config-store";
import JSZip from "jszip";
import { writePsd, type Psd, type Layer } from "ag-psd";
import { DEFAULT_FONT } from "@/lib/manga-fonts";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Helpers                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Load a base64 data URL into an HTMLImageElement */
function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  });
}

/** Trigger a browser download */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Render a single page to a canvas                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Render a page (original image + inpaint strokes + text blocks) into an
 * OffscreenCanvas and return a Blob.
 */
async function renderPageToBlob(page: PageState, watermark?: WatermarkConfig): Promise<Blob> {
  // Load image(s)
  const originalImg = await loadImage(page.originalImageBase64);
  const w = originalImg.naturalWidth;
  const h = originalImg.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // 1. Draw original image
  ctx.drawImage(originalImg, 0, 0, w, h);

  // 2. Draw cleaned image if available (overlay)
  if (page.cleanedImageBase64) {
    const cleanedImg = await loadImage(page.cleanedImageBase64);
    ctx.drawImage(cleanedImg, 0, 0, w, h);
  }

  // 3. Draw inpaint strokes (white, round cap)
  if (page.inpaintStrokes && page.inpaintStrokes.length > 0) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff";
    for (const stroke of page.inpaintStrokes) {
      ctx.lineWidth = stroke.brushSize;
      ctx.beginPath();
      const pts = stroke.points;
      if (pts.length >= 2) {
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) {
          ctx.lineTo(pts[i], pts[i + 1]);
        }
      }
      ctx.stroke();
    }
  }

  // 4. Draw text blocks
  for (const block of page.textBlocks) {
    renderTextBlock(ctx, block);
  }

  // 5. Draw watermark (bottom-right)
  if (watermark?.enabled && watermark.imageBase64) {
    const wmImg = await loadImage(watermark.imageBase64);
    const sizeScale = watermark.size === "small" ? 0.08 : watermark.size === "large" ? 0.2 : 0.12;
    const maxWmW = w * sizeScale;
    const wmAspect = wmImg.naturalWidth / wmImg.naturalHeight;
    const wmW = Math.min(maxWmW, wmImg.naturalWidth);
    const wmH = wmW / wmAspect;
    const margin = w * 0.008;
    ctx.save();
    ctx.globalAlpha = watermark.opacity;
    ctx.drawImage(wmImg, w - wmW - margin, h - wmH - margin, wmW, wmH);
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png"
    );
  });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Manga text helpers — mirrors konva-stage.tsx tokeniser & normaliser       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function normalizeMangaText(text: string): string {
  let s = text;
  s = s.replace(/\.{3,}/g, "…");
  s = s.replace(/。{2,}/g, "…");
  s = s.replace(/…{2,}/g, "……");
  // Remove spaces between adjacent punctuation marks (!?！？) so pairs combine.
  // Lookahead keeps the second mark unconsumed, so chained marks (！ ？ ！) fully collapse.
  s = s.replace(/([!?！？])\s+(?=[!?！？])/g, "$1");
  return s;
}

const EXPORT_COMBINED_PUNCT_RE = /^[!?！？]{2}$/;
const EXPORT_EM_DASH_CHARS = new Set(["—", "─", "―", "ー"]);
const EXPORT_MIDDLE_DOT_CHARS = new Set(["·", "・", "‧", "⋅", "•"]);
const EXPORT_ELLIPSIS_CHARS = new Set(["…", "⋯"]);
const EXPORT_WAVE_DASH_CHARS = new Set(["~", "～", "〜"]);
const EXPORT_PAREN_CHARS = new Set(["(", ")", "（", "）"]);
const EXPORT_SINGLE_CENTER_PUNCT = new Set(["！", "？", "!", "?"]);
const EXPORT_FULLWIDTH_PUNCT = new Set(["！", "？"]);

/** Convert fullwidth ！？ to halfwidth !? for rendering */
function toHalfwidthPunctExport(ch: string): string {
  if (ch === "！") return "!";
  if (ch === "？") return "?";
  return ch;
}

type ExVToken =
  | { type: "char"; text: string }
  | { type: "combined"; text: string }
  | { type: "dots"; text: string; count: number }
  | { type: "dash"; count: number }
  | { type: "wave"; text: string }
  | { type: "paren"; text: string };

function tokenizeVerticalExport(text: string): ExVToken[] {
  const chars = Array.from(text);
  const tokens: ExVToken[] = [];
  let i = 0;
  while (i < chars.length) {
    if (i + 1 < chars.length) {
      const pair = chars[i] + chars[i + 1];
      if (EXPORT_COMBINED_PUNCT_RE.test(pair)) {
        tokens.push({ type: "combined", text: pair });
        i += 2;
        continue;
      }
    }
    if (EXPORT_EM_DASH_CHARS.has(chars[i])) {
      let count = 0;
      while (i < chars.length && EXPORT_EM_DASH_CHARS.has(chars[i])) { count++; i++; }
      tokens.push({ type: "dash", count });
      continue;
    }
    if (EXPORT_ELLIPSIS_CHARS.has(chars[i])) {
      let dotCount = 0;
      while (i < chars.length && EXPORT_ELLIPSIS_CHARS.has(chars[i])) { dotCount += 3; i++; }
      tokens.push({ type: "dots", text: "·", count: dotCount });
      continue;
    }
    if (EXPORT_MIDDLE_DOT_CHARS.has(chars[i])) {
      let count = 0;
      while (i < chars.length && EXPORT_MIDDLE_DOT_CHARS.has(chars[i])) { count++; i++; }
      tokens.push({ type: "dots", text: "·", count });
      continue;
    }
    if (EXPORT_WAVE_DASH_CHARS.has(chars[i])) {
      tokens.push({ type: "wave", text: chars[i] });
      i++;
      continue;
    }
    if (EXPORT_PAREN_CHARS.has(chars[i])) {
      tokens.push({ type: "paren", text: chars[i] });
      i++;
      continue;
    }
    tokens.push({ type: "char", text: chars[i] });
    i++;
  }
  return tokens;
}

function tokenCellCountExport(t: ExVToken): number {
  if (t.type === "dash") return t.count;
  if (t.type === "dots") return Math.ceil(t.count / 3); // 3 dots per cell (manga standard)
  return 1;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Text rendering on 2D canvas — mirrors konva-stage TextBlockNode           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function renderTextBlock(ctx: CanvasRenderingContext2D, block: TextBlock) {
  const displayText = block.translatedText || block.originalText;
  if (!displayText) return;

  ctx.save();

  const fontFamily = block.fontFamily || `${DEFAULT_FONT}, sans-serif`;
  const fontColor = block.fontColor || "#000000";
  const align = block.textAlign || "center";
  const lineH = block.lineHeight ?? 1.2;
  const rotation = block.rotation ?? 0;
  const fontSize = block.fontSize || 14;
  const fontWeight = block.fontWeight || "normal";
  const fontStyleVal = block.fontStyle || "normal";
  const isVertical = block.textDirection === "vertical";
  const letterSpacing = block.letterSpacing ?? 0;
  const strokeEnabled = block.strokeEnabled ?? false;
  const strokeW = block.strokeWidth ?? 4;
  const contentAlign = block.contentAlign || "middle";
  const pad = block.padding ?? 0;

  // Effective inner dimensions after padding
  const innerW = Math.max(1, block.width - pad * 2);
  const innerH = Math.max(1, block.height - pad * 2);
  const innerX = block.x + pad;
  const innerY = block.y + pad;

  // Apply rotation around the block origin
  if (rotation !== 0) {
    ctx.translate(block.x, block.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-block.x, -block.y);
  }

  const fontStr = `${fontStyleVal} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = fontStr;

  // Apply letter spacing so measureText & fillText/strokeText account for it
  if (letterSpacing !== 0 && "letterSpacing" in ctx) {
    (ctx as unknown as Record<string, string>).letterSpacing = `${letterSpacing}px`;
  }

  if (isVertical) {
    const normalizedText = normalizeMangaText(displayText);
    const charH = fontSize * 1.15 + letterSpacing;
    const colW = fontSize * lineH;
    const charsPerCol = Math.max(1, Math.floor(innerH / charH));

    // Tokenize & build columns (mirrors konva-stage)
    const segments = normalizedText.split("\n");
    const columns: ExVToken[][] = [];
    for (const seg of segments) {
      const tokens = tokenizeVerticalExport(seg);
      if (tokens.length === 0) {
        columns.push([]);
      } else {
        let col: ExVToken[] = [];
        let cells = 0;
        for (const tok of tokens) {
          const c = tokenCellCountExport(tok);
          if (cells + c > charsPerCol && col.length > 0) {
            columns.push(col);
            col = [];
            cells = 0;
          }
          col.push(tok);
          cells += c;
        }
        if (col.length > 0) columns.push(col);
      }
    }

    const totalColumnsW = columns.length * colW;
    const slack = Math.max(0, innerW - totalColumnsW);
    const groupOffset =
      align === "center" ? slack / 2 :
      align === "right" ? slack :
      0;

    // Clip to inner bounds (matches Konva Group clip with padding)
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerW, innerH);
    ctx.clip();

    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci];
      const cx = innerX + groupOffset + (totalColumnsW - (ci + 0.5) * colW);
      let cellIndex = 0;

      // Content align: vertical offset per column
      const colCells = col.reduce((n, t) => n + tokenCellCountExport(t), 0);
      const colContentH = colCells * charH;
      const vSlack = Math.max(0, innerH - colContentH);
      const colYOffset =
        contentAlign === "middle" ? vSlack / 2 :
        contentAlign === "bottom" ? vSlack : 0;

      for (const token of col) {
        const tokenY = innerY + colYOffset + cellIndex * charH;
        const cellsUsed = tokenCellCountExport(token);
        cellIndex += cellsUsed;

        if (token.type === "combined") {
          // Tate-chu-yoko: render pair side by side in one cell.
          // Convert fullwidth ！？ to halfwidth to eliminate glyph padding.
          const pairFontSize = fontSize * 0.88;
          ctx.font = `${fontStyleVal} ${fontWeight} ${pairFontSize}px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const midY = tokenY + charH / 2;
          const renderChars = Array.from(token.text).map(toHalfwidthPunctExport);
          const halfCol = colW / 2;
          for (let ci = 0; ci < renderChars.length; ci++) {
            const chX = cx - halfCol / 2 + ci * halfCol;
            if (strokeEnabled) {
              ctx.fillStyle = "white";
              ctx.strokeStyle = "white";
              ctx.lineWidth = strokeW * 0.7;
              ctx.lineJoin = "round";
              ctx.strokeText(renderChars[ci], chX, midY);
              ctx.fillText(renderChars[ci], chX, midY);
            }
            ctx.fillStyle = fontColor;
            ctx.fillText(renderChars[ci], chX, midY);
          }
          // Restore normal font
          ctx.font = fontStr;
          continue;
        }

        if (token.type === "dots") {
          // Dots (…/···) — render as filled circles stacked vertically
          const totalH = cellsUsed * charH;
          const dotRadius = Math.max(1.5, fontSize * 0.055);
          const gap = totalH / (token.count + 1);
          for (let d = 0; d < token.count; d++) {
            const dY = tokenY + gap * (d + 1);
            if (strokeEnabled) {
              ctx.beginPath();
              ctx.arc(cx, dY, dotRadius + strokeW * 0.3, 0, Math.PI * 2);
              ctx.fillStyle = "white";
              ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(cx, dY, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = fontColor;
            ctx.fill();
          }
          continue;
        }

        if (token.type === "dash") {
          // Em-dash as a continuous vertical line
          const dashH = cellsUsed * charH;
          const lineThickness = Math.max(1.5, fontSize * 0.065);
          const lineX = cx - lineThickness / 2;
          const marginY = charH * 0.08;
          if (strokeEnabled) {
            ctx.fillStyle = "white";
            ctx.fillRect(
              lineX - strokeW * 0.4,
              tokenY + marginY,
              lineThickness + strokeW * 0.8,
              dashH - marginY * 2
            );
          }
          ctx.fillStyle = fontColor;
          ctx.fillRect(lineX, tokenY + marginY, lineThickness, dashH - marginY * 2);
          continue;
        }

        if (token.type === "wave") {
          // Wave dash (~) — render rotated 90° CW
          ctx.save();
          ctx.font = fontStr;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const waveCenterX = cx;
          const waveCenterY = tokenY + charH / 2;
          ctx.translate(waveCenterX, waveCenterY);
          ctx.rotate(Math.PI / 2);
          if (strokeEnabled) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
            ctx.lineWidth = strokeW;
            ctx.lineJoin = "round";
            ctx.strokeText(token.text, 0, 0);
            ctx.fillText(token.text, 0, 0);
          }
          ctx.fillStyle = fontColor;
          ctx.fillText(token.text, 0, 0);
          ctx.restore();
          // Restore font after ctx.restore
          ctx.font = fontStr;
          continue;
        }

        if (token.type === "paren") {
          // Parentheses — render rotated 90° CW like wave dashes
          ctx.save();
          ctx.font = fontStr;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const parenCenterX = cx;
          const parenCenterY = tokenY + charH / 2;
          ctx.translate(parenCenterX, parenCenterY);
          ctx.rotate(Math.PI / 2);
          if (strokeEnabled) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
            ctx.lineWidth = strokeW;
            ctx.lineJoin = "round";
            ctx.strokeText(token.text, 0, 0);
            ctx.fillText(token.text, 0, 0);
          }
          ctx.fillStyle = fontColor;
          ctx.fillText(token.text, 0, 0);
          ctx.restore();
          ctx.font = fontStr;
          continue;
        }

        // Normal character
        // Center single punctuation marks (！？) in their cell
        const isCenterPunct = EXPORT_SINGLE_CENTER_PUNCT.has(token.text);
        // Convert fullwidth ！？ to halfwidth for proper centering
        const renderText = EXPORT_FULLWIDTH_PUNCT.has(token.text) ? toHalfwidthPunctExport(token.text) : token.text;
        ctx.textAlign = "center";
        ctx.textBaseline = isCenterPunct ? "middle" : "top";
        const charY = isCenterPunct ? tokenY + charH / 2 : tokenY;
        if (strokeEnabled) {
          ctx.fillStyle = "white";
          ctx.strokeStyle = "white";
          ctx.lineWidth = strokeW;
          ctx.lineJoin = "round";
          ctx.strokeText(renderText, cx, charY);
          ctx.fillText(renderText, cx, charY);
        }
        ctx.fillStyle = fontColor;
        ctx.fillText(renderText, cx, charY);
      }
    }
  } else {
    // Horizontal text — word wrap (CJK-aware, matching Konva behavior)
    ctx.textAlign = align as CanvasTextAlign;
    ctx.textBaseline = "top";

    const lines = wrapText(ctx, normalizeMangaText(displayText), innerW);
    const lineHeightPx = fontSize * lineH;
    const totalTextH = lines.length * lineHeightPx;
    // Content align (top / middle / bottom)
    const startY =
      contentAlign === "top" ? innerY :
      contentAlign === "bottom" ? innerY + Math.max(0, innerH - totalTextH) :
      innerY + Math.max(0, (innerH - totalTextH) / 2);

    let xPos: number;
    if (align === "center") xPos = innerX + innerW / 2;
    else if (align === "right") xPos = innerX + innerW;
    else xPos = innerX;

    lines.forEach((line, i) => {
      const ly = startY + i * lineHeightPx;
      if (strokeEnabled) {
        ctx.fillStyle = "white";
        ctx.strokeStyle = "white";
        ctx.lineWidth = strokeW;
        ctx.lineJoin = "round";
        ctx.strokeText(line, xPos, ly);
        ctx.fillText(line, xPos, ly);
      }
      ctx.fillStyle = fontColor;
      ctx.fillText(line, xPos, ly);
    });
  }

  ctx.restore();
}

/**
 * CJK-aware word-wrap for Canvas 2D — matches Konva's `wrap: "word"` behaviour.
 *
 * Konva treats each CJK ideograph / kana as its own wrappable unit while still
 * keeping Latin words together.  We replicate that here by first tokenising the
 * paragraph into "tokens" (Latin words = one token, each CJK char = one token)
 * and then greedily fitting them onto lines.
 */
const CJK_RANGE =
  /[\u2E80-\u2FFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/;

function tokenise(text: string): string[] {
  const tokens: string[] = [];
  let buf = "";
  for (const ch of text) {
    if (CJK_RANGE.test(ch)) {
      if (buf) { tokens.push(buf); buf = ""; }
      tokens.push(ch);
    } else if (/\s/.test(ch)) {
      if (buf) { tokens.push(buf); buf = ""; }
      tokens.push(ch); // keep whitespace as a separate token
    } else if (ch === "-") {
      // Hyphen is a word-break opportunity — keep it with the preceding text
      buf += ch;
      tokens.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    const tokens = tokenise(para);
    let currentLine = "";

    for (const token of tokens) {
      // Skip standalone whitespace at start of a new line
      if (!currentLine && /^\s+$/.test(token)) continue;

      const testLine = currentLine + token;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        // Don't start a new line with whitespace
        currentLine = /^\s+$/.test(token) ? "" : token;
      } else {
        currentLine = testLine;
      }
    }

    // If the final accumulated line is wider than maxWidth, break it char-by-char
    // (matches Konva's fallback when a single word exceeds the block width)
    if (currentLine && ctx.measureText(currentLine).width > maxWidth) {
      let charLine = "";
      for (const ch of currentLine) {
        const test = charLine + ch;
        if (ctx.measureText(test).width > maxWidth && charLine) {
          lines.push(charLine);
          charLine = ch;
        } else {
          charLine = test;
        }
      }
      lines.push(charLine || "");
    } else {
      lines.push(currentLine || "");
    }
  }

  return lines;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PSD layer rendering                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Render a page's text blocks onto a transparent canvas (text layer only). */
function renderTextLayer(page: PageState, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  for (const block of page.textBlocks) {
    renderTextBlock(ctx, block);
  }
  return canvas;
}

/** Render inpaint strokes onto a transparent canvas (inpaint layer). */
function renderInpaintLayer(page: PageState, w: number, h: number): HTMLCanvasElement | null {
  if (!page.inpaintStrokes || page.inpaintStrokes.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  for (const stroke of page.inpaintStrokes) {
    ctx.lineWidth = stroke.brushSize;
    ctx.beginPath();
    const pts = stroke.points;
    if (pts.length >= 2) {
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i], pts[i + 1]);
      }
    }
    ctx.stroke();
  }
  return canvas;
}

/** Build a layered PSD for a single page and return as ArrayBuffer. */
async function buildPsd(page: PageState): Promise<ArrayBuffer> {
  const originalImg = await loadImage(page.originalImageBase64);
  const w = originalImg.naturalWidth;
  const h = originalImg.naturalHeight;

  // Original image canvas
  const origCanvas = document.createElement("canvas");
  origCanvas.width = w;
  origCanvas.height = h;
  origCanvas.getContext("2d")!.drawImage(originalImg, 0, 0, w, h);

  const children: Layer[] = [];

  // Layer 1: Original
  children.push({
    name: "Original",
    canvas: origCanvas,
    left: 0,
    top: 0,
  });

  // Layer 2: Cleaned (if available)
  if (page.cleanedImageBase64) {
    const cleanedImg = await loadImage(page.cleanedImageBase64);
    const cleanCanvas = document.createElement("canvas");
    cleanCanvas.width = w;
    cleanCanvas.height = h;
    cleanCanvas.getContext("2d")!.drawImage(cleanedImg, 0, 0, w, h);
    children.push({
      name: "Cleaned",
      canvas: cleanCanvas,
      left: 0,
      top: 0,
    });
  }

  // Layer 3: Inpaint strokes
  const inpaintCanvas = renderInpaintLayer(page, w, h);
  if (inpaintCanvas) {
    children.push({
      name: "Inpaint",
      canvas: inpaintCanvas,
      left: 0,
      top: 0,
    });
  }

  // Layer 4: Text
  const textCanvas = renderTextLayer(page, w, h);
  children.push({
    name: "Text",
    canvas: textCanvas,
    left: 0,
    top: 0,
  });

  const psd: Psd = {
    width: w,
    height: h,
    children,
  };

  return writePsd(psd);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Public API                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Export the current page as a PNG and trigger download.
 */
export async function exportPageAsPng(
  page: PageState,
  projectName: string,
  watermark?: WatermarkConfig
): Promise<void> {
  const blob = await renderPageToBlob(page, watermark);
  const baseName = page.fileName.replace(/\.[^.]+$/, "");
  downloadBlob(blob, `${projectName}_${baseName}.png`);
}

/**
 * Export the current page as a layered PSD and trigger download.
 */
export async function exportPageAsPsd(
  page: PageState,
  projectName: string
): Promise<void> {
  const buffer = await buildPsd(page);
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const baseName = page.fileName.replace(/\.[^.]+$/, "");
  downloadBlob(blob, `${projectName}_${baseName}.psd`);
}

/**
 * Export all pages as PNGs packed into a ZIP file.
 */
export async function exportProjectAsZip(
  pages: PageState[],
  projectName: string,
  watermark?: WatermarkConfig
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(projectName)!;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const blob = await renderPageToBlob(page, watermark);
    const baseName = page.fileName.replace(/\.[^.]+$/, "");
    folder.file(`${String(i + 1).padStart(3, "0")}_${baseName}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${projectName}_png.zip`);
}

/**
 * Export all pages as layered PSDs packed into a ZIP file.
 */
export async function exportProjectAsPsdZip(
  pages: PageState[],
  projectName: string
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(projectName)!;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const buffer = await buildPsd(page);
    const baseName = page.fileName.replace(/\.[^.]+$/, "");
    folder.file(`${String(i + 1).padStart(3, "0")}_${baseName}.psd`, buffer);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${projectName}_psd.zip`);
}
