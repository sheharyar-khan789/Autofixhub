/**
 * Security-rules tests. Require the Firebase emulators:  npm run test:rules
 * NOTE: written in Phase 1 but NOT executed in the authoring sandbox (the emulator
 * binaries could not be downloaded there). Run them before trusting the rules.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { getBytes, ref, uploadString } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-workshop",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "services/published-svc"), { status: "published", name: "A", businessId: "default" });
    await setDoc(doc(db, "services/draft-svc"), { status: "draft", name: "B", businessId: "default" });
    await setDoc(doc(db, "serviceCategories/cat"), { status: "published", name: "C", businessId: "default" });
    await setDoc(doc(db, "guides/published-guide"), { status: "published", title: "G", businessId: "default" });
    await setDoc(doc(db, "guides/draft-guide"), { status: "draft", title: "G2", businessId: "default" });
    await setDoc(doc(db, "faultCodes/p0420"), { status: "published", code: "P0420", businessId: "default" });
    await setDoc(doc(db, "faultCodes/draft-code"), { status: "draft", code: "P0000", businessId: "default" });
    await setDoc(doc(db, "videos/published-video"), { status: "published", title: "V", businessId: "default" });
    await setDoc(doc(db, "videos/draft-video"), { status: "draft", title: "V2", businessId: "default" });
    await setDoc(doc(db, "galleryImages/published-photo"), { status: "published", path: "gallery/default/1.jpg", businessId: "default" });
    await setDoc(doc(db, "galleryImages/draft-photo"), { status: "draft", path: "gallery/default/2.jpg", businessId: "default" });
    await setDoc(doc(db, "reviews/published-review"), { status: "published", name: "A. Customer", businessId: "default" });
    await setDoc(doc(db, "reviews/draft-review"), { status: "draft", name: "B. Customer", businessId: "default" });
    await setDoc(doc(db, "categories/dpf"), { status: "published", name: "DPF", businessId: "default" });
    await setDoc(doc(db, "categories/draft-cat"), { status: "draft", name: "Draft", businessId: "default" });
    await setDoc(doc(db, "settings/default"), { tradingName: "X" });
    await setDoc(doc(db, "bookings/b1"), { customer: { email: "a@b.c" } });
    await setDoc(doc(db, "admins/u1"), { role: "owner" });
  });
});

const staff = () => env.authenticatedContext("staff", { role: "owner", businessId: "default" }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const signedIn = () => env.authenticatedContext("someone").firestore();

describe("Firestore rules", () => {
  it("public can read published services and categories", async () => {
    await assertSucceeds(getDoc(doc(anon(), "services/published-svc")));
    await assertSucceeds(getDoc(doc(anon(), "serviceCategories/cat")));
  });
  it("public cannot read draft services or list without a published filter", async () => {
    await assertFails(getDoc(doc(anon(), "services/draft-svc")));
    await assertFails(getDocs(collection(anon(), "services")));
  });
  it("public can read published guides, fault codes and videos but not drafts", async () => {
    await assertSucceeds(getDoc(doc(anon(), "guides/published-guide")));
    await assertSucceeds(getDoc(doc(anon(), "faultCodes/p0420")));
    await assertSucceeds(getDoc(doc(anon(), "videos/published-video")));
    await assertFails(getDoc(doc(anon(), "guides/draft-guide")));
    await assertFails(getDoc(doc(anon(), "faultCodes/draft-code")));
    await assertFails(getDoc(doc(anon(), "videos/draft-video")));
    await assertFails(getDocs(collection(anon(), "guides")));
    await assertFails(getDocs(collection(anon(), "faultCodes")));
    await assertFails(getDocs(collection(anon(), "videos")));
  });
  it("public can read published content categories but not drafts, and never write them", async () => {
    await assertSucceeds(getDoc(doc(anon(), "categories/dpf")));
    await assertFails(getDoc(doc(anon(), "categories/draft-cat")));
    await assertFails(getDocs(collection(anon(), "categories")));
    for (const db of [anon(), signedIn(), staff()]) {
      await assertFails(setDoc(doc(db, "categories/new"), { status: "published" }));
      await assertFails(updateDoc(doc(db, "categories/dpf"), { name: "hacked" }));
      await assertFails(deleteDoc(doc(db, "categories/dpf")));
    }
  });
  it("public can read published gallery photos and reviews but not drafts", async () => {
    await assertSucceeds(getDoc(doc(anon(), "galleryImages/published-photo")));
    await assertSucceeds(getDoc(doc(anon(), "reviews/published-review")));
    await assertFails(getDoc(doc(anon(), "galleryImages/draft-photo")));
    await assertFails(getDoc(doc(anon(), "reviews/draft-review")));
    await assertFails(getDocs(collection(anon(), "galleryImages")));
    await assertFails(getDocs(collection(anon(), "reviews")));
  });
  it("nobody (public, signed-in, or staff) can write via the client", async () => {
    for (const db of [anon(), signedIn(), staff()]) {
      await assertFails(setDoc(doc(db, "services/new"), { status: "published" }));
      await assertFails(updateDoc(doc(db, "services/published-svc"), { name: "hacked" }));
      await assertFails(deleteDoc(doc(db, "services/published-svc")));
      await assertFails(setDoc(doc(db, "bookings/evil"), { x: 1 }));
      await assertFails(setDoc(doc(db, "guides/new"), { status: "published" }));
      await assertFails(setDoc(doc(db, "faultCodes/new"), { status: "published" }));
      await assertFails(setDoc(doc(db, "videos/new"), { status: "published" }));
      await assertFails(setDoc(doc(db, "galleryImages/new"), { status: "published" }));
      await assertFails(updateDoc(doc(db, "galleryImages/published-photo"), { caption: "hacked" }));
      await assertFails(deleteDoc(doc(db, "galleryImages/published-photo")));
      await assertFails(setDoc(doc(db, "reviews/new"), { status: "published" }));
      await assertFails(updateDoc(doc(db, "reviews/published-review"), { review: "hacked" }));
      await assertFails(deleteDoc(doc(db, "reviews/published-review")));
    }
  });
  it("private collections are closed to every client, including staff", async () => {
    for (const path of ["settings/default", "bookings/b1", "admins/u1", "auditLogs/a1", "rateLimits/r1", "contactSubmissions/c1"]) {
      for (const db of [anon(), signedIn(), staff()]) await assertFails(getDoc(doc(db, path)));
    }
  });
  it("unknown collections are denied by default", async () => {
    await assertFails(getDoc(doc(anon(), "somethingNew/x")));
    await assertFails(setDoc(doc(staff(), "somethingNew/x"), { a: 1 }));
  });
});

describe("Storage rules", () => {
  it("denies all client reads and writes", async () => {
    for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext("u"), env.authenticatedContext("s", { role: "owner", businessId: "default" })]) {
      const storage = ctx.storage();
      await assertFails(uploadString(ref(storage, "booking-uploads/b1/1.jpg"), "x"));
      await assertFails(getBytes(ref(storage, "booking-uploads/b1/1.jpg")));
      await assertFails(uploadString(ref(storage, "gallery/default/1.jpg"), "x"));
      await assertFails(getBytes(ref(storage, "gallery/default/1.jpg")));
    }
  });
});
