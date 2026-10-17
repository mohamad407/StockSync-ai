import { NextRequest, NextResponse } from "next/server";
import { authenticatedUid } from "@/lib/swiggy/auth";
import { getSwiggyAccessToken } from "@/lib/swiggy/token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ownerUid = await authenticatedUid(request);
  if (!ownerUid) {
    return NextResponse.json({ error: "Sign in to check your Swiggy connection." }, { status: 401 });
  }

  try {
    const token = await getSwiggyAccessToken(ownerUid);
    return NextResponse.json({
      connected: token !== null,
      message: token ? "Swiggy is connected to your StockSync account." : "Swiggy is not connected. Please authorize your account.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      connected: false,
      error: "Your Swiggy session could not be refreshed. Reconnect your Swiggy account and try again.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
