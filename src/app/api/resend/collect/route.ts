import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * POST /api/resend/collect
 *
 * Collects user contact info as a Resend contact after login.
 *
 * Body: {
 *   email: string;
 *   firstName: string;
 *   lastName: string;
 *   locale: string;         // e.g. "en", "ja", "zh", "zh-TW"
 *   waitlist: boolean;      // true = opted in for update notifications
 * }
 *
 * Env: RESEND_APIKEY
 */

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_APIKEY;

    if (!apiKey) {
      // Silently succeed when key is not configured (dev / preview)
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await req.json();
    const { email, firstName, lastName, locale, waitlist } = body as {
      email: string;
      firstName: string;
      lastName: string;
      locale: string;
      waitlist: boolean;
    };

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.contacts.create({
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      unsubscribed: false,
      properties: {
        waitlist: waitlist ? 1 : 0,
        region: locale || "en",
      },
    });

    if (error) {
      console.error("[resend/collect] Resend error:", error);
      return NextResponse.json({ ok: false, error: error.message });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    console.error("[resend/collect] Error:", e);
    // Don't block login
    return NextResponse.json({ ok: false });
  }
}
