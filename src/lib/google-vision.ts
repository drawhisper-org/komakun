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
 * All OCR blocks default to "speech" — classification happens during
 * translation so the LLM can use full context (neighbouring blocks,
 * sentence boundary, etc.) instead of heuristic katakana-ratio checks
 * that mis-classify vertical-column text fragments as SFX.
 */
function classifyBlock(_text: string): "speech" | "narration" | "sfx" {
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

  // Group nearby blocks that likely belong to the same speech bubble.
  // Vertical text gets split into per-column blocks by the OCR engine;
  // grouping those back together avoids SFX misclassification and keeps
  // the translation context intact.
  const grouped = groupNearbyBlocks(blocks);

  // Sort by manga reading order: right-to-left, top-to-bottom
  grouped.sort((a, b) => {
    const yTolerance = 50;
    if (Math.abs(a.y - b.y) < yTolerance) {
      return b.x - a.x; // Right to left
    }
    return a.y - b.y; // Top to bottom
  });

  return { blocks: grouped, fullText };
}

/**
 * Merge OCR blocks whose bounding boxes are very close together.
 * Uses union-find to group blocks where the gap between their rects
 * is smaller than a fraction of the smaller block's size.
 */
function groupNearbyBlocks(blocks: OcrTextBlock[]): OcrTextBlock[] {
  if (blocks.length <= 1) return blocks;

  const GAP_RATIO = 0.35; // max gap as fraction of smaller dimension

  // Union-find
  const parent = blocks.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  }
  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      // Compute gap between two rects (negative = overlapping)
      const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
      const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
      // Use Chebyshev-style: both horizontal AND vertical gaps must be small
      const smallerW = Math.min(a.width, b.width);
      const smallerH = Math.min(a.height, b.height);
      const threshX = smallerW * GAP_RATIO;
      const threshY = smallerH * GAP_RATIO;
      if (gapX <= threshX && gapY <= threshY) {
        union(i, j);
      }
    }
  }

  // Collect groups
  const groups = new Map<number, number[]>();
  for (let i = 0; i < blocks.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const result: OcrTextBlock[] = [];
  for (const indices of groups.values()) {
    if (indices.length === 1) {
      result.push(blocks[indices[0]]);
      continue;
    }
    // Merge: union bounding box, concatenate text in right-to-left then top-to-bottom order
    const members = indices.map((i) => blocks[i]);
    members.sort((a, b) => {
      const yTol = 30;
      if (Math.abs(a.y - b.y) < yTol) return b.x - a.x;
      return a.y - b.y;
    });
    const minX = Math.min(...members.map((b) => b.x));
    const minY = Math.min(...members.map((b) => b.y));
    const maxX = Math.max(...members.map((b) => b.x + b.width));
    const maxY = Math.max(...members.map((b) => b.y + b.height));
    result.push({
      text: members.map((b) => b.text).join(""),
      type: "speech",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      // Use bounding rect vertices instead of original polygon
      boundingPoly: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ],
    });
  }
  return result;
}
