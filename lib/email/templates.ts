import "server-only";

export type LowStockEmailItem = {
  name: string;
  quantity: string;
  unit: string;
  lowStockThreshold: string;
};

export type LowStockEmailContent = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildLowStockEmail({
  recipientName,
  items,
  appUrl,
}: {
  recipientName: string | null;
  items: LowStockEmailItem[];
  appUrl: string | null;
}): LowStockEmailContent {
  const count = items.length;
  const itemWord = count === 1 ? "item is" : "items are";
  const greetingName = recipientName?.split(" ")[0];
  const greeting = greetingName ? `Hi ${escapeHtml(greetingName)},` : "Hi there,";
  const subject = `${count} ${count === 1 ? "item is" : "items are"} running low at home`;

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #E3E9EF;font-size:15px;font-weight:600;color:#0E1726;">${escapeHtml(item.name)}</td>
          <td style="padding:12px 0;border-bottom:1px solid #E3E9EF;font-size:14px;color:#B7791F;text-align:right;white-space:nowrap;">${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td>
          <td style="padding:12px 0 12px 16px;border-bottom:1px solid #E3E9EF;font-size:13px;color:#8492A6;text-align:right;white-space:nowrap;">at ${escapeHtml(item.lowStockThreshold)} ${escapeHtml(item.unit)}</td>
        </tr>`,
    )
    .join("");

  const cta = appUrl
    ? `<a href="${escapeHtml(appUrl)}" style="display:inline-block;margin-top:24px;padding:12px 22px;border-radius:12px;background:#0B7A5C;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Plan my restock</a>`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F5F8FA;font-family:Figtree,Arial,sans-serif;color:#0E1726;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E3E9EF;border-radius:20px;overflow:hidden;">
      <div style="background:#075640;padding:24px 28px;color:#ffffff;">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#A7F3D0;">StockSync AI</p>
        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">${count} ${itemWord} running low</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A5568;">${greeting} these items have reached the restock threshold in your pantry.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${rows}
        </table>
        ${cta}
      </div>
      <div style="padding:16px 28px;background:#F5F8FA;font-size:12px;line-height:1.5;color:#8492A6;">
        You are receiving this because you asked StockSync AI to email your low-stock summary. Quantities come from your saved pantry.
      </div>
    </div>
  </body>
</html>`;

  const textLines = items.map(
    (item) =>
      `- ${item.name}: ${item.quantity} ${item.unit} (threshold ${item.lowStockThreshold} ${item.unit})`,
  );

  const text = [
    `${greetingName ? `Hi ${greetingName},` : "Hi there,"} these items have reached the restock threshold in your pantry:`,
    "",
    ...textLines,
    "",
    appUrl ? `Plan your restock: ${appUrl}` : "",
    "",
    "You are receiving this because you asked StockSync AI to email your low-stock summary.",
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");

  return { subject, html, text };
}
