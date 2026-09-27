import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

/**
 * End-to-end admin workflow against the Firebase EMULATORS (Auth + Firestore):
 * the real login form, session lifecycle, authorisation, and CRUD for guides,
 * videos, fault codes and categories. Run with: npm run test:admin-flow
 */
const PROJECT = "demo-autofixhub";
const BASE = "http://localhost:3300";
const PASSWORD = "emulator-password";

const app = getApps()[0] ?? initializeApp({ projectId: PROJECT });
const auth = getAuth(app);
const db = getFirestore(app);

async function idTokenFor(email: string): Promise<string> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
  const res = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  const body = (await res.json()) as { idToken?: string };
  if (!body.idToken) throw new Error(`emulator sign-in failed: ${JSON.stringify(body)}`);
  return body.idToken;
}

/** Fast session for CRUD tests (the login form itself is covered by its own test). */
async function staffSession(context: BrowserContext, email = "owner@example.com") {
  const res = await context.request.post("/api/auth/session", { headers: { origin: BASE }, data: { idToken: await idTokenFor(email) } });
  expect(res.status()).toBe(200);
}

async function loginViaForm(page: Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Turn off the browser's own checks so the server action's validation is what's exercised. */
async function serverValidationOnly(page: Page) {
  await page.waitForLoadState("networkidle"); // after hydration, so React doesn't see a changed attribute
  await page.locator("form").evaluateAll((forms) =>
    forms.forEach((f) => {
      (f as HTMLFormElement).noValidate = true;
      // maxlength truncates typing rather than blocking submit, so an over-long value would never reach the server.
      f.querySelectorAll("[maxlength]").forEach((el) => el.removeAttribute("maxlength"));
    }),
  );
}

/** The input is marked invalid and its error message is attached to it (not just shown somewhere). */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function expectFieldError(page: Page, label: string | RegExp, message: string | RegExp) {
  // getByLabel matches the label's text, which now also contains the visible error; match its start.
  const input = page.getByLabel(typeof label === "string" ? new RegExp(`^${escapeRe(label)}`) : label);
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription(message);
  // The message is announced as the description, not repeated in the field's accessible name.
  if (typeof message === "string") await expect(input).not.toHaveAccessibleName(new RegExp(escapeRe(message)));
}

async function expectSummary(page: Page) {
  await expect(page.getByRole("alert").filter({ hasText: /Couldn't save: fix the/ })).toBeVisible();
}

async function removeDocs(collection: string, field: string, value: string) {
  const snap = await db.collection(collection).where(field, "==", value).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

/** Confirm the accessible delete dialog opened by a row/editor "Delete" button. */
async function confirmDelete(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
}

test.beforeAll(async () => {
  for (const [email, claims] of [
    ["owner@example.com", { role: "owner", businessId: "default" }],
    ["editor@example.com", { role: "editor", businessId: "default" }],
    ["visitor@example.com", null],
  ] as const) {
    const user = await auth.createUser({ email, password: PASSWORD }).catch(() => auth.getUserByEmail(email));
    if (claims) await auth.setCustomUserClaims(user.uid, claims);
  }
  await db.collection("categories").doc("dpf").set({
    businessId: "default", name: "DPF", slug: "dpf", kind: "topic", order: 10, status: "published",
  });
});

test.describe("authentication lifecycle", () => {
  test("login form -> dashboard -> refresh stays signed in -> navigate -> sign out -> locked", async ({ page }) => {
    // Unauthenticated: protected route redirects to login, remembering the destination.
    await page.goto("/admin/guides");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fguides$/);
    await loginViaForm(page, "owner@example.com");
    await expect(page).toHaveURL(/\/admin\/guides$/); // back where they were going
    await expect(page.getByRole("heading", { level: 1, name: "Repair guides" })).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Content overview" })).toBeVisible();
    await expect(page.getByText(/couldn't be loaded/)).toHaveCount(0); // no index/permission errors

    await page.reload(); // session restoration
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Admin" });
    for (const [label, heading] of [["Guides", "Repair guides"], ["Videos", "Videos"], ["Fault codes", "Fault codes"], ["Categories", "Categories"], ["Activity", "Activity"], ["SEO", "SEO"]]) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }

    // Login page while signed in skips straight to the dashboard.
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("button", { name: /owner@example\.com|Account/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    for (const path of ["/admin", "/admin/guides", "/admin/settings"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/login/);
    }
  });

  test("wrong password shows a clear error (no account enumeration) and the form stays usable", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("owner@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("a signed-in account without a staff role gets no session (403)", async ({ request }) => {
    const res = await request.post("/api/auth/session", { headers: { origin: BASE }, data: { idToken: await idTokenFor("visitor@example.com") } });
    expect(res.status()).toBe(403);
  });

  test("an invalid/expired session is sent to login with an explanation", async ({ page, context }) => {
    await context.addCookies([{ name: "admin_session", value: "expired-or-forged", url: BASE }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?reason=expired$/);
    await expect(page.getByText("Your session has ended")).toBeVisible();
  });

  test("an editor can manage content but is kept out of settings with a clear message", async ({ page, context }) => {
    await staffSession(context, "editor@example.com");
    await page.goto("/admin/guides");
    await expect(page.getByRole("heading", { level: 1, name: "Repair guides" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Settings" })).toHaveCount(0);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin(\?|$)/);
    await expect(page.getByRole("alert").filter({ hasText: "doesn't have access" })).toBeVisible();
  });

  test("signing out revokes the session server-side (replayed cookie is rejected)", async ({ context }) => {
    await staffSession(context);
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    const cookie = (await context.cookies()).find((c) => c.name === "admin_session")!;
    await page.getByRole("button", { name: /owner@example\.com|Account/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await context.addCookies([cookie]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("content CRUD", () => {
  test.beforeEach(async ({ context }) => staffSession(context));

  test("guide: draft -> edit -> clear optional field -> publish -> public page, sitemap, category -> unpublish -> delete", async ({ page, request }) => {
    const SLUG = "emulator-test-dpf-guide";
    await page.goto("/admin/guides");
    await page.getByRole("link", { name: "New guide" }).first().click();
    await expect(page).toHaveURL(/\/admin\/guides\/new$/);
    await page.getByLabel(/^Title/).fill("Emulator test: DPF warning light");
    await page.getByLabel(/^Slug/).fill(SLUG);
    await page.getByLabel(/^Summary/).fill("Emulator-only guide used to verify the publishing workflow.");
    await page.getByLabel(/^Main content/).fill("First paragraph.\n\nSecond paragraph.");
    await page.getByLabel("Make", { exact: true }).fill("Volkswagen");
    await page.getByLabel(/^Diagnosis/).fill("Emulator diagnosis text.");
    await page.getByLabel(/^YouTube video URL/).fill("https://youtu.be/abcdefghijk");
    await page.getByLabel("DPF", { exact: true }).check();
    await page.getByLabel(/^FAQ/).fill("Q: Emulator question?\nA: Emulator answer.");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page).toHaveURL(/\/admin\/guides/);
    await expect(page.getByRole("status").filter({ hasText: "Created as a draft" })).toBeVisible();
    const row = page.getByRole("row", { name: /Emulator test: DPF warning light/ });
    await expect(row).toContainText(/draft/i);

    // Draft: not public, not in the sitemap, category page not created.
    expect((await request.get(`/guides/${SLUG}`)).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(SLUG);
    expect((await request.get("/categories/dpf")).status()).toBe(404);

    // Edit: clear an optional field, then publish from the editor.
    await row.getByRole("link", { name: /Emulator test/ }).click();
    await page.getByLabel(/^Diagnosis/).fill("");
    await page.getByRole("button", { name: "Publish guide" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Published" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Emulator test/ })).toContainText(/published/i);

    // Public page, metadata, structured data, cleared field really gone.
    await page.goto(`/guides/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Emulator test: DPF warning light");
    await expect(page.getByRole("heading", { name: "Diagnosis" })).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${BASE}/guides/${SLUG}`);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    expect(ld.map((x) => x["@type"])).toEqual(expect.arrayContaining(["Article", "BreadcrumbList", "FAQPage"]));
    expect(ld.find((x) => x["@type"] === "Article").datePublished).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await expect(page.getByRole("link", { name: /Watch on YouTube/ })).toHaveAttribute("href", "https://www.youtube.com/watch?v=abcdefghijk");
    expect(await (await request.get("/sitemap.xml")).text()).toContain(`${BASE}/guides/${SLUG}</loc>`);
    expect((await request.get("/categories/dpf")).status()).toBe(200);

    // Unpublish from the list (toggle) -> public page gone.
    await page.goto("/admin/guides?status=published");
    await page.getByRole("row", { name: /Emulator test/ }).getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Unpublished" })).toBeVisible();
    await expect(page).toHaveURL(/status=published/); // back on the same filtered view
    expect((await request.get(`/guides/${SLUG}`)).status()).toBe(404);

    // Delete via the confirmation dialog.
    await page.goto("/admin/guides");
    await page.getByRole("row", { name: /Emulator test/ }).getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await expect(page.getByRole("row", { name: /Emulator test/ })).toHaveCount(0);
  });

  test("video: add -> publish -> public page -> unpublish -> delete from the editor", async ({ page, request }) => {
    await page.goto("/admin/videos/new");
    await page.getByLabel(/^YouTube URL/).fill("https://www.youtube.com/watch?v=abcdefghijk");
    await page.getByLabel(/^Title/).fill("Emulator video");
    await page.getByLabel(/^Slug/).fill("emulator-video");
    await page.getByLabel(/^Published on YouTube/).fill("2025-11-02");
    await page.getByRole("button", { name: "Publish video" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Published" })).toBeVisible();
    await page.goto("/videos/emulator-video");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Emulator video");
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    expect(ld.find((x) => x["@type"] === "VideoObject").uploadDate).toBe("2025-11-02");

    await page.goto("/admin/videos");
    await page.getByRole("row", { name: /Emulator video/ }).getByRole("link", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Changes saved|Unpublished/ })).toBeVisible();
    expect((await request.get("/videos/emulator-video")).status()).toBe(404);

    await page.getByRole("row", { name: /Emulator video/ }).getByRole("link", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await expect(page).toHaveURL(/\/admin\/videos/);
    await expect(page.getByRole("row", { name: /Emulator video/ })).toHaveCount(0);
  });

  test("fault code: create -> publish -> public page -> unpublish -> delete", async ({ page, request }) => {
    await page.goto("/admin/fault-codes/new");
    await page.getByLabel(/^Code/).fill("P2002");
    await page.getByLabel(/^Title/).fill("Diesel Particulate Filter Efficiency Below Threshold");
    await page.getByLabel(/^Meaning/).fill("Emulator-only meaning text for the workflow test.");
    await page.getByLabel(/^System/).fill("Exhaust / emissions");
    await page.getByRole("button", { name: "Publish fault code" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Published" })).toBeVisible();
    await page.goto("/fault-codes/p2002");
    await expect(page.getByText("A fault code is a starting point for diagnosis")).toBeVisible();

    await page.goto("/admin/fault-codes");
    await page.getByRole("row", { name: /P2002/ }).getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Unpublished" })).toBeVisible();
    expect((await request.get("/fault-codes/p2002")).status()).toBe(404);
    await page.getByRole("row", { name: /P2002/ }).getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await expect(page.getByRole("row", { name: /P2002/ })).toHaveCount(0);
  });

  test("fault code formats: 6-digit and hex codes save with optional fields blank, input is normalised", async ({ page, request }) => {
    for (const [typed, stored] of [["P268172", "P268172"], [" p0a80 ", "P0A80"]] as const) {
      await page.goto("/admin/fault-codes/new");
      await page.getByLabel(/^Code/).fill(typed);
      await page.getByLabel(/^Title/).fill(`Format test ${stored}`);
      await page.getByLabel(/^Meaning/).fill("Emulator-only meaning text.");
      await page.getByRole("button", { name: "Publish fault code" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Published" })).toBeVisible();
      const saved = (await db.collection("faultCodes").where("code", "==", stored).get()).docs[0]?.data();
      expect(saved).toMatchObject({ code: stored, status: "published" });
      expect(saved?.symptoms).toBeUndefined(); // blank optional fields are simply left out
      expect(saved?.system).toBeUndefined();
      expect((await request.get(`/fault-codes/${stored.toLowerCase()}`)).status()).toBe(200);
      await removeDocs("faultCodes", "code", stored);
    }
  });

  test("video form: related fault codes accept 4- and 6-digit codes, comma-separated with optional spaces", async ({ page }) => {
    const SLUG = "related-codes-video";
    await page.goto("/admin/videos/new");
    await page.getByLabel(/^YouTube URL/).fill("https://www.youtube.com/watch?v=abcdefghijk");
    await page.getByLabel(/^Title/).fill("Related codes video");
    await page.getByLabel(/^Slug/).fill(SLUG);
    await page.getByLabel(/^Related fault codes/).fill("P0420, P268111,P268172");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Created as a draft" })).toBeVisible();
    const doc = (await db.collection("videos").where("slug", "==", SLUG).get()).docs[0];
    expect(doc?.data().relatedFaultCodes).toEqual(["P0420", "P268111", "P268172"]);

    // Edit: the saved codes round-trip, and a bad entry is reported on the field with the entry number.
    await page.goto(`/admin/videos/${doc!.id}`);
    const field = page.getByLabel(/^Related fault codes/);
    await expect(field).toHaveValue("P0420, P268111, P268172");
    await field.fill("P268111, P12");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expectFieldError(page, /^Related fault codes/, /^Entry 2: Use P, B, C or U followed by 4 characters/);
    await expect(field).toHaveValue("P268111, P12");
    expect((await doc!.ref.get()).data()?.relatedFaultCodes).toEqual(["P0420", "P268111", "P268172"]);
    await removeDocs("videos", "slug", SLUG);
  });

  test("category: create -> shows as 'not public yet' until it has content -> delete", async ({ page }) => {
    await page.goto("/admin/categories/new");
    await page.getByLabel(/^Name/).fill("Emulator topic");
    await page.getByLabel(/^Slug/).fill("emulator-topic");
    await page.getByRole("button", { name: "Publish category" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Published" })).toBeVisible();
    const row = page.getByRole("row", { name: /Emulator topic/ });
    await expect(row).toContainText("not public yet");
    await row.getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await expect(page.getByRole("row", { name: /Emulator topic/ })).toHaveCount(0);
  });

  test("duplicate slugs are rejected on the slug field (no data overwritten, nothing typed is lost)", async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      await page.goto("/admin/categories/new");
      await page.getByLabel(/^Name/).fill(`Dup ${i}`);
      await page.getByLabel(/^Slug/).fill("dup-slug");
      await page.getByRole("button", { name: "Save as draft" }).click();
    }
    await expectSummary(page);
    await expectFieldError(page, /^Slug/, /already uses the slug "dup-slug"/);
    await expect(page.getByLabel(/^Name/)).toHaveValue("Dup 1");
    await expect(page).toHaveURL(/\/admin\/categories\/new$/);
    await removeDocs("categories", "slug", "dup-slug");
  });
});

test.describe("form errors: shown on the field, entered data kept, reset only after a successful save", () => {
  test.beforeEach(async ({ context }) => staffSession(context));

  test("category: create", async ({ page }) => {
    await page.goto("/admin/categories/new");
    await serverValidationOnly(page);
    await page.getByLabel(/^Name/).fill("Form test category");
    await page.getByLabel(/^Slug/).fill("Not A Slug");
    await page.getByLabel("Type").selectOption("vehicle");
    await page.getByLabel("Description", { exact: true }).fill("Kept after an error.");
    await page.getByLabel("SEO title").fill("x".repeat(71));
    await page.getByRole("button", { name: "Save as draft" }).click();

    await expectSummary(page);
    await expectFieldError(page, /^Slug/, "This isn't in a valid format.");
    await expectFieldError(page, "SEO title", "Must be 70 characters or fewer.");
    await expect(page.getByLabel(/^Slug/)).toBeFocused();
    await expect(page.getByLabel(/^Name/)).toHaveValue("Form test category");
    await expect(page.getByLabel(/^Name/)).not.toHaveAttribute("aria-invalid");
    await expect(page.getByLabel("Type")).toHaveValue("vehicle");
    await expect(page.getByLabel("Description", { exact: true })).toHaveValue("Kept after an error.");

    await page.getByLabel(/^Slug/).fill("form-test-category");
    await page.getByLabel("SEO title").fill("Short title");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Created as a draft" })).toBeVisible();
    const saved = await db.collection("categories").where("slug", "==", "form-test-category").get();
    expect(saved.docs[0]?.data()).toMatchObject({ kind: "vehicle", description: "Kept after an error.", seoTitle: "Short title", status: "draft" });
    await removeDocs("categories", "slug", "form-test-category");
  });

  test("guide: create with several bad fields, then edit", async ({ page }) => {
    const SLUG = "form-test-guide";
    await page.goto("/admin/guides/new");
    await serverValidationOnly(page);
    await page.getByLabel(/^Title/).fill("Form test guide");
    await page.getByLabel(/^Slug/).fill(SLUG);
    await page.getByLabel(/^Summary/).fill("Summary kept after an error.");
    await page.getByLabel(/^Main content/).fill("Paragraph one.\n\nParagraph two.");
    await page.getByLabel("Make", { exact: true }).fill("Volkswagen");
    await page.getByLabel("Fuel type").selectOption("diesel");
    await page.getByLabel("DPF", { exact: true }).check();
    await page.getByLabel(/^YouTube video URL/).fill("https://example.com/not-a-video");
    await page.getByLabel(/^Featured image URL/).fill("http://insecure.example/photo.jpg");
    await page.getByLabel(/^FAQ/).fill("Q: A question without an answer");
    await page.getByRole("button", { name: "Publish guide" }).click();

    await expectSummary(page);
    await expect(page.getByRole("alert").filter({ hasText: "fix the 3 highlighted fields" })).toBeVisible();
    await expectFieldError(page, /^YouTube video URL/, "Couldn't find a valid YouTube video in that URL.");
    await expectFieldError(page, /^Featured image URL/, /must be an https:\/\/ URL/);
    await expectFieldError(page, /^FAQ/, /Each FAQ needs a "Q:" line then an "A:" line/);
    await expect(page.getByLabel(/^Title/)).toHaveValue("Form test guide");
    await expect(page.getByLabel(/^Main content/)).toHaveValue("Paragraph one.\n\nParagraph two.");
    await expect(page.getByLabel("Make", { exact: true })).toHaveValue("Volkswagen");
    await expect(page.getByLabel("Fuel type")).toHaveValue("diesel");
    await expect(page.getByLabel("DPF", { exact: true })).toBeChecked();
    await expect(page.getByLabel(/^FAQ/)).toHaveValue("Q: A question without an answer");

    await page.getByLabel(/^YouTube video URL/).fill("https://youtu.be/abcdefghijk");
    await page.getByLabel(/^Featured image URL/).fill("");
    await page.getByLabel(/^FAQ/).fill("Q: A question?\nA: An answer.");
    await page.getByRole("button", { name: "Publish guide" }).click(); // the clicked intent still reaches the action
    await expect(page.getByRole("status").filter({ hasText: "Published" })).toBeVisible();

    // Edit: a server-side error must not revert the other edits to the stored values.
    await page.getByRole("row", { name: /Form test guide/ }).getByRole("link", { name: /Form test guide/ }).click();
    await serverValidationOnly(page);
    await page.getByLabel(/^Title/).fill("Form test guide (edited)");
    await page.getByLabel("Year from").fill("1900");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expectFieldError(page, "Year from", "Must be 1950 or more.");
    await expect(page.getByLabel(/^Title/)).toHaveValue("Form test guide (edited)");
    await expect(page.getByLabel("DPF", { exact: true })).toBeChecked();
    const stored = await db.collection("guides").where("slug", "==", SLUG).get();
    expect(stored.docs[0]?.data().title).toBe("Form test guide"); // nothing half-saved
    await removeDocs("guides", "slug", SLUG);
  });

  test("video: create", async ({ page }) => {
    await page.goto("/admin/videos/new");
    await serverValidationOnly(page);
    await page.getByLabel(/^YouTube URL/).fill("definitely not a video");
    await page.getByLabel(/^Title/).fill("Form test video");
    await page.getByLabel(/^Slug/).fill("form-test-video");
    await page.getByLabel("Description").fill("Description kept after an error.");
    await page.getByLabel(/^Thumbnail override URL/).fill("http://insecure.example/thumb.jpg");
    await page.getByLabel(/^Duration from YouTube/).fill("8 minutes");
    await page.getByRole("button", { name: "Save as draft" }).click();

    await expectSummary(page);
    await expectFieldError(page, /^YouTube URL/, "Couldn't find a valid YouTube video in that URL.");
    await expectFieldError(page, /^Thumbnail override URL/, /Thumbnail must be an https:\/\/ URL/);
    await expectFieldError(page, /^Duration from YouTube/, "This isn't in a valid format.");
    await expect(page.getByLabel(/^YouTube URL/)).toHaveValue("definitely not a video");
    await expect(page.getByText("Not a recognised YouTube URL or ID yet.")).toBeVisible(); // preview matches the kept input
    await expect(page.getByLabel(/^Title/)).toHaveValue("Form test video");
    await expect(page.getByLabel("Description")).toHaveValue("Description kept after an error.");

    await page.getByLabel(/^YouTube URL/).fill("https://www.youtube.com/watch?v=abcdefghijk");
    await page.getByLabel(/^Thumbnail override URL/).fill("");
    await page.getByLabel(/^Duration from YouTube/).fill("PT8M12S");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Created as a draft" })).toBeVisible();
    await removeDocs("videos", "slug", "form-test-video");
  });

  test("fault code: create", async ({ page }) => {
    await page.goto("/admin/fault-codes/new");
    await serverValidationOnly(page);
    await page.getByLabel(/^Code/).fill("Q1234");
    await page.getByLabel(/^Title/).fill("Form test fault code");
    await page.getByLabel(/^Meaning/).fill("Meaning kept after an error.");
    await page.getByLabel(/^Symptoms/).fill(`Short symptom\n${"x".repeat(201)}`);
    await page.getByLabel(/^System/).fill("Exhaust / emissions");
    await page.getByRole("button", { name: "Save as draft" }).click();

    await expectSummary(page);
    await expectFieldError(page, /^Code/, /^Use P, B, C or U followed by 4 characters/);
    await expectFieldError(page, /^Symptoms/, "Entry 2: Must be 200 characters or fewer.");
    await expect(page.getByLabel(/^Meaning/)).toHaveValue("Meaning kept after an error.");
    await expect(page.getByLabel(/^System/)).toHaveValue("Exhaust / emissions");

    await page.getByLabel(/^Code/).fill("P0299");
    await page.getByLabel(/^Symptoms/).fill("Short symptom");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Created as a draft" })).toBeVisible();
    await removeDocs("faultCodes", "code", "P0299");
  });

  test("settings: errors on the exact inputs, then saved values stay in the form", async ({ page }) => {
    const ref = db.collection("settings").doc("default");
    const before = await ref.get();
    try {
      await page.goto("/admin/settings");
      await serverValidationOnly(page);
      await page.getByLabel("Business name").fill("Form test business");
      await page.getByLabel("Address line 1").fill("1 Test Street");
      await page.getByLabel("Postcode").fill("");
      await page.getByLabel("City").fill("");
      await page.getByLabel("Facebook").fill("http://facebook.com/form-test");
      await page.getByLabel("Monday opens").fill("09:00");
      await page.getByRole("button", { name: "Save settings" }).click();

      await expectSummary(page);
      await expectFieldError(page, "City", "Required when an address is entered.");
      await expectFieldError(page, "Postcode", "Required when an address is entered.");
      await expectFieldError(page, "Facebook", "Must be an https:// link.");
      await expect(page.getByLabel("Business name")).toHaveValue("Form test business");
      await expect(page.getByLabel("Address line 1")).toHaveValue("1 Test Street");
      await expect(page.getByLabel("Monday opens")).toHaveValue("09:00");

      await page.getByLabel("City").fill("Testford");
      await page.getByLabel("Postcode").fill("TE1 1ST");
      await page.getByLabel("Facebook").fill("https://facebook.com/form-test");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();
      await expect(page.getByLabel("Business name")).toHaveValue("Form test business"); // not reset to old values
      await expect(page.getByLabel("City")).not.toHaveAttribute("aria-invalid");
      expect((await ref.get()).data()?.address).toMatchObject({ line1: "1 Test Street", city: "Testford", postcode: "TE1 1ST" });
    } finally {
      if (before.exists) await ref.set(before.data()!);
      else await ref.delete();
    }
  });

  test("gallery upload: missing file and a failed upload keep the details", async ({ page }) => {
    await page.goto("/admin/gallery");
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Upload" }) });
    await serverValidationOnly(page);
    await form.getByLabel("Caption").fill("Caption kept after an error");
    await form.getByLabel("Order").fill("3");
    await form.getByRole("button", { name: "Upload" }).click();
    await expectSummary(page);
    await expect(form.getByLabel(/^Image/)).toHaveAttribute("aria-invalid", "true");
    await expect(form.getByLabel(/^Image/)).toHaveAccessibleDescription("Choose an image to upload.");
    await expect(form.getByLabel("Caption")).toHaveValue("Caption kept after an error");
    await expect(form.getByLabel("Order")).toHaveValue("3");

    // This suite has no Storage emulator, so a real upload fails server-side: the details must survive that too.
    await form.getByLabel(/^Image/).setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("not really a png") });
    await form.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Could not upload|isn't a supported|image/i })).toBeVisible();
    await expect(form.getByLabel("Caption")).toHaveValue("Caption kept after an error");
  });

  test("booking note: a failed save keeps the note; a successful save clears it", async ({ page }) => {
    const ref = db.collection("bookings").doc("form-test-booking");
    await ref.set({
      businessId: "default",
      reference: "FT-0001",
      status: "new",
      serviceSnapshot: { name: "Diagnostics", categoryName: "Diagnostics" },
      customer: { name: "Form Test", phone: "07700900000", email: "form-test@example.com" },
      vehicle: { make: "Volkswagen", model: "Golf", vrm: "AB12CDE" },
      symptoms: "Emulator-only booking.",
      preferred: { date: "2030-01-01", timeWindow: "morning" },
      photos: [],
      notes: [],
      createdAt: Timestamp.now(),
    });
    try {
      await page.goto("/admin/bookings/form-test-booking");
      await serverValidationOnly(page);
      const note = page.getByLabel(/^Internal note/);
      await note.fill("   ");
      await page.getByRole("button", { name: "Add note" }).click();
      await expectFieldError(page, /^Internal note/, "Write a note before saving.");
      await expect(note).toHaveValue("   ");

      await note.fill("Called the customer back.");
      await page.getByRole("button", { name: "Add note" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Note added." })).toBeVisible();
      await expect(note).toHaveValue(""); // reset only after the successful save
      await expect(page.getByText("Called the customer back.")).toBeVisible();
    } finally {
      await ref.delete();
    }
  });

  test("service (dormant feature): create", async ({ page }) => {
    await db.collection("serviceCategories").doc("form-test-cat").set({ businessId: "default", name: "Form test category", slug: "form-test-cat", order: 0, status: "published" });
    try {
      await page.goto("/admin/services/new");
      await serverValidationOnly(page);
      await page.getByLabel("Name").fill("Form test service");
      await page.getByLabel("Slug").fill("form-test-service");
      await page.getByLabel("Category").selectOption({ label: "Form test category" });
      await page.getByLabel(/^Summary/).fill("Summary kept after an error.");
      await page.getByLabel("Image URL").fill("http://insecure.example/service.jpg");
      await page.getByLabel("SEO title").fill("x".repeat(71));
      await page.getByRole("button", { name: "Create service" }).click();

      await expectFieldError(page, "Image URL", /Image must be an https:\/\/ URL/);
      await expectFieldError(page, "SEO title", "Must be 70 characters or fewer.");
      await expect(page.getByLabel("Name")).toHaveValue("Form test service");
      await expect(page.getByLabel("Category")).toHaveValue("form-test-cat");
      await expect(page.getByLabel(/^Summary/)).toHaveValue("Summary kept after an error.");

      await page.getByLabel("Image URL").fill("");
      await page.getByLabel("SEO title").fill("");
      await page.getByRole("button", { name: "Create service" }).click();
      await expect(page).toHaveURL(/\/admin\/services$/);
    } finally {
      await removeDocs("services", "slug", "form-test-service");
      await db.collection("serviceCategories").doc("form-test-cat").delete();
    }
  });

  test("review (dormant feature): create", async ({ page }) => {
    await page.goto("/admin/reviews/new");
    await serverValidationOnly(page);
    await page.getByLabel("Customer name").fill("");
    await page.getByLabel("Review text").fill("Review text kept after an error.");
    await page.getByLabel("Date").fill("2026-01-15");
    await page.getByRole("button", { name: "Add review" }).click();
    await expectFieldError(page, "Customer name", "This field is required.");
    await expect(page.getByLabel("Review text")).toHaveValue("Review text kept after an error.");
    await expect(page.getByLabel("Date")).toHaveValue("2026-01-15");

    await page.getByLabel("Customer name").fill("Form Test");
    await page.getByRole("button", { name: "Add review" }).click();
    await expect(page).toHaveURL(/\/admin\/reviews$/);
    await removeDocs("reviews", "name", "Form Test");
  });
});

test.describe("visual QA", () => {
  test("admin screens at desktop and phone widths (screenshots + no horizontal overflow)", async ({ page, context }) => {
    await staffSession(context);
    await db.collection("guides").doc("visual-qa").set({
      businessId: "default", slug: "visual-qa-guide", title: "Volkswagen 2.0 TDI: DPF warning light explained",
      excerpt: "Visual QA row.", content: "Body.", vehicleMake: "Volkswagen", vehicleModel: "Golf", problemCategory: "DPF",
      categorySlugs: ["dpf"], status: "draft", updatedAt: new Date().toISOString(),
    });
    for (const [name, size] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]] as const) {
      await page.setViewportSize(size);
      for (const [shot, path] of [["dashboard", "/admin"], ["guides", "/admin/guides"], ["editor", "/admin/guides/visual-qa"], ["seo", "/admin/seo"]] as const) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} @${name} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `test-results/admin-${shot}-${name}.png`, fullPage: shot !== "editor" });
      }
    }
    await page.goto("/admin/login");
    await db.collection("guides").doc("visual-qa").delete();
  });
});
