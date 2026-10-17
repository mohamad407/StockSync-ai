import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "Registration is temporarily disabled.",
      message:
        "The OAuth flow must be configured before client registration is enabled.",
    },
    { status: 403 },
  );
}
