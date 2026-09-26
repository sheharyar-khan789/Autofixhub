import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readAdminCredentials } from "@/lib/env";

const APP_NAME = "workshop-admin";

/**
 * Lazily initialised so `next build` works without credentials.
 * Throws FirebaseNotConfiguredError when env vars are missing.
 */
export function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  const c = readAdminCredentials();
  return initializeApp(
    {
      credential: cert({
        projectId: c.projectId,
        clientEmail: c.clientEmail,
        privateKey: c.privateKey,
      }),
      storageBucket: c.storageBucket,
    },
    APP_NAME,
  );
}

let dbConfigured = false;
export function getDb(): Firestore {
  const db = getFirestore(getAdminApp());
  if (!dbConfigured) {
    // Optional fields are simply omitted from writes rather than rejected.
    db.settings({ ignoreUndefinedProperties: true });
    dbConfigured = true;
  }
  return db;
}

export function getBucket() {
  return getStorage(getAdminApp()).bucket();
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export { getApp };
