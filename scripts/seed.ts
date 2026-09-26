/**
 * Seeds Firestore with the content categories (data/seed/categories.json) and the
 * generic OBD-II fault code reference data (data/seed/fault-codes.json).
 *
 *   npm run seed                       # categories published, fault codes as DRAFT
 *   npm run seed -- --publish          # publish the fault codes too
 *   npm run seed -- --services         # also seed the DORMANT workshop services catalogue
 *   npm run seed -- --settings data/settings.local.json   # also write real business settings
 *
 * Idempotent (doc id = slug/code). Starter services are neutral placeholders with no
 * prices: review and edit them before publishing. Settings are never invented.
 * Guides and videos are NOT seeded with fake content — see data/seed/guides.json and
 * data/seed/videos.json, which start empty for the workshop to populate for real.
 */
import { readFileSync } from "node:fs";
import { Timestamp } from "firebase-admin/firestore";
import {
  businessSettingsSchema,
  contentCategorySchema,
  faultCodeSchema,
  serviceCategorySchema,
  serviceSchema,
} from "../src/lib/models";
import { arg, flag, initAdmin } from "./_admin";

const { db, businessId } = initAdmin();
const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));

async function main() {
  const now = Timestamp.now();
  const publish = flag("publish");
  const batch = db.batch();

  // Content taxonomy (vehicle groups + topics). Published: a category page only goes
  // public once published content is tagged with it, so no empty pages appear.
  const contentCategories = (readJson("data/seed/categories.json") as unknown[]).map((c) => contentCategorySchema.parse(c));
  for (const c of contentCategories) {
    const { id, ...rest } = c;
    const ref = db.collection("categories").doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`skip existing category: ${id}`);
      continue;
    }
    batch.set(ref, { ...rest, businessId, schemaVersion: 1, createdAt: now.toDate().toISOString(), updatedAt: now.toDate().toISOString() });
  }

  // Dormant workshop catalogue (WORKSHOP_FEATURES_ENABLED): only seeded on request.
  let serviceCount = 0;
  if (flag("services")) {
    const serviceCategories = (readJson("data/seed/service-categories.json") as unknown[]).map((c) => serviceCategorySchema.parse(c));
    for (const c of serviceCategories) {
      const { id, ...rest } = c;
      batch.set(db.collection("serviceCategories").doc(id), { ...rest, businessId, schemaVersion: 1, updatedAt: now }, { merge: true });
    }
    const services = (readJson("data/seed/services.json") as unknown[]).map((s) => serviceSchema.parse(s));
    for (const s of services) {
      const { id, ...rest } = s;
      const ref = db.collection("services").doc(id);
      const snap = await ref.get();
      if (snap.exists) {
        console.log(`skip existing service: ${id}`);
        continue;
      }
      batch.set(ref, { ...rest, status: publish ? "published" : "draft", businessId, schemaVersion: 1, createdAt: now, updatedAt: now });
      serviceCount++;
    }
  }

  // Fault codes: factual generic OBD-II reference data, seeded as drafts like services
  // (review before publishing). Guides and videos start empty in data/seed/*.json — the
  // workshop populates real content there, or in the Firestore console, before publishing.
  const faultCodes = (readJson("data/seed/fault-codes.json") as unknown[]).map((f) => faultCodeSchema.parse(f));
  for (const f of faultCodes) {
    const { id, ...rest } = f;
    const status = publish ? "published" : "draft";
    const ref = db.collection("faultCodes").doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`skip existing fault code: ${id}`);
      continue;
    }
    batch.set(ref, {
      ...rest,
      status,
      businessId,
      schemaVersion: 1,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    });
  }

  const settingsPath = arg("settings");
  if (settingsPath) {
    const { _readme, ...raw } = readJson(settingsPath);
    void _readme;
    const settings = businessSettingsSchema.parse(raw); // throws on invalid/empty values
    batch.set(db.collection("settings").doc(businessId), { ...settings, businessId, schemaVersion: 1, updatedAt: now }, { merge: true });
  }

  await batch.commit();
  console.log(
    `Seeded ${contentCategories.length} content categories and ${faultCodes.length} fault codes (${publish ? "published" : "draft"})` +
      `${serviceCount ? ` and ${serviceCount} workshop services` : ""} for business "${businessId}".`,
  );
  if (!settingsPath) console.log("No settings written. Add real business details with --settings <file>.");
}

main().catch((e) => {
  console.error("Seed failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
