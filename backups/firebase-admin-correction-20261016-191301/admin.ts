import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ServiceAccount } from "firebase-admin";

function getFirebaseAdminApp() {
  const credentialPath = path.join(
    process.env.USERPROFILE ?? "",
    ".stocksync-secrets",
    "stocksyncai-firebase-adminsdk-fbsvc-1f89a36166.json",
  );

  const existing = getApps().find((app) => app.name === "[DEFAULT]");
  if (existing) return existing;

  const serviceAccount = JSON.parse(readFileSync(credentialPath, "utf8")) as ServiceAccount;

  if (!serviceAccount.projectId && !("project_id" in serviceAccount)) {
    throw new Error("Firebase Admin credentials are missing the project ID.");
  }

  if (!serviceAccount.clientEmail && !("client_email" in serviceAccount)) {
    throw new Error("Firebase Admin credentials are missing the client email.");
  }

  if (!serviceAccount.privateKey && !("private_key" in serviceAccount)) {
    throw new Error("Firebase Admin credentials are missing the private key.");
  }

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId ?? (serviceAccount as Record<string, string>).project_id,
  });
}

export const adminAuth = getAuth(getFirebaseAdminApp());
