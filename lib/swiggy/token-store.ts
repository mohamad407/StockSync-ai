type SwiggyTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
};

declare global {
  var __stockSyncSwiggyTokens: SwiggyTokens | null | undefined;
}

function getStore(): SwiggyTokens | null {
  return globalThis.__stockSyncSwiggyTokens ?? null;
}

export function saveSwiggyTokens(input: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}) {
  globalThis.__stockSyncSwiggyTokens = {
    access_token: input.access_token,
    refresh_token: input.refresh_token,
    expires_at: Date.now() + (input.expires_in ?? 18000) * 1000,
  };
}

export function clearSwiggyTokens() {
  globalThis.__stockSyncSwiggyTokens = null;
}

export function getSwiggyAccessToken(): string | null {
  const tokens = getStore();

  if (!tokens || tokens.expires_at <= Date.now()) {
    return null;
  }

  return tokens.access_token;
}

export function isSwiggyConnected(): boolean {
  return getSwiggyAccessToken() !== null;
}
