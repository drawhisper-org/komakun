/**
 * Export utilities for KomaKun!
 * Provides PNG/PSD export (single page) and ZIP export (all pages as PNG or PSD).
 */
import type { PageState, TextBlock } from "@/stores/project-store";
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
async function renderPageToBlob(page: PageState): Promise<Blob> {
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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png"
    );
  });
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
    // Vertical text: multi-column right-to-left like manga
    // Newlines force a column break, then auto-wrap within each segment.
    const charH = fontSize * 1.15 + letterSpacing;
    const colW = fontSize * lineH;
    const charsPerCol = Math.max(1, Math.floor(block.height / charH));

    const segments = displayText.split("\n");
    const columns: string[][] = [];
    for (const seg of segments) {
      const chars = seg.split("");
      if (chars.length === 0) {
        columns.push([]);
      } else {
        for (let i = 0; i < chars.length; i += charsPerCol) {
          columns.push(chars.slice(i, i + charsPerCol));
        }
      }
    }

    const totalColumnsW = columns.length * colW;
    const slack = Math.max(0, block.width - totalColumnsW);
    const groupOffset =
      align === "center" ? slack / 2 :
      align === "right" ? slack :
      0;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Clip to block bounds (matches Konva Group clip)
    ctx.beginPath();
    ctx.rect(block.x, block.y, block.width, block.height);
    ctx.clip();

    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci];
      const cx = block.x + groupOffset + (totalColumnsW - (ci + 0.5) * colW);
      for (let ri = 0; ri < col.length; ri++) {
        const cy = block.y + ri * charH;
        if (strokeEnabled) {
          ctx.fillStyle = "white";
          ctx.strokeStyle = "white";
          ctx.lineWidth = strokeW;
          ctx.lineJoin = "round";
          ctx.strokeText(col[ri], cx, cy);
          ctx.fillText(col[ri], cx, cy);
        }
        ctx.fillStyle = fontColor;
        ctx.fillText(col[ri], cx, cy);
      }
    }
  } else {
    // Horizontal text — word wrap (CJK-aware, matching Konva behavior)
    ctx.textAlign = align as CanvasTextAlign;
    ctx.textBaseline = "top";

    const lines = wrapText(ctx, displayText, block.width);
    const lineHeightPx = fontSize * lineH;
    const totalTextH = lines.length * lineHeightPx;
    // Vertical align middle like Konva
    const startY = block.y + Math.max(0, (block.height - totalTextH) / 2);

    let xPos: number;
    if (align === "center") xPos = block.x + block.width / 2;
    else if (align === "right") xPos = block.x + block.width;
    else xPos = block.x;

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
    lines.push(currentLine || "");
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
  projectName: string
): Promise<void> {
  const blob = await renderPageToBlob(page);
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
  projectName: string
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(projectName)!;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const blob = await renderPageToBlob(page);
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
