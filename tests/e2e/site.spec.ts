import { expect, test, type Page } from "@playwright/test";

// 1x1 PNG: real, decodable image for the upload path.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function nextWeekdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 3);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Collects console errors and failed requests so every test can assert a clean page. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/_next/webpack-hmr")) problems.push(`http ${r.status()}: ${r.url()}`);
  });
  return problems;
}

const isMobile = (name: string) => name === "mobile";

/** Dormant workshop features (booking + services). Off by default, like production. */
const WORKSHOP = process.env.WORKSHOP_FEATURES_ENABLED === "true";
const GUIDE = "/guides/fixture-diesel-dpf-warning-light";

test.describe("homepage", () => {
  test("renders all required sections in order with no console/network errors", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Automotive knowledge without the guesswork/i);
    // Chapter order of the cinematic homepage (search, guides, diagnostics, vehicles, video, about, closing CTA).
    const order = ["Find the answer to your car problem", "Latest repair guides", "Warning lights and fault codes", "Browse by vehicle", "(Latest videos|Repair videos on YouTube)", "^About ", "Watch the repairs on YouTube", "Get in touch"];
    let last = -1;
    for (const name of order) {
      const box = await page.getByRole("heading", { name: new RegExp(name, "i") }).first().boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.y, `${name} should come after the previous section`).toBeGreaterThan(last - 1);
      last = box!.y + (await page.evaluate(() => window.scrollY));
    }
    await expect(page.getByRole("contentinfo")).toBeVisible();
    // Knowledge platform, not a booking site: no booking CTA anywhere on the page.
    await expect(page.getByRole("link", { name: /book (a|this) service|book service|book a diagnostic/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Explore guides" })).toHaveAttribute("href", "/guides");
    await page.screenshot({ path: `test-results/home-full-${test.info().project.name}.png`, fullPage: true });
    expect(problems).toEqual([]);
  });

  test("no horizontal overflow on any public page", async ({ page }) => {
    for (const path of ["/", GUIDE, "/categories", "/categories/dpf", "/videos/fixture-dpf-video", "/about", "/contact", "/privacy"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("scroll animation", () => {
  test.beforeEach(async ({ page }) => {
    // Count canvas paints so we can prove "only redraw when the frame changes".
    await page.addInitScript(() => {
      (window as unknown as { __draws: number }).__draws = 0;
      const proto = CanvasRenderingContext2D.prototype as unknown as { drawImage: (...a: unknown[]) => void };
      const orig = proto.drawImage;
      proto.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        (window as unknown as { __draws: number }).__draws++;
        return orig.apply(this, args);
      };
    });
  });

  const state = (page: Page) =>
    page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-testid="hero-canvas"]')!;
      const ctx = c.getContext("2d")!;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4 * 97) sum = (sum * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1_000_000_007;
      return {
        index: Number(c.dataset.frameIndex),
        count: Number(c.dataset.frameCount),
        mode: c.dataset.mode,
        hash: sum,
        draws: (window as unknown as { __draws: number }).__draws,
        w: c.width,
        h: c.height,
      };
    });
  const scrollToProgress = (page: Page, p: number) =>
    page.evaluate((p) => {
      const s = document.querySelector<HTMLElement>('[data-testid="hero-scroll"]')!;
      const top = s.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + p * (s.offsetHeight - window.innerHeight));
    }, p);

  test("loads, draws frame 1, scrubs with scroll, and hides the loader when done", async ({ page }, info) => {
    const frameResponses: number[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/animation/corolla/frame-")) frameResponses.push(r.status());
    });
    await page.goto("/");
    await expect(page.getByTestId("hero-canvas")).toBeVisible();
    // First frame can take >5s on a cold dev server under parallel workers.
    await expect.poll(async () => (await state(page)).index, { message: "first frame drawn", timeout: 20_000 }).toBe(0);

    const s0 = await state(page);
    expect(s0.count).toBe(isMobile(info.project.name) ? 98 : 194);
    expect(s0.mode).toBe(isMobile(info.project.name) ? "mobile" : "full");
    expect(s0.w).toBeGreaterThan(100);

    // Everything preloads and the loader disappears.
    await expect(page.getByTestId("hero-loader")).toHaveCount(0);
    await expect.poll(() => frameResponses.length, { timeout: 60_000 }).toBe(s0.count);
    expect(frameResponses.every((s) => s === 200)).toBe(true);
    await page.screenshot({ path: `test-results/hero-start-${info.project.name}.png` });

    // Timeline (src/lib/hero/player.ts HERO_TIMELINE): explode 0-60%, hold 60-80%, recompose 80-100%.
    // 30% scroll = half exploded; pixels differ from frame 0; no labels yet.
    await scrollToProgress(page, 0.3);
    await expect.poll(async () => (await state(page)).index).toBeGreaterThan(s0.count * 0.4);
    const mid = await state(page);
    expect(mid.index).toBeLessThan(s0.count * 0.6);
    expect(mid.hash).not.toBe(s0.hash);
    await expect(page.getByTestId("hero-labels")).toHaveAttribute("data-visible", "false");
    await page.screenshot({ path: `test-results/hero-mid-${info.project.name}.png` });

    // Hold: fully exploded final frame with part labels.
    await scrollToProgress(page, 0.7);
    await expect.poll(async () => (await state(page)).index).toBe(s0.count - 1);
    const held = await state(page);
    expect(held.hash).not.toBe(mid.hash);
    await expect(page.getByTestId("hero-labels")).toHaveAttribute("data-visible", "true");
    await page.screenshot({ path: `test-results/hero-exploded-${info.project.name}.png` });

    // End of the section: recomposed back to the complete car, labels gone.
    await scrollToProgress(page, 1);
    await expect.poll(async () => (await state(page)).index).toBe(0);
    await expect(page.getByTestId("hero-labels")).toHaveAttribute("data-visible", "false");

    // Back to top: returns to frame 0 pixel-for-pixel.
    await scrollToProgress(page, 0);
    await expect.poll(async () => (await state(page)).index).toBe(0);
    expect((await state(page)).hash).toBe(s0.hash);
  });

  test("does not repaint when nothing changes (no idle render loop)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-loader")).toHaveCount(0);
    await expect.poll(async () => (await state(page)).index).toBe(0);
    await expect(page.getByText(/Loading frames/)).toHaveCount(0, { timeout: 60_000 }); // all frames arrived
    await page.waitForTimeout(500); // final repaint after the last frame
    const a = (await state(page)).draws;
    await page.waitForTimeout(1200);
    const b = (await state(page)).draws;
    expect(b, "idle page must not keep drawing").toBe(a);
    // Small scroll that stays on the same frame index range still results in bounded draws.
    await scrollToProgress(page, 0.25);
    const target = Math.round((0.25 / 0.6) * ((await state(page)).count - 1)); // explode phase = first 60%
    await expect.poll(async () => (await state(page)).index, { message: "eases to the target frame" }).toBe(target);
    const c = (await state(page)).draws;
    expect(c).toBeGreaterThan(b);
    // Frame repaints while travelling are bounded by frames traversed, not by elapsed time.
    expect(c - b).toBeLessThanOrEqual(target + 2);
    await page.waitForTimeout(800);
    expect((await state(page)).draws, "loop stops once the frame settles").toBe(c);
  });

  test("resizes without distorting or blanking the canvas", async ({ page }) => {
    await page.goto("/");
    await expect.poll(async () => (await state(page)).index).toBe(0);
    const before = await state(page);
    const vp = page.viewportSize()!;
    await page.setViewportSize({ width: Math.max(360, vp.width - 120), height: vp.height });
    await expect.poll(async () => (await state(page)).w).not.toBe(before.w);
    const after = await state(page);
    expect(after.hash).not.toBe(0);
    expect(after.index).toBe(0);
  });

  test("exploded view: labels are aligned, balanced and never overlap or overflow", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-loader")).toHaveCount(0);
    await expect(page.getByText(/Loading frames/)).toHaveCount(0, { timeout: 60_000 });
    await scrollToProgress(page, 0.7);
    await expect.poll(async () => (await state(page)).index).toBe((await state(page)).count - 1); // exploded frame drawn
    await expect(page.getByTestId("hero-labels")).toHaveAttribute("data-visible", "true");
    const mode = await page.getByTestId("hero-labels").getAttribute("data-mode");
    if (info.project.name === "desktop") expect(mode).toBe("side");
    if (info.project.name === "mobile") expect(mode).toBe("compact");
    const boxes = await page.getByTestId("hero-labels").locator(mode === "side" ? ":scope > span" : "li").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { l: r.left, r: r.right, t: r.top, b: r.bottom, text: e.textContent };
      }),
    );
    expect(boxes).toHaveLength(6);
    const vw = page.viewportSize()!.width;
    for (const b of boxes) {
      expect(b.l, `${b.text} inside viewport`).toBeGreaterThanOrEqual(0);
      expect(b.r, `${b.text} inside viewport`).toBeLessThanOrEqual(vw);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const overlap = a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
        expect(overlap, `${a.text} overlaps ${c.text}`).toBe(false);
      }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/hero-labels-${info.project.name}.png` });
  });

  test("reduced motion: one static frame, no scroll-pinned height", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByTestId("hero-canvas")).toBeVisible();
    await expect.poll(async () => (await state(page)).index).toBe(0);
    const s = await state(page);
    expect(s.mode).toBe("static");
    expect(s.count).toBe(1);
    const heights = await page.evaluate(() => ({
      section: document.querySelector<HTMLElement>('[data-testid="hero-scroll"]')!.offsetHeight,
      vh: window.innerHeight,
    }));
    expect(heights.section).toBeLessThan(heights.vh * 2);
    let frameRequests = 0;
    page.on("request", (r) => r.url().includes("/animation/corolla/frame-") && frameRequests++);
    await scrollToProgress(page, 1);
    await page.waitForTimeout(500);
    expect((await state(page)).index).toBe(0);
    expect(frameRequests).toBe(0);
  });

  test("shows a clear error state when frames cannot be loaded", async ({ page }) => {
    await page.route("**/animation/corolla/frame-*.jpg", (r) => r.abort());
    await page.goto("/");
    await expect(page.getByTestId("hero-loader")).toContainText(/could not be loaded/i);
    await expect(page.getByRole("link", { name: "Explore guides" }).first()).toBeVisible(); // page still usable
  });
});

test.describe("services (dormant workshop feature)", () => {
  test.skip(!WORKSHOP, "WORKSHOP_FEATURES_ENABLED is off: /services redirects (covered below)");
  test("lists the confirmed categories from the data store and links to detail pages", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/services");
    await expect(page.locator("main section[id][aria-labelledby] h2")).toHaveCount(6);
    for (const n of ["Volkswagen Group Diesel", "Toyota Hybrid", "Gearbox & Clutch", "DPF, Turbo & Injectors", "Wiring & Electrical Diagnostics"])
      await expect(page.getByRole("heading", { level: 2, name: n, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "MOT", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: /Clutch problems/ }).first().click();
    await expect(page).toHaveURL(/\/services\/clutch-repair$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Clutch problems");
    await expect(page.getByText("Quote on request")).toBeVisible();
    await page.getByRole("link", { name: /Book this service/ }).click();
    await expect(page).toHaveURL(/\/book\?service=clutch-repair/);
    await expect(page.getByLabel("Service")).toHaveValue("clutch-repair"); // preselected
    expect(problems).toEqual([]);
  });

  test("unknown service returns a 404 page", async ({ page }) => {
    const res = await page.goto("/services/does-not-exist");
    expect(res?.status()).toBe(404);
  });

});

test.describe("booking (dormant workshop feature)", () => {
  test.skip(!WORKSHOP, "WORKSHOP_FEATURES_ENABLED is off: /book redirects and the API returns 404 (covered below)");
  // Each test posts from its own client IP so the per-IP rate limiter (5/hour) isn't shared between tests.
  test.beforeEach(async ({ page }) => {
    const n = Math.floor(Math.random() * 250) + 1;
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${n}` });
  });

  const fill = async (page: Page) => {
    await page.getByLabel("Full name").fill("Alex Driver");
    await page.getByLabel("Phone").fill("07700 900123");
    await page.getByLabel("Email").fill("alex@example.com");
    await page.getByLabel("Registration").fill("ab21 cde");
    await page.getByLabel("Make").fill("Toyota");
    await page.getByLabel("Model").fill("Corolla");
    await page.getByLabel("Service").selectOption({ label: "Electrical diagnostics" });
    await page.getByLabel("Preferred date").fill(nextWeekdayIso());
    await page.getByLabel("Preferred time").selectOption("morning");
    await page.getByLabel("Describe the problem").fill("Engine light is on and the car hesitates when pulling away.");
    await page.getByLabel(/I have read the/).check();
  };

  test("shows field errors and moves focus to the first invalid field", async ({ page }) => {
    await page.goto("/book");
    await page.getByTestId("booking-submit").click();
    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText("Choose a service.")).toBeVisible();
    await expect(page.getByText("Confirm you have read the privacy notice.")).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeFocused();
    await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
  });

  test("submits with a photo, shows loading then a success reference", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/book");
    await fill(page);
    await page.getByTestId("photo-input").setInputFiles({ name: "fault.png", mimeType: "image/png", buffer: PNG_1PX });
    await expect(page.getByAltText(/Attached photo/)).toBeVisible();

    // Slow the API a little so the loading state is observable.
    let request: import("@playwright/test").Request | undefined;
    await page.route("**/api/bookings", async (route) => {
      request = route.request();
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });
    await page.getByTestId("booking-submit").click();
    await expect(page.getByTestId("booking-submit")).toBeDisabled();
    await expect(page.getByTestId("booking-submit")).toHaveText(/Sending request/);
    await expect(page.getByTestId("booking-success")).toBeVisible();
    await expect(page.getByTestId("booking-reference")).toHaveText(/^BK-[A-HJ-NP-Z2-9]{8}$/);
    const body = request!.postDataBuffer()!.toString("latin1");
    expect(body).toContain('name="photos"');
    expect(body).toContain("\xff\xd8\xff"); // re-encoded to JPEG in the browser
    expect(body).not.toContain("PNG");
    expect(problems.filter((p) => !p.includes("http 201"))).toEqual([]);
    await page.screenshot({ path: `test-results/booking-success-${test.info().project.name}.png` });
  });

  test("server validation errors are shown against the right fields", async ({ page }) => {
    await page.goto("/book");
    await fill(page);
    // A Saturday is closed in the fixture hours: only the server knows the opening hours.
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 2);
    while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
    await page.getByLabel("Preferred date").fill(d.toISOString().slice(0, 10));
    await page.getByTestId("booking-submit").click();
    await expect(page.getByText(/closed that day/i)).toBeVisible();
    await expect(page.getByTestId("booking-error")).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Alex Driver"); // input preserved
  });

  test("shows an error state and keeps input on server failure or network loss", async ({ page }) => {
    await page.goto("/book");
    await fill(page);
    await page.route("**/api/bookings", (r) =>
      r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, message: "Something went wrong. Please try again." }) }),
    );
    await page.getByTestId("booking-submit").click();
    await expect(page.getByTestId("booking-error")).toContainText("Something went wrong");
    await expect(page.getByTestId("booking-submit")).toBeEnabled();
    await expect(page.getByLabel("Email")).toHaveValue("alex@example.com");

    await page.unroute("**/api/bookings");
    await page.route("**/api/bookings", (r) => r.abort("connectionfailed"));
    await page.getByTestId("booking-submit").click();
    await expect(page.getByTestId("booking-error")).toContainText(/Could not reach the server/);
  });

  test("rejects a non-image photo in the browser", async ({ page }) => {
    await page.goto("/book");
    await page.getByTestId("photo-input").setInputFiles({ name: "x.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
    await expect(page.getByRole("alert").filter({ hasText: /could not be read/i })).toBeVisible();
  });
});

