import { NextRequest, NextResponse } from "next/server";
import { clearSwiggyTokens } from "@/lib/swiggy/token-store";
import {
  createOAuthState,
  createPkcePair,
  getSwiggyAuthorizationUrl,
} from "@/lib/swiggy/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Authorization is disabled outside local development." },
      { status: 403 },
    );
  }

  const clientId = process.env.SWIGGY_CLIENT_ID;
  const redirectUri = process.env.SWIGGY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Set SWIGGY_CLIENT_ID and SWIGGY_REDIRECT_URI in .env.local." },
      { status: 500 },
    );
  }

  // Remove the previous local account before starting a new authorization.
  clearSwiggyTokens();

  const { verifier, challenge } = createPkcePair();
  const state = createOAuthState();

  const authorizationUrl = getSwiggyAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge,
  });

  const response = NextResponse.redirect(authorizationUrl);
  const secure = request.nextUrl.protocol === "https:";

  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/api/instamart/callback",
    maxAge: 600,
  };

  response.cookies.set("swiggy_oauth_verifier", verifier, cookieOptions);
  response.cookies.set("swiggy_oauth_state", state, cookieOptions);

  return response;
}


