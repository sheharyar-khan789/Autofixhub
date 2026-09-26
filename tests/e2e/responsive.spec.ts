import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile-first responsive QA: every public route at every target width must have no
 * page-level horizontal overflow. Screenshots of the first viewport are saved to
 * test-results/responsive/ for visual review. Runs once (desktop project) and sets
 * its own viewport sizes.
 */
const WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440];
const SHOT_WIDTHS = new Set([320, 390, 768, 1440]);
const ROUTES: [string, string][] = [
  ["home", "/"],
  ["guides", "/guides"],
  ["guide", "/guides/fixture-diesel-dpf-warning-light"],
  ["fault-codes", "/fault-codes"],
  ["fault-code", "/fault-codes/p0401"],
  ["videos", "/videos"],
  ["video", "/videos/fixture-dpf-video"],
  ["categories", "/categories"],
  ["category", "/categories/dpf"],
  ["search", "/search?q=dpf"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["privacy", "/privacy"],
  ["404", "/this-page-does-not-exist"],
];

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe("responsive QA", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "sets its own viewport sizes");
  });

  test("no horizontal overflow on any public route from 320px to 1440px", async ({ page }) => {
    test.setTimeout(600_000);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      for (const [name, path] of ROUTES) {
        await page.goto(path);
        expect(await overflow(page), `${path} @${width}px`).toBeLessThanOrEqual(0);
        if (SHOT_WIDTHS.has(width)) await page.screenshot({ path: `test-results/responsive/${name}-${width}.png` });
      }
    }
  });

  test("mobile menu fits, locks page scroll, and closes on Escape at narrow widths", async ({ page }) => {
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/guides");
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("dialog", { name: "Site menu" });
      await expect(menu).toBeVisible();
      expect(await overflow(page), `menu @${width}px`).toBeLessThanOrEqual(0);
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow), "background scroll locked").toBe("hidden");
      await expect(menu.getByRole("link", { name: "Guides", exact: true })).toHaveAttribute("aria-current", "page");
      await page.waitForTimeout(300); // let the sheet finish sliding in before the screenshot
      await page.screenshot({ path: `test-results/responsive/menu-${width}.png` });
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused(); // focus returns to the trigger
    }
  });

  test("home hero: exploded view screenshots at key widths (visual review)", async ({ page }) => {
    for (const width of [320, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.goto("/");
      await expect(page.getByTestId("hero-loader")).toHaveCount(0, { timeout: 60_000 });
      await expect(page.getByText(/Loading frames/)).toHaveCount(0, { timeout: 60_000 });
      const scrollTo = (p: number) =>
        page.evaluate((p) => {
          const s = document.querySelector<HTMLElement>('[data-testid="hero-scroll"]')!;
          const top = s.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, top + p * (s.offsetHeight - window.innerHeight));
        }, p);
      await page.screenshot({ path: `test-results/responsive/hero-intact-${width}.png` });
      await scrollTo(0.3);
      await expect(page.getByTestId("hero-scroll")).toHaveAttribute("data-phase", "2");
      await page.waitForTimeout(400); // let the eased scrub settle
      await page.screenshot({ path: `test-results/responsive/hero-mid-${width}.png` });
      await scrollTo(0.7);
      await expect(page.getByTestId("hero-labels")).toHaveAttribute("data-visible", "true");
      await expect(page.getByTestId("hero-scroll")).toHaveAttribute("data-phase", "3");
      expect(await overflow(page), `hero @${width}px`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `test-results/responsive/hero-exploded-${width}.png` });
    }
  });
});
