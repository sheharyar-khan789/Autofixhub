import "server-only";
import { dataSource } from "@/lib/env";
import { FirestoreStore } from "./firestore";
import { MemoryStore } from "./memory";
import type { DataStore } from "./types";

const g = globalThis as unknown as { __workshopStore?: DataStore };

/** Singleton store. In dev the memory store survives HMR via globalThis. */
export function getStore(): DataStore {
  const want = dataSource();
  if (g.__workshopStore && g.__workshopStore.kind === want) return g.__workshopStore;
  g.__workshopStore = want === "memory" ? new MemoryStore() : new FirestoreStore();
  return g.__workshopStore;
}

/** Test seam: inject a store (used by unit tests only). */
export function __setStoreForTests(store: DataStore | undefined) {
  g.__workshopStore = store;
}
