"use client";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, inMemoryPersistence, setPersistence, type Auth } from "firebase/auth";

/**
 * Browser Firebase config. These NEXT_PUBLIC_ values identify the project and are
 * not secrets; access is enforced by security rules and the server.
 * Note: static `process.env.NEXT_PUBLIC_*` access is required for Next to inline them.
 */
function readConfig() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const missing = Object.entries(cfg)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  return { cfg, missing };
}

export function isClientFirebaseConfigured(): boolean {
  return readConfig().missing.length === 0;
}

export function getClientApp(): FirebaseApp {
  const { cfg, missing } = readConfig();
  if (missing.length) throw new Error(`Firebase client is not configured. Missing: ${missing.join(", ")}`);
  return getApps().length ? getApp() : initializeApp(cfg);
}

let emulatorConnected = false;

/** Auth with in-memory persistence: the httpOnly server session cookie is the only durable credential. */
export async function getClientAuth(): Promise<Auth> {
  const auth = getAuth(getClientApp());
  // Automated tests only (npm run test:admin-flow): point sign-in at the Auth emulator.
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator && !emulatorConnected) {
    connectAuthEmulator(auth, `http://${emulator}`, { disableWarnings: true });
    emulatorConnected = true;
  }
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}
