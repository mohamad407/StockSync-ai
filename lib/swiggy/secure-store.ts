import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const encoded = process.env.SWIGGY_TOKEN_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("SWIGGY_TOKEN_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(encoded.trim(), "base64");
  if (key.length !== 32) {
    throw new Error("SWIGGY_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

// AES-256-GCM provides confidentiality and integrity. The same helper protects
// persisted token bundles and the short-lived OAuth transaction cookie.
export function sealSwiggySecret(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function unsealSwiggySecret<T>(sealed: string): T {
  const [version, ivText, tagText, ciphertextText, extra] = sealed.split(".");
  if (version !== "v1" || !ivText || !tagText || ciphertextText === undefined || extra !== undefined) {
    throw new Error("Encrypted Swiggy data has an unsupported format.");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivText, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    throw new Error("Unable to decrypt Swiggy data. Check the encryption key configuration.");
  }
}
