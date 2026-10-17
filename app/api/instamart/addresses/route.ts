import { NextResponse } from "next/server";
import { getSwiggyAddresses } from "@/lib/swiggy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Development endpoint only." },
      { status: 403 },
    );
  }

  try {
    const addresses = await getSwiggyAddresses();
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error(
      "Swiggy address lookup failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      { error: "Unable to retrieve Swiggy addresses." },
      { status: 502 },
    );
  }
}
