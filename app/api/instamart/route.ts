import { NextRequest, NextResponse } from "next/server";
import { authenticatedUid } from "@/lib/swiggy/auth";
import { getSwiggyAddresses, searchSwiggyProducts } from "@/lib/swiggy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Dict = Record<string, unknown>;
function asDict(value: unknown): Dict | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Dict : null;
}
function decodeToolResult(raw: unknown): Dict {
  const root = asDict(raw);
  if (!root) return {};
  const structured = asDict(root.structuredContent);
  if (structured) return structured;
  if (Array.isArray(root.content)) {
    for (const part of root.content) {
      const text = asDict(part)?.text;
      if (typeof text !== "string") continue;
      try {
        const parsed = asDict(JSON.parse(text));
        if (parsed) return parsed;
      } catch {
        // Try another content block.
      }
    }
  }
  return root;
}
function addressId(address: Dict): string | null {
  for (const key of ["addressId", "id", "address_id", "addressID"]) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function GET(request: NextRequest) {
  const ownerUid = await authenticatedUid(request);
  if (!ownerUid) return NextResponse.json({ error: "Sign in to StockSync AI first." }, { status: 401 });

  const query = request.nextUrl.searchParams.get("q")?.trim();
  const requestedAddressId = request.nextUrl.searchParams.get("addressId")?.trim();
  if (!query || query.length > 120) {
    return NextResponse.json({ error: "Provide a search query between 1 and 120 characters." }, { status: 400 });
  }

  try {
    // Always obtain address IDs from this user's own Swiggy account; never use a hard-coded ID.
    const rawAddresses = await getSwiggyAddresses(ownerUid);
    const addressPayload = decodeToolResult(rawAddresses);
    const addressData = asDict(addressPayload.data) ?? addressPayload;
    const addresses = Array.isArray(addressData.addresses)
      ? addressData.addresses.map(asDict).filter((entry): entry is Dict => entry !== null)
      : [];
    const usableAddresses = addresses.map((address) => ({ address, id: addressId(address) }))
      .filter((entry): entry is { address: Dict; id: string } => entry.id !== null);
    const chosen = requestedAddressId
      ? usableAddresses.find((entry) => entry.id === requestedAddressId)
      : usableAddresses[0];

    if (!chosen) {
      return NextResponse.json({
        error: requestedAddressId
          ? "That address is not part of your connected Swiggy account. Refresh your saved addresses."
          : "No usable saved address was found in your connected Swiggy account.",
      }, { status: 400 });
    }

    const products = await searchSwiggyProducts(ownerUid, query, chosen.id);
    const productResult = asDict(products);
    if (productResult?.isError === true) {
      return NextResponse.json({ error: "Swiggy could not complete the product search." }, { status: 502 });
    }
    return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Swiggy product search failed. Verify connection and MCP access." }, { status: 502 });
  }
}
