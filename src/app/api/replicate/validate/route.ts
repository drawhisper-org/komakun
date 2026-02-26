import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/validate-replicate
 * Proxies a lightweight GET to Replicate's /v1/account to validate the token.
 * This avoids CORS issues when calling from the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey } = (await req.json()) as { apiKey?: string };

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { valid: false, error: "API key is required" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.replicate.com/v1/account", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok) {
      return NextResponse.json({ valid: true });
    }

    if (res.status === 401) {
      return NextResponse.json({ valid: false, error: "Invalid API token" });
    }

    return NextResponse.json({
      valid: false,
      error: `Replicate returned HTTP ${res.status}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        error: err instanceof Error ? err.message : "Network error",
      },
      { status: 500 }
    );
  }
}
