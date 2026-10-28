import "server-only";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export class BrevoError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BrevoError";
    this.status = status;
  }
}

export type EmailRecipient = {
  email: string;
  name?: string | null;
};

export type SendEmailInput = {
  to: EmailRecipient;
  subject: string;
  html: string;
  text: string;
  tags?: string[];
  replyTo?: EmailRecipient;
};

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "StockSync AI";

  if (!apiKey || !senderEmail) {
    throw new Error(
      "Brevo is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL.",
    );
  }

  return { apiKey, senderEmail, senderName };
}

/**
 * Sends one transactional email through Brevo's SMTP/API endpoint.
 * Server-only: the API key never reaches the browser.
 */
export async function sendBrevoEmail(
  input: SendEmailInput,
): Promise<{ messageId: string }> {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();

  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [
        {
          email: input.to.email,
          ...(input.to.name ? { name: input.to.name } : {}),
        },
      ],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
      ...(input.tags?.length ? { tags: input.tags } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new BrevoError(
      payload.message ?? `Brevo responded with status ${response.status}.`,
      response.status,
    );
  }

  return { messageId: payload.messageId ?? "" };
}
