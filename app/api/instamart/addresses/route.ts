import { NextRequest, NextResponse } from "next/server";
import { authenticatedUid } from "@/lib/swiggy/auth";
import { getSwiggyAddresses } from "@/lib/swiggy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ownerUid = await authenticatedUid(request);
  if (!ownerUid) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const addresses = await getSwiggyAddresses(ownerUid);
    return NextResponse.json({ addresses }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to retrieve addresses from the connected Swiggy account." }, { status: 502 });
  }
}
