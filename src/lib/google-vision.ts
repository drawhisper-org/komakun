/**
 * Google Cloud Vision API client for OCR text detection.
 * Uses DOCUMENT_TEXT_DETECTION for structural block-level detection.
 *
 * Docs: https://cloud.google.com/vision/docs/ocr
 */

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

/* ── Public types ── */

export interface OcrTextBlock {
  text: string;
  type: "speech" | "narration" | "sfx";
  x: number;
  y: number;
  width: number;
  height: number;
  boundingPoly: { x: number; y: number }[];
}

export interface OcrResult {
  blocks: OcrTextBlock[];
  fullText: string;
}

/* ── Main API ── */

/**
 * Validate a Vision API key by making a minimal annotate request.
 */
export async function validateVisionKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey.trim()) return { valid: false, error: "API key is required" };
  try {
    // Send a tiny 1×1 white PNG to test auth
    const tinyPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIHWP4zwAAAgEBAMFOED8AAAAASUVORK5CYII=";
    const res = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: tinyPng },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    });
    if (res.ok) return { valid: true };
    const data = await res.json().catch(() => null);
    return {
      valid: false,
      error: data?.error?.message || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Detect text in an image using Google Cloud Vision API.
 * Returns structured text blocks with bounding boxes.
 */
export async function detectText(
  imageBase64: string,
  apiKey: string
): Promise<OcrResult> {
  if (!apiKey) throw new Error("Vision API key is not configured");

  // Strip data URL prefix if present
  const base64Content = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  const body = {
    requests: [
      {
        image: { content: base64Content },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: {
          languageHints: ["ja", "zh", "ko", "en"],
        },
      },
    ],
  };

  const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vision API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  return parseVisionResponse(data);
}

/**
 * Crop a rectangular region from a base64 image.
 * Returns a new base64 PNG of the cropped area.
 */
export function cropImageRegion(
  imageBase64: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageBase64;
  });
}

/**
 * Crop and mask a region from a base64 image using a polygon.
 * Pixels outside the polygon (but inside the bounding box) are filled white.
 * lassoPoints is a flat array [x0,y0,x1,y1,...] in image-space coords.
 */
export function cropAndMaskRegion(
  imageBase64: string,
  x: number,
  y: number,
  width: number,
  height: number,
  lassoPoints: number[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));

      // Fill background white (masked area)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Clip to the lasso polygon then draw the image
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < lassoPoints.length; i += 2) {
        const px = lassoPoints[i] - x;
        const py = lassoPoints[i + 1] - y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.clip();

      // Draw the cropped portion of the image inside the clipped region
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      ctx.restore();

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageBase64;
  });
}

/* ── Response parsing ── */

/**
 * Classify a text block as speech, narration, or sfx.
 * Simple heuristic based on text length and character patterns.
 */
function classifyBlock(text: string): "speech" | "narration" | "sfx" {
  const trimmed = text.trim();
  // SFX: short, mostly katakana/symbols or ALL CAPS
  const katakanaRatio =
    (trimmed.match(/[\u30A0-\u30FF]/g) || []).length / Math.max(1, trimmed.length);
  if (trimmed.length <= 6 && katakanaRatio > 0.5) return "sfx";
  if (trimmed.length <= 4 && /^[A-Z!?.\s]+$/.test(trimmed)) return "sfx";
  // Narration: longer text without question marks or exclamation
  if (trimmed.length > 40 && !/[!?！？]/.test(trimmed)) return "narration";
  return "speech";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVisionResponse(data: any): OcrResult {
  const blocks: OcrTextBlock[] = [];
  const fullTextAnnotation = data.responses?.[0]?.fullTextAnnotation;
  const fullText: string = fullTextAnnotation?.text ?? "";

  const pageBlocks = fullTextAnnotation?.pages?.[0]?.blocks;
  if (!pageBlocks) return { blocks, fullText };

  for (const block of pageBlocks) {
    if (block.blockType && block.blockType !== "TEXT") continue;

    const vertices = block.boundingBox?.vertices;
    if (!vertices || vertices.length < 4) continue;

    // Concatenate: blocks → paragraphs → words → symbols
    const text = (block.paragraphs ?? [])
      .map((p: { words?: { symbols?: { text?: string }[] }[] }) =>
        (p.words ?? [])
          .map((w) => (w.symbols ?? []).map((s) => s.text ?? "").join(""))
          .join("")
      )
      .join("\n");

    if (!text.trim()) continue;

    const xs = vertices.map((v: { x?: number }) => v.x ?? 0);
    const ys = vertices.map((v: { y?: number }) => v.y ?? 0);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    blocks.push({
      text,
      type: classifyBlock(text),
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      boundingPoly: vertices.map((v: { x?: number; y?: number }) => ({
        x: v.x ?? 0,
        y: v.y ?? 0,
      })),
    });
  }

  // Sort by manga reading order: right-to-left, top-to-bottom
  blocks.sort((a, b) => {
    const yTolerance = 50;
    if (Math.abs(a.y - b.y) < yTolerance) {
      return b.x - a.x; // Right to left
    }
    return a.y - b.y; // Top to bottom
  });

  return { blocks, fullText };
}
