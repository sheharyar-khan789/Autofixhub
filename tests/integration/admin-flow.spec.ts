import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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

  test("duplicate slugs are rejected with a clear message (no data overwritten)", async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      await page.goto("/admin/categories/new");
      await page.getByLabel(/^Name/).fill(`Dup ${i}`);
      await page.getByLabel(/^Slug/).fill("dup-slug");
      await page.getByRole("button", { name: "Save as draft" }).click();
    }
    await expect(page.getByRole("alert").filter({ hasText: /already uses the slug/ })).toBeVisible();
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
