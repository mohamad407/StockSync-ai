import { NextRequest, NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  statesMatch,
} from "@/lib/swiggy/oauth";
import { saveSwiggyTokens } from "@/lib/swiggy/token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set("swiggy_oauth_state", "", {
    path: "/api/instamart/callback",
    maxAge: 0,
  });

  response.cookies.set("swiggy_oauth_verifier", "", {
    path: "/api/instamart/callback",
    maxAge: 0,
  });

  return response;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Authorization callback is disabled outside local development." },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const returnedState = params.get("state");
  const providerError = params.get("error");

  if (providerError) {
    return clearOAuthCookies(
      NextResponse.json(
        { error: "Swiggy authorization failed or was declined. Start again." },
        { status: 400 },
      ),
    );
  }

  const expectedState = request.cookies.get("swiggy_oauth_state")?.value;
  const verifier = request.cookies.get("swiggy_oauth_verifier")?.value;

  if (
    !code ||
    !returnedState ||
    !expectedState ||
    !verifier ||
    !statesMatch(returnedState, expectedState)
  ) {
    return clearOAuthCookies(
      NextResponse.json(
        {
          error:
            "OAuth state is missing or invalid. Start from /api/instamart/auth/start and allow the browser to redirect back automatically.",
        },
        { status: 400 },
      ),
    );
  }

  const clientId = process.env.SWIGGY_CLIENT_ID;
  const redirectUri = process.env.SWIGGY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return clearOAuthCookies(
      NextResponse.json(
        { error: "Swiggy OAuth environment variables are missing." },
        { status: 500 },
      ),
    );
  }

  try {
    const tokenResponse = await exchangeAuthorizationCode({
      code,
      verifier,
      clientId,
      redirectUri,
    });

    if (!tokenResponse.access_token) {
      throw new Error("Swiggy did not return an access token.");
    }

    saveSwiggyTokens(tokenResponse);

    const response = NextResponse.redirect(
      new URL("/?instamart=connected", request.url),
    );

    return clearOAuthCookies(response);
  } catch (error) {
    // Do not log authorization codes or tokens.
    console.error(
      "Swiggy OAuth token exchange failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return clearOAuthCookies(
      NextResponse.json(
        {
          error:
            "Swiggy token exchange failed. Check the development terminal for the HTTP status and verify your OAuth configuration.",
        },
        { status: 502 },
      ),
    );
  }
}
