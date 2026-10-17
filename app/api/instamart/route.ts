import { NextRequest, NextResponse } from "next/server";
import { searchSwiggyProducts } from "@/lib/swiggy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The single saved address returned by Swiggy get_addresses.
const SWIGGY_ADDRESS_ID =
  "d1jt7vsodt1l223suro0__AMURVQS3kdAaAoIp4fwldO";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This development endpoint is disabled outside development." },
      { status: 403 },
    );
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length > 120) {
    return NextResponse.json(
      { error: "Provide a search query between 1 and 120 characters." },
      { status: 400 },
    );
  }

  try {
    const products = await searchSwiggyProducts(
      query,
      SWIGGY_ADDRESS_ID,
    );

    if (
      products &&
      typeof products === "object" &&
      "isError" in products &&
      products.isError
    ) {
      console.error("Swiggy product search returned a tool error.");

      return NextResponse.json(
        {
          error: "Swiggy could not complete the product search.",
          result: products,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error(
      "Swiggy product search failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      { error: "Swiggy product search failed. Check the server configuration." },
      { status: 502 },
    );
  }
}
