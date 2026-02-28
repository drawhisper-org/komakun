import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/vision
 *
 * Server-side proxy for Google Cloud Vision API.
 * Keeps the user's Vision API key server-side so it is never exposed
 * in browser network requests or URL query strings.
 *
 * Body: { apiKey: string, imageBase64: string, mode?: "detect" | "validate" }
 * Returns: the raw Vision API JSON response, or { error }.
 */

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, imageBase64, mode } = (await req.json()) as {
      apiKey?: string;
      imageBase64?: string;
      mode?: "detect" | "validate";
    };

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "Vision API key is required" },
        { status: 400 },
      );
    }

    const isValidate = mode === "validate";

    // For validation, use a tiny 1×1 white PNG; otherwise use the provided image
    const tinyPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIHWP4zwAAAgEBAMFOED8AAAAASUVORK5CYII=";

    const content = isValidate
      ? tinyPng
      : imageBase64?.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

    if (!content) {
      return NextResponse.json(
        { error: "imageBase64 is required for detection" },
        { status: 400 },
      );
    }

    const body = {
      requests: [
        {
          image: { content },
          features: [
            {
              type: isValidate ? "TEXT_DETECTION" : "DOCUMENT_TEXT_DETECTION",
              ...(isValidate ? { maxResults: 1 } : {}),
            },
          ],
          ...(isValidate
            ? {}
            : { imageContext: { languageHints: ["ja", "zh", "ko", "en"] } }),
        },
      ],
    };

    const res = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text();
      // Don't forward raw Google error details — sanitize
      if (res.status === 403 || res.status === 401) {
        return NextResponse.json(
          { error: "Invalid or unauthorized Vision API key" },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { error: `Vision API error (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await res.json();

    // For validation, just return success
    if (isValidate) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Vision API request timed out" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
