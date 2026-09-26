/** Shared Admin SDK init for CLI scripts (run with: tsx --env-file=.env.local scripts/<name>.ts). */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function initAdmin() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const missing = [
    !projectId && "FIREBASE_ADMIN_PROJECT_ID",
    !clientEmail && "FIREBASE_ADMIN_CLIENT_EMAIL",
    !privateKey && "FIREBASE_ADMIN_PRIVATE_KEY",
  ].filter(Boolean);
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(", ")}\nRun with: tsx --env-file=.env.local <script>`);
    process.exit(1);
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  return { db, auth: getAuth(), businessId: process.env.BUSINESS_ID?.trim() || "default" };
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
export const flag = (name: string) => process.argv.includes(`--${name}`);
