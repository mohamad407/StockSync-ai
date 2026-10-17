import { NextResponse } from "next/server";
import { getSwiggyAddresses } from "@/lib/swiggy/client";
import { isSwiggyConnected } from "@/lib/swiggy/token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Dict;
}

function decodeResult(raw: unknown): Dict {
  const root = asDict(raw);

  if (!root) return {};

  const structured = asDict(root.structuredContent);
  if (structured) return structured;

  if (Array.isArray(root.content)) {
    for (const part of root.content) {
      const value = asDict(part)?.text;

      if (typeof value !== "string") continue;

      try {
        const parsed = asDict(JSON.parse(value));
        if (parsed) return parsed;
      } catch {
        // Try the next MCP content block.
      }
    }
  }

  return root;
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Development status endpoint only." },
      { status: 403 },
    );
  }

  if (!isSwiggyConnected()) {
    return NextResponse.json({
      connected: false,
      message: "No valid Swiggy access token is stored.",
    });
  }

  try {
    const raw = await getSwiggyAddresses();
    const payload = decodeResult(raw);
    const data = asDict(payload.data) ?? payload;

    const addresses = Array.isArray(data.addresses)
      ? data.addresses.map(asDict).filter((item): item is Dict => item !== null)
      : [];

    const pagination = asDict(data.pagination);
    const rawPhone = addresses
      .map((address) => address.phoneNumber)
      .find((value): value is string => typeof value === "string");

    const digits = rawPhone?.replace(/\D/g, "") ?? "";

    return NextResponse.json({
      connected: true,
      addressCheckSucceeded: payload.success === true,
      savedAddressCount:
        typeof pagination?.total === "number"
          ? pagination.total
          : addresses.length,
      savedAddressPhoneSuffix:
        digits.length >= 2 ? digits.slice(-2) : null,
      note:
        "The phone suffix is from a saved delivery-address contact, not a verified Swiggy login identifier. No full phone numbers or addresses are returned.",
    });
  } catch {
    return NextResponse.json({
      connected: true,
      addressCheckSucceeded: false,
      message:
        "A token exists, but Swiggy address verification failed. Reauthorization or access troubleshooting may be needed.",
    });
  }
}
