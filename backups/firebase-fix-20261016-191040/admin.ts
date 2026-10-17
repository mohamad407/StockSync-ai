import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";
import path from "node:path";

function getFirebaseAdminApp() {
  const credentialPath = path.join(
    process.env.USERPROFILE ?? "",
    ".stocksync-secrets",
    "stocksyncai-firebase-adminsdk-fbsvc-1f89a36166.json",
  );

  const existing = getApps().find((app) => app.name === "[DEFAULT]");
  if (existing) return existing;

  const serviceAccount = JSON.parse(readFileSync(credentialPath, "utf8")) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Firebase Admin credentials are incomplete.");
  }

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

export const adminAuth = getAuth(getFirebaseAdminApp());