test.describe("contact and settings", () => {
  test("contact page shows phone, email, WhatsApp, address, hours and a maps link from settings", async ({ page }) => {
    await page.goto("/contact");
    const main = page.locator("#main");
    await expect(main.getByRole("link", { name: "01632 960123" })).toHaveAttribute("href", "tel:01632960123");
    await expect(main.getByRole("link", { name: "hello@example.com" })).toHaveAttribute("href", "mailto:hello@example.com");
    await expect(main.getByRole("link", { name: /Message on WhatsApp/ })).toHaveAttribute("href", "https://wa.me/447700900123");
    await expect(main.locator("address")).toHaveText("1 Fixture Road, Testville, AB1 2CD");
    await expect(main.getByRole("link", { name: /Open in Google Maps/ })).toHaveAttribute("href", /google\.com\/maps\/search\/\?api=1&query=1%20Fixture/);
    await expect(page.getByRole("row", { name: /Monday 09:00 – 17:00/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Saturday Closed/ })).toBeVisible();
  });

  test("about page states confirmed experience only, with OnTrack as neutral work-experience context", async ({ page }) => {
    await page.goto("/about");
    for (const h of ["Experience", "Vehicles covered", "Technical areas", "Guides and videos"])
      await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
    await expect(page.locator("#experience")).toContainText("5 years of hands-on experience");
    await expect(page.locator("#experience")).toContainText("is a separate project and is not OnTrack");
    await expect(page.locator("#vehicles")).toContainText("Toyota Corolla Hybrid");
    expect(await page.locator("[data-placeholder]").count()).toBe(0);
    await expect(page.locator("main")).not.toContainText(/certified|master technician|official (volkswagen|toyota)/i);
    await expect(page.locator("main")).not.toContainText(/\bMOT\b/);
  });

  test("SEO endpoints exist and protect admin/api", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/admin/);
    expect(robots).toMatch(/Disallow: \/api/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const url of [GUIDE, "/guides/fixture-hybrid-warning-message", "/fault-codes/p0401", "/videos/fixture-dpf-video", "/categories/dpf", "/categories"])
      expect(sitemap, url).toContain(`${url}</loc>`);
    // Never: admin, search, drafts, empty categories, or the dormant workshop routes.
    for (const url of ["/admin", "/search", "fixture-draft-guide", "/categories/turbo<", "/services", "/book"])
      expect(sitemap, url).not.toContain(url);
  });
});

