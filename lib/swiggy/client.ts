import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getSwiggyAccessToken } from "@/lib/swiggy/token-store";

const endpoint = process.env.SWIGGY_MCP_URL || "https://mcp.swiggy.com/im";

type Dict = Record<string, unknown>;

function isAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { status?: unknown; statusCode?: unknown; code?: unknown; cause?: unknown };
  if (value.status === 401 || value.statusCode === 401 || value.code === -32001) return true;
  if (value.cause && typeof value.cause === "object") {
    const cause = value.cause as { status?: unknown; statusCode?: unknown; code?: unknown };
    return cause.status === 401 || cause.statusCode === 401 || cause.code === -32001;
  }
  return false;
}

async function callToolWithToken(
  accessToken: string,
  toolName: string,
  args: Dict,
) {
  const client = new Client({ name: "stocksync-ai", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  try {
    await client.connect(transport);
    return await client.callTool({ name: toolName, arguments: args });
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function callSwiggyTool(
  ownerUid: string,
  toolName: string,
  args: Dict = {},
) {
  const accessToken = await getSwiggyAccessToken(ownerUid);
  if (!accessToken) {
    throw new Error("Swiggy is not connected. Please authorize your account again.");
  }

  try {
    return await callToolWithToken(accessToken, toolName, args);
  } catch (error) {
    if (!isAuthenticationError(error)) throw error;
    const refreshedToken = await getSwiggyAccessToken(ownerUid, true);
    if (!refreshedToken) {
      throw new Error("Swiggy authorization expired. Please reconnect your account.");
    }
    return callToolWithToken(refreshedToken, toolName, args);
  }
}

export async function getSwiggyAddresses(ownerUid: string) {
  return callSwiggyTool(ownerUid, "get_addresses");
}

export async function searchSwiggyProducts(
  ownerUid: string,
  query: string,
  addressId: string,
) {
  return callSwiggyTool(ownerUid, "search_products", { query, addressId });
}

export async function getSwiggyOrders(ownerUid: string, count = 20) {
  const safeCount = Math.max(1, Math.min(20, Math.floor(count)));
  return callSwiggyTool(ownerUid, "get_orders", {
    count: safeCount,
    orderType: "INSTAMART",
    activeOnly: false,
  });
}
