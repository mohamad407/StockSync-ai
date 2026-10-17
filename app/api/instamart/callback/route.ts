import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode, statesMatch } from "@/lib/swiggy/oauth";
import { saveSwiggyTokens } from "@/lib/swiggy/token-store";
import { unsealSwiggySecret } from "@/lib/swiggy/secure-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthTransaction = {
  ownerUid: string;
  state: string;
  verifier: string;
  createdAt: number;
};

function clearCookie(response: NextResponse) {
  response.cookies.set("swiggy_oauth_tx", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/instamart/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const returnedState = params.get("state");
  const providerError = params.get("error");
  const sealedTransaction = request.cookies.get("swiggy_oauth_tx")?.value;

  if (providerError || !code || !returnedState || !sealedTransaction) {
    return clearCookie(NextResponse.json({ error: "Swiggy authorization was cancelled or the callback was incomplete. Start again." }, { status: 400 }));
  }

  let transaction: OAuthTransaction;
  try {
    transaction = unsealSwiggySecret<OAuthTransaction>(sealedTransaction);
  } catch {
    return clearCookie(NextResponse.json({ error: "Swiggy authorization session is invalid. Start again." }, { status: 400 }));
  }

  if (
    !transaction.ownerUid || !transaction.verifier || !transaction.state ||
    !Number.isFinite(transaction.createdAt) ||
    Date.now() - transaction.createdAt > 10 * 60 * 1000 ||
    transaction.createdAt > Date.now() + 30_000 ||
    !statesMatch(returnedState, transaction.state)
  ) {
    return clearCookie(NextResponse.json({ error: "Swiggy authorization state is invalid or expired. Start again." }, { status: 400 }));
  }

  const clientId = process.env.SWIGGY_CLIENT_ID;
  const redirectUri = process.env.SWIGGY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return clearCookie(NextResponse.json({ error: "Swiggy OAuth environment variables are missing." }, { status: 500 }));
  }

  try {
    const tokenResponse = await exchangeAuthorizationCode({
      code,
      verifier: transaction.verifier,
      clientId,
      redirectUri,
    });
    await saveSwiggyTokens(transaction.ownerUid, tokenResponse);

    const response = NextResponse.redirect(new URL("/?instamart=connected", request.url));
    return clearCookie(response);
  } catch (error) {
    // Never log authorization codes, access tokens, or refresh tokens.
    console.error("Swiggy OAuth callback failed:", error instanceof Error ? error.message : "Unknown error");
    return clearCookie(NextResponse.json({ error: "Swiggy authorization could not be completed. Verify the registered redirect URI and server configuration." }, { status: 502 }));
  }
}