test.describe("mobile action bar and navigation", () => {
  test("mobile dock shows Guides, Search, YouTube; hidden on desktop", async ({ page }, info) => {
    await page.goto("/");
    const dock = page.getByRole("navigation", { name: "Quick links" });
    if (info.project.name === "desktop") {
      await expect(dock).toBeHidden();
      return;
    }
    await expect(dock).toBeVisible();
    const items = await dock.getByRole("link").allTextContents();
    expect(items.map((t) => t.replace(/\(opens in a new tab\)/, "").trim())).toEqual(["Guides", "Search", "YouTube"]);
    await expect(dock.getByRole("link", { name: "Guides" })).toHaveAttribute("href", "/guides");
    const box = await dock.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box!.y + box!.height).toBeCloseTo(vh, 0); // pinned to the bottom edge
    expect(box!.height).toBeGreaterThanOrEqual(56); // comfortable tap targets
    await page.screenshot({ path: `test-results/mobile-dock-${info.project.name}.png` });
  });

  test("hamburger menu opens and navigates on narrow screens", async ({ page }, info) => {
    test.skip(info.project.name === "desktop", "desktop shows the inline nav");
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Mobile" });
    expect((await menu.getByRole("link").allTextContents()).map((t) => t.trim())).toEqual(
      ["Home", "Guides", "Fault Codes", "Videos", "Categories", "About", "Contact"],
    );
    await menu.getByRole("link", { name: "Categories" }).click();
    await expect(page).toHaveURL(/\/categories$/);
  });
});

