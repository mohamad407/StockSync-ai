import "server-only";
import { and, eq } from "drizzle-orm";
import { db, integrations } from "@/lib/db";
import { refreshSwiggyAccessToken, type SwiggyTokenResponse } from "@/lib/swiggy/oauth";
import { sealSwiggySecret, unsealSwiggySecret } from "@/lib/swiggy/secure-store";

const PROVIDER = "swiggy-instamart";
const TOKEN_METADATA_KEY = "encryptedTokenBundle";

type SwiggyTokenBundle = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
};

async function readStoredBundle(ownerUid: string): Promise<SwiggyTokenBundle | null> {
  const rows = await db
    .select({ connected: integrations.connected, metadata: integrations.metadata })
    .from(integrations)
    .where(and(eq(integrations.ownerUid, ownerUid), eq(integrations.provider, PROVIDER)))
    .limit(1);

  const row = rows[0];
  if (!row || !row.connected) return null;

  const sealed = row.metadata[TOKEN_METADATA_KEY];
  if (typeof sealed !== "string" || !sealed) return null;
  const bundle = unsealSwiggySecret<SwiggyTokenBundle>(sealed);
  if (!bundle.access_token || !Number.isFinite(bundle.expires_at)) {
    throw new Error("Stored Swiggy token data is invalid.");
  }
  return bundle;
}

export async function saveSwiggyTokens(
  ownerUid: string,
  input: Pick<SwiggyTokenResponse, "access_token" | "refresh_token" | "expires_in">,
): Promise<void> {
  if (!ownerUid || !input.access_token) {
    throw new Error("A user ID and Swiggy access token are required.");
  }

  let previous: SwiggyTokenBundle | null = null;
  try {
    previous = await readStoredBundle(ownerUid);
  } catch {
    // A newly-authorized session must still be saveable if an older envelope is invalid.
  }

  const expiresIn = Number.isFinite(input.expires_in) && input.expires_in > 0
    ? input.expires_in
    : 432000;
  const bundle: SwiggyTokenBundle = {
    access_token: input.access_token,
    refresh_token: input.refresh_token ?? previous?.refresh_token,
    expires_at: Date.now() + expiresIn * 1000,
  };
  const metadata = { [TOKEN_METADATA_KEY]: sealSwiggySecret(bundle) };
  const now = new Date();

  await db
    .insert(integrations)
    .values({
      ownerUid,
      provider: PROVIDER,
      connected: true,
      metadata,
    })
    .onConflictDoUpdate({
      target: [integrations.ownerUid, integrations.provider],
      set: { connected: true, metadata, updatedAt: now },
    });
}

export async function clearSwiggyTokens(ownerUid: string): Promise<void> {
  await db
    .update(integrations)
    .set({ connected: false, metadata: {}, updatedAt: new Date() })
    .where(and(eq(integrations.ownerUid, ownerUid), eq(integrations.provider, PROVIDER)));
}

export async function getSwiggyAccessToken(
  ownerUid: string,
  forceRefresh = false,
): Promise<string | null> {
  const bundle = await readStoredBundle(ownerUid);
  if (!bundle) return null;

  // Refresh 2 minutes before expiry to reduce the chance of a request racing expiry.
  if (!forceRefresh && bundle.expires_at > Date.now() + 120_000) {
    return bundle.access_token;
  }

  if (!bundle.refresh_token) {
    if (bundle.expires_at > Date.now() && !forceRefresh) return bundle.access_token;
    await clearSwiggyTokens(ownerUid);
    return null;
  }

  try {
    const refreshed = await refreshSwiggyAccessToken(bundle.refresh_token);
    await saveSwiggyTokens(ownerUid, refreshed);
    return refreshed.access_token;
  } catch {
    // Keep the encrypted record intact for transient provider outages. The caller
    // will ask the user to reconnect if the provider can no longer refresh it.
    throw new Error("Swiggy session could not be refreshed. Please reconnect your Swiggy account.");
  }
}

export async function isSwiggyConnected(ownerUid: string): Promise<boolean> {
  return (await getSwiggyAccessToken(ownerUid)) !== null;
}
