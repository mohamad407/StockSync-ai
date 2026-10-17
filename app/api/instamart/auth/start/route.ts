import { NextRequest, NextResponse } from "next/server";
import { authenticatedUid } from "@/lib/swiggy/auth";
import { createOAuthState, createPkcePair, getSwiggyAuthorizationUrl } from "@/lib/swiggy/oauth";
import { sealSwiggySecret } from "@/lib/swiggy/secure-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ownerUid = await authenticatedUid(request);
  if (!ownerUid) {
    return NextResponse.json({ error: "Sign in to StockSync AI before connecting Swiggy." }, { status: 401 });
  }

  const clientId = process.env.SWIGGY_CLIENT_ID;
  const redirectUri = process.env.SWIGGY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Configure SWIGGY_CLIENT_ID and SWIGGY_REDIRECT_URI." }, { status: 500 });
  }

  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    return NextResponse.json({ error: "SWIGGY_REDIRECT_URI must be a valid absolute URL." }, { status: 500 });
  }
  if (process.env.NODE_ENV === "production" && parsedRedirect.protocol !== "https:") {
    return NextResponse.json({ error: "Production Swiggy OAuth requires an HTTPS redirect URI." }, { status: 500 });
  }

  try {
    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();
    const authorizationUrl = getSwiggyAuthorizationUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge: challenge,
    });

    // Bind this one-time OAuth transaction to the signed-in Firebase UID.
    // The cookie is encrypted/authenticated and expires after ten minutes.
    const transaction = sealSwiggySecret({ ownerUid, state, verifier, createdAt: Date.now() });
    const response = NextResponse.json({ authorizationUrl });
    response.cookies.set("swiggy_oauth_tx", transaction, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/instamart/callback",
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to start secure Swiggy authorization. Check server configuration." }, { status: 500 });
  }
}
