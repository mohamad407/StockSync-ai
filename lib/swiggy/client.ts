import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getSwiggyAccessToken } from "@/lib/swiggy/token-store";

const endpoint =
  process.env.SWIGGY_MCP_URL || "https://mcp.swiggy.com/im";

async function callSwiggyTool(
  toolName: string,
  args: Record<string, unknown> = {},
) {
  const accessToken = getSwiggyAccessToken();

  if (!accessToken) {
    throw new Error("Swiggy is not connected. Please authorize again.");
  }

  const client = new Client({
    name: "stocksync-ai",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(
    new URL(endpoint),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );

  try {
    await client.connect(transport);

    return await client.callTool({
      name: toolName,
      arguments: args,
    });
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function getSwiggyAddresses() {
  return callSwiggyTool("get_addresses");
}

export async function searchSwiggyProducts(
  query: string,
  addressId: string,
) {
  return callSwiggyTool("search_products", {
    query,
    addressId,
  });
}

// Fetch recent Instamart order history.
export async function getSwiggyOrders(count = 20) {
  const safeCount = Math.max(1, Math.min(20, Math.floor(count)));

  return callSwiggyTool("get_orders", {
    count: safeCount,
    orderType: "INSTAMART",
    activeOnly: false,
  });
}

