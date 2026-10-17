import "server-only";
import type { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function authenticatedUid(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    return decoded.uid || null;
  } catch {
    return null;
  }
}