test.describe("admin foundation", () => {
  test("/admin redirects to login without a session and login explains missing Firebase config", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("alert").filter({ hasText: /Firebase is not configured/ })).toBeVisible();
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toMatch(/noindex/);
  });

  test("a forged session cookie does not grant access; session route needs a same-site origin", async ({ page, request, context, baseURL }) => {
    await context.addCookies([{ name: "admin_session", value: "forged", url: baseURL! }]);
    await page.goto("/admin");
    // Proxy passes (cookie present), server verification rejects, and the login page explains why.
    await expect(page).toHaveURL(/\/admin\/login\?reason=expired$/);
    const noOrigin = await request.post("/api/auth/session", { data: { idToken: "x".repeat(30) } });
    expect(noOrigin.status()).toBe(403);
  });
});

test.describe("knowledge base (guides, fault codes, videos, search)", () => {
  test("fault codes: list, search, detail with generic-code qualification, JSON-LD and 404", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/fault-codes");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Fault code database/i);
    await expect(page.getByRole("link", { name: /P0420/ })).toBeVisible();

    await page.getByLabel("Search fault codes").fill("P0300");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/fault-codes\?q=P0300/);
    await expect(page.getByText(/1 result for/)).toBeVisible();

    await page.goto("/fault-codes?q=zzzz-nothing");
    await expect(page.getByText("No fault codes matched your search")).toBeVisible();

    await page.goto("/fault-codes/p0420");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Generic codes must never read as a confirmed, vehicle-specific diagnosis.
    await expect(page.getByText("Generic OBD-II code", { exact: true })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/fault-codes\/p0420$/);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = ld.map((t) => JSON.parse(t)["@type"]);
    expect(types).toEqual(expect.arrayContaining(["TechArticle", "BreadcrumbList"]));
    expect(ld.join(" ")).not.toMatch(/aggregateRating|"Review"/);
    expect(problems).toEqual([]);

    const missing = await page.goto("/fault-codes/p9999");
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  });

  test("guides and videos list published items only; unknown and draft slugs 404", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/guides");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Repair guides/i);
    await expect(page.getByRole("link", { name: /Fixture guide: diesel DPF warning light/ })).toBeVisible();
    await expect(page.getByText("Fixture DRAFT guide")).toHaveCount(0);
    await page.goto("/videos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(problems).toEqual([]);
    expect((await page.goto("/guides/not-a-real-guide"))?.status()).toBe(404);
    expect((await page.goto("/videos/not-a-real-video"))?.status()).toBe(404);
    expect((await page.goto("/guides/fixture-draft-guide"))?.status(), "draft guide must not be public").toBe(404);
  });

  test("site search finds fault codes and handles no-match queries", async ({ page }) => {
    await page.goto("/search?q=P0401");
    await expect(page.getByRole("link", { name: /P0401/ }).first()).toBeVisible();
    await page.goto("/search?q=qqqqzzzz");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("no horizontal overflow on knowledge-base pages", async ({ page }) => {
    for (const path of ["/guides", "/fault-codes", "/fault-codes/p0420", "/videos", "/search?q=misfire"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("responsive widths", () => {
  test("no horizontal overflow or console errors at 375–1920px", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "sets its own viewport sizes");
    const problems = watch(page);
    const paths = ["/", "/services", "/book", "/guides", "/fault-codes", "/fault-codes/p0420", "/videos", "/contact", "/admin/login"];
    for (const width of [375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of paths) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    }
    // Navigating away mid-stream cancels hero frame downloads (ERR_ABORTED); that's expected, not a failure.
    expect(problems.filter((p) => !p.includes("net::ERR_ABORTED"))).toEqual([]);
  });
});

test.describe("AutoFixHub launch content", () => {
  const CHANNEL = "https://www.youtube.com/@muhammadibrahim-vw";

  test("no MOT claim in public copy, metadata or structured data", async ({ page }) => {
    for (const path of ["/", "/categories", "/about", "/contact", "/videos", GUIDE]) {
      await page.goto(path);
      const html = await page.content();
      expect(html, path).not.toMatch(/\bMOT\b/);
    }
  });

  test("YouTube channel is linked from home, footer, videos and detail pages, opening safely", async ({ page }) => {
    for (const path of ["/", "/videos", GUIDE, "/fault-codes/p0420", "/contact"]) {
      await page.goto(path);
      const links = page.locator(`a[href="${CHANNEL}"]`);
      expect(await links.count(), path).toBeGreaterThan(0);
      for (const rel of await links.evaluateAll((els) => els.map((e) => `${e.getAttribute("target")}|${e.getAttribute("rel")}`)))
        expect(rel, path).toMatch(/^_blank\|.*noopener/);
    }
  });
});

test.describe("knowledge platform", () => {
  test("old workshop routes redirect and the booking API is off", async ({ page, request }) => {
    test.skip(WORKSHOP, "only while WORKSHOP_FEATURES_ENABLED is off");
    await page.goto("/book");
    await expect(page).toHaveURL(/\/contact$/);
    await page.goto("/services");
    await expect(page).toHaveURL(/\/categories$/);
    await page.goto("/services/clutch-repair");
    await expect(page).toHaveURL(/\/categories$/);
    const res = await request.post("/api/bookings", { headers: { origin: "http://localhost:3100" }, multipart: { name: "x" } });
    expect(res.status()).toBe(404);
  });

  test("guide page: vehicle info, sections, fault codes, video, FAQ, breadcrumbs and structured data", async ({ page }) => {
    const problems = watch(page);
    await page.goto(GUIDE);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture guide: diesel DPF warning light");
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    expect((await crumbs.textContent())?.replace(/\s+/g, " ")).toMatch(/Home \/ Guides \/ Volkswagen Group \/ Fixture guide/);
    await expect(page.getByRole("definition").filter({ hasText: "2.0 TDI (fixture)" })).toBeVisible();
    for (const h of ["Symptoms", "Possible causes", "Diagnosis", "Fault codes", "Video", "Frequently asked questions"])
      await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
    await expect(page.getByText("Important notes")).toBeVisible();
    await expect(page.getByRole("link", { name: /P0401/ }).first()).toHaveAttribute("href", "/fault-codes/p0401");
    // Video: click-to-load facade (no autoplay on page load), plus a Watch on YouTube link.
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Play video/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Watch on YouTube/ })).toHaveAttribute("href", "https://www.youtube.com/watch?v=fixtureVid1");
    // Related content: the hybrid guide is explicitly linked; the DPF video is linked back to this guide.
    const aside = page.locator("aside");
    await expect(aside.getByRole("link", { name: "Fixture guide: hybrid warning message" })).toBeVisible();
    await expect(aside.getByRole("link", { name: "Fixture video: DPF diagnosis" })).toBeVisible();
    await expect(aside.getByRole("link", { name: "DPF", exact: true })).toHaveAttribute("href", "/categories/dpf");
    // Metadata + JSON-LD
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${GUIDE}$`));
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Article", "BreadcrumbList", "FAQPage"]));
    expect(problems).toEqual([]);
  });

  test("category pages list content; empty and draft-only categories are 404", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("link", { name: /Volkswagen Group/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Turbo/ })).toHaveCount(0);
    await page.goto("/categories/dpf");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("DPF");
    await expect(page.getByRole("link", { name: /Fixture guide: diesel DPF/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fixture video: DPF diagnosis/ })).toBeVisible();
    expect((await page.goto("/categories/turbo"))?.status(), "draft-only category").toBe(404);
    expect((await page.goto("/categories/no-such-category"))?.status()).toBe(404);
  });

  test("video page links to its written guide and never invents an upload date", async ({ page }) => {
    await page.goto("/videos/fixture-dpf-video");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture video: DPF diagnosis");
    await expect(page.getByRole("link", { name: "Fixture guide: diesel DPF warning light" }).first()).toHaveAttribute("href", GUIDE);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    const video = ld.find((x) => x["@type"] === "VideoObject");
    expect(video.uploadDate).toBeUndefined();
    expect(video.embedUrl).toContain("youtube-nocookie.com/embed/fixtureVid1");
  });

  test("Google-user journey: search -> guide -> fault code -> video -> YouTube channel -> contact", async ({ page }) => {
    await page.goto("/");
    // The hero search is hidden on phones (the search section follows it), so use the visible one.
    await page.getByLabel("Search guides, fault codes and videos").filter({ visible: true }).first().fill("vw diesel");
    await page.getByRole("button", { name: /Search/ }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/search\?q=vw\+diesel/);
    await page.getByRole("link", { name: /Fixture guide: diesel DPF/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}$`));
    await page.getByRole("link", { name: /P0401/ }).first().click();
    await expect(page).toHaveURL(/\/fault-codes\/p0401$/);
    await page.locator("aside").getByRole("link", { name: "Fixture video: DPF diagnosis" }).click();
    await expect(page).toHaveURL(/\/videos\/fixture-dpf-video$/);
    await expect(page.locator("aside").getByRole("link", { name: /More videos on YouTube/ })).toHaveAttribute(
      "href",
      "https://www.youtube.com/@muhammadibrahim-vw",
    );
    await page.getByRole("link", { name: "Contact" }).last().click();
    await expect(page).toHaveURL(/\/contact$/);
  });
});
