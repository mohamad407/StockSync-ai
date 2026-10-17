import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const BASE_URL = "https://mcp.swiggy.com";

export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function statesMatch(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getSwiggyAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const url = new URL("/auth/authorize", BASE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", "mcp:tools");
  return url.toString();
}

export type SwiggyTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export async function exchangeAuthorizationCode(input: {
  code: string;
  verifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<SwiggyTokenResponse> {
  const response = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: input.clientId,
      code: input.code,
      code_verifier: input.verifier,
      redirect_uri: input.redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Swiggy token exchange failed (${response.status}).`);
  }

  const tokens = (await response.json()) as SwiggyTokenResponse;
  if (!tokens.access_token || !Number.isFinite(tokens.expires_in)) {
    throw new Error("Swiggy returned an invalid token response.");
  }
  return tokens;
}

export async function refreshSwiggyAccessToken(refreshToken: string): Promise<SwiggyTokenResponse> {
  const response = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Swiggy token refresh failed (${response.status}).`);
  }

  const tokens = (await response.json()) as SwiggyTokenResponse;
  if (!tokens.access_token || !Number.isFinite(tokens.expires_in)) {
    throw new Error("Swiggy returned an invalid refreshed token response.");
  }
  return tokens;
}
