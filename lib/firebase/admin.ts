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
  const existing = getApps().find((app) => app.name === "[DEFAULT]");

  if (existing) {
    return existing;
  }

  let account: FirebaseServiceAccountJson;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      account = JSON.parse(serviceAccountJson) as FirebaseServiceAccountJson;
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.",
      );
    }
  } else {
    const userProfile = process.env.USERPROFILE;

    if (!userProfile) {
      throw new Error(
        "Firebase Admin credentials are missing. Configure FIREBASE_SERVICE_ACCOUNT_JSON.",
      );
    }

    const credentialPath = path.join(
      userProfile,
      ".stocksync-secrets",
      "stocksyncai-firebase-adminsdk-fbsvc-1f89a36166.json",
    );

    try {
      account = JSON.parse(
        readFileSync(credentialPath, "utf8"),
      ) as FirebaseServiceAccountJson;
    } catch {
      throw new Error(
        "Could not load the local Firebase Admin service-account file.",
      );
    }
  }

  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error(
      "Firebase service-account credentials are missing required fields.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, "\n"),
    }),
    projectId: account.project_id,
  });
}

export const adminAuth = getAuth(getFirebaseAdminApp());
