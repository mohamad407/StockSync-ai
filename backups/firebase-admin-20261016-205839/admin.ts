import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";
import path from "node:path";

type FirebaseServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function getFirebaseAdminApp() {
  const userProfile = process.env.USERPROFILE;

  if (!userProfile) {
    throw new Error("Windows user profile path is unavailable.");
  }

  const credentialPath = path.join(
    userProfile,
    ".stocksync-secrets",
    "stocksyncai-firebase-adminsdk-fbsvc-1f89a36166.json",
  );

  const existing = getApps().find((app) => app.name === "[DEFAULT]");

  if (existing) {
    return existing;
  }

  const raw = readFileSync(credentialPath, "utf8");
  const account = JSON.parse(raw) as FirebaseServiceAccountJson;

  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error("Firebase service-account JSON is missing required fields.");
  }

  return initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
    projectId: account.project_id,
  });
}

export const adminAuth = getAuth(getFirebaseAdminApp());
