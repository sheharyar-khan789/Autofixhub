# Launch checklist

Launch-preparation audit, 2026-09-26; updated after AutoFixHub content finalisation the same day. Everything marked **[✓] Verified** was checked in this
repository (tests, build, or a running dev server on fixture data). Nothing here was tested against a
real Firebase project, real Vercel deployment, or a real phone. Those items are marked **[!]**.

> **Update (knowledge-platform transformation, 2026-09-26):** AutoFixHub is now a repair-knowledge +
> YouTube platform. Public booking, the services catalogue and the admin Bookings/Services/Reviews areas are
> **dormant** (`WORKSHOP_FEATURES_ENABLED` unset/false; `/book` → `/contact`, `/services` → `/categories`, booking
> API 404). Consequences for launch: `IP_HASH_SALT` is only needed if those features are switched on; a new
> Firestore collection `categories` exists (redeploy `firestore.rules`; `npm run seed` creates the 13 starter
> categories); the privacy notice now describes a site with no public forms. Rows below that talk about booking,
> services, MOT/air-con/HV services or opening hours apply only if the workshop features are re-enabled.

Legend: **[✓] Verified** · **[!] External setup required** · **[ ] Not done**

---

## 1. Environment variables

| Variable | Purpose | Where used | Public / secret | Vercel |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for sitemap, canonical URLs, JSON-LD, same-origin checks | `src/lib/env.ts` → `siteUrl()` | Public | **Required** (e.g. `https://yourdomain.co.uk`, no trailing slash). If missing on Vercel it falls back to the Vercel production domain, never localhost. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser Firebase config (staff sign-in only) | `src/lib/firebase/client.ts` | Public (identifies the project, not a secret) | Required |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 〃 | 〃 | Public | Required |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 〃 | 〃 | Public | Required |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Browser config **and** the Admin SDK bucket for booking/gallery photos | `client.ts`, `env.ts` | Public | Required |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Browser config | `client.ts` | Public | Required |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Browser config | `client.ts` | Public | Required |
| `FIREBASE_ADMIN_PROJECT_ID` | Admin SDK (all Firestore/Storage/Auth server access) | `env.ts`, `scripts/_admin.ts` | **Secret-adjacent** (server only) | Required |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service-account email | 〃 | **Secret** (server only) | Required |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service-account private key (`\n` escaped, keep quotes) | 〃 | **Secret** (server only) | Required, mark *Sensitive* |
| `IP_HASH_SALT` | Salt for hashed IPs used by booking rate limiting | `env.ts` → `ipHashSalt()` | **Secret** | **Required in production**: the booking API returns 503 without it |
| `BUSINESS_ID` | Tenant key on every document and staff claim | `env.ts`, scripts | Server | Optional (defaults to `default`); must match what `npm run seed` / `admin:grant` used |
| `SHOW_PLACEHOLDERS` | Hides all "Placeholder:" blocks when `false` | `env.ts` | Server | **Set to `false` at launch** |
| `DATA_SOURCE` | `memory` = fictional fixtures for dev/tests | `env.ts` | Server | **Do not set** (refused in production anyway) |

No other environment variables are read by the app. `NODE_ENV` and `VERCEL_PROJECT_PRODUCTION_URL` are set by the platform.

---

## 2. Firebase production

| Item | State | Notes |
|---|---|---|
| Authentication (email/password) | [!] | Enable Email/Password. Create staff users in the console, then `npm run admin:grant -- --email … --role owner`. Staff must sign in again after a role change. |
| Session configuration | [✓] | httpOnly cookie, `Secure` in production, `SameSite=Lax`, 8 h, revocation checked on every admin request, revoked on sign-out, login requires a sign-in < 5 min old. |
| Firestore rules | [✓] code / [!] deploy | 8 emulator tests pass (`npm run test:rules`, needs Java 21+). Deploy: `firebase deploy --only firestore:rules,firestore:indexes,storage`. |
| Storage rules | [✓] code / [!] deploy | Deny-all for client SDK; server writes via Admin SDK. |
| Firestore indexes | [✓] declared / [!] deploy | `firestore.indexes.json` covers every composite query (bookings, audit log, related-service lookups). Deploy with the command above; wait for "Enabled". |
| TTL on `rateLimits.expiresAt` | [✓] declared / [!] confirm | Declared in `firestore.indexes.json`; confirm it shows as active under Firestore → TTL after deploy. |
| Storage bucket | [!] | New Firebase projects need the **Blaze** plan to create a Cloud Storage bucket; confirm in the console. |
| Gallery public URLs | [!] verify | Gallery upload calls `makePublic()`. If the bucket has *uniform bucket-level access* enabled this fails. Test one gallery upload immediately after setup. |
| Booking photo previews | [!] verify | Uses 15-minute v4 signed URLs signed with the service-account key. Verify on one real booking with a photo. |
| `IP_HASH_SALT` | [ ] | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| Separate dev and prod projects | [!] | Recommended; never point local dev at production data. |

---

## 3. Vercel

| Setting | Value | State |
|---|---|---|
| Framework preset | Next.js (auto-detected) | [!] |
| Root directory | `workshop` (if the Git repo root is the parent folder) | [!] |
| Install command | `npm ci` (lockfile committed) | [!] |
| Build command | `npm run build` | [✓] passes locally without credentials |
| Node.js version | **22.x or later** (`firebase-admin` 14 requires Node ≥ 22; Next 16 requires ≥ 20.9). Tested locally on 24.x. | [!] set in Project Settings |
| Environment variables | Section 1, Production (and Preview with a *dev* Firebase project) | [ ] |
| Production URL / domain | Owner's domain, then set `NEXT_PUBLIC_SITE_URL` to it and **redeploy** | [ ] |
| Security headers | Set in `next.config.ts` (nosniff, frame DENY, HSTS, Referrer-Policy, Permissions-Policy); verified on a dev server | [✓] |
| Body size | Booking uploads are compressed in the browser and capped at ~4.2 MB, under Vercel's 4.5 MB function limit | [✓] |

No `vercel.json` is needed. No production settings were changed.

---

## 4. Real business content

Nothing below is in the site yet. **Do not publish any item until the owner confirms it.**

| Item | Status | Notes |
|---|---|---|
| Business / trading name | [✓] | **AutoFixHub** (confirmed). The owner's work experience with OnTrack (Manchester) is context only: OnTrack is not AutoFixHub, and its name/branding is not used on the site. |
| Logo | [ ] | No logo in `public/brand/`. |
| Phone, WhatsApp | [ ] | |
| Email | [✓] | `muhammadibrahimx53@gmail.com` (confirmed); shown in the footer and on the contact page. |
| UK address, Google Maps link | [ ] | "Manchester" alone is not an address. |
| Opening hours | [ ] **Owner input required** | Not confirmed; none are shown or emitted in structured data. `data/settings.example.json` now holds confirmed facts only. |
| Services | [✓] catalogue / [!] review | Replaced the generic demo catalogue with the confirmed expertise: 6 categories, 13 services (VW Group diesel, Toyota Prius/Corolla Hybrid, gearbox, clutch, DPF, turbo, injectors, timing belt, oil leaks, wiring, loom wiring, electrical diagnostics). No MOT, no prices. Seeded as **drafts**; the owner publishes after review. |
| MOT | [ ] **Owner confirmation required** | Not confirmed. All MOT claims were removed from public copy, metadata and structured data. Only publish an MOT claim with DVSA authorisation. |
| Service descriptions | [ ] | Starter text is neutral; no prices (shown as "Quote on request"). |
| Workshop photos | [ ] | Upload via `/admin/gallery`. Blur number plates unless the customer agreed. |
| Team, experience, qualifications, accreditations | [✓] experience / [ ] rest | "5 years' experience" with VW Group and Toyota is shown (confirmed). No certifications, accreditations or manufacturer approval are claimed. |
| YouTube channel + videos | [✓] channel / [ ] videos | Channel `https://www.youtube.com/@muhammadibrahim-vw` is linked site-wide. Individual videos: add via `/admin/videos` (none invented). |
| Repair guides | [ ] | Add via `/admin/guides`. |
| Fault codes | [ ] | 3 generic OBD-II codes (P0420, P0300, P0401) seeded as drafts. Review, then publish. |
| Reviews | [ ] | Only real reviews, entered via `/admin/reviews`; or set a Google reviews link in settings. |
| Social links | [ ] | |

**MOT copy:** removed from the site-wide description, hero, services metadata and business JSON-LD (launch finalisation).

---

## 5. Legal / trust

| Item | State | Notes |
|---|---|---|
| Privacy notice | [ ] **Blocker** | `/privacy` is a stub and is shown even with `SHOW_PLACEHOLDERS=false`. The booking form requires customers to accept it. Needs real UK GDPR text (controller, data collected, lawful basis, retention, sharing, rights, ICO complaint route). Then bump `PRIVACY_NOTICE_VERSION` in `src/lib/booking/create.ts`. |
| ICO registration | [!] | Most businesses processing personal data must pay the ICO data-protection fee. Owner to check. |
| Cookie policy | [!] | The public site sets **no cookies**. The only cookie is the staff session (strictly necessary). YouTube loads only on click, from `youtube-nocookie.com`. A short cookie statement is still advisable; a consent banner is not needed unless analytics are added. |
| Terms & conditions, booking terms, cancellation | [ ] | Bookings are *requests*, not confirmed appointments; the form already says so. Written terms should come from the owner and ideally be reviewed. |
| Data retention | [ ] | Bookings and photos are kept indefinitely today. The owner must decide a retention period for the privacy notice. Deletion is manual in the Firebase console for now. |

No legal text was written. It needs owner input and appropriate review.

---

## 6. SEO

| Item | Already implemented | Needs real data | Needs external setup |
|---|---|---|---|
| Site URL | ✓ `siteUrl()` | Production domain | Set `NEXT_PUBLIC_SITE_URL` |
| Titles / descriptions | ✓ per page, AutoFixHub brand, no MOT claims | | |
| Canonical | ✓ every page (home added in launch prep) | | |
| OpenGraph / Twitter | ✓ | **No `og:image`** (needs a real logo/photo) | |
| sitemap.xml / robots.txt | ✓ (admin/api disallowed; only published content listed) | | Submit sitemap |
| LocalBusiness (`AutoRepair`) | ✓ emitted only when name **and** address exist | Name, address, hours, phone | |
| Organization | Covered by `AutoRepair` (a LocalBusiness subtype); no separate entity needed | | |
| Service / Article / TechArticle / VideoObject / BreadcrumbList / FAQPage | ✓ built only from real fields, no ratings/prices invented | Real services/guides/videos | |
| Favicon | ✗ still the **default Next.js favicon** (`src/app/favicon.ico`) | Logo | |
| Google Search Console | | | [!] Verify domain, submit sitemap |
| Google Business Profile | | | [!] Owner's own business only; must match site NAP |

---

## 7. Security

| Item | State |
|---|---|
| Admin authorisation server-side (all 22 server actions + pages) | [✓] |
| Firestore / Storage rules | [✓] emulator-tested, [!] deploy |
| Rate limiting (5 bookings/IP/hour, Firestore-backed) | [✓] unit-tested, [!] needs `IP_HASH_SALT` + TTL |
| Honeypot on booking form, same-origin checks, magic-byte photo validation | [✓] |
| Secrets not in repo or client bundle | [✓] scanned |
| Security headers | [✓] |
| CSP | [ ] Deferred on purpose: needs testing against real Firebase Auth/Storage/YouTube origins. |
| App Check / bot protection (e.g. Turnstile) | [ ] Can wait. Add if spam bookings appear. |
| Staff MFA | [!] Recommended: enable multi-factor for staff accounts in Firebase Auth. |

---

## 8. Real device QA — [ ] Not done

Automated Playwright runs covered desktop 1440px, tablet 820px, Pixel 5 emulation, and overflow at
375–1920px, on fixture data only. **Still to test on real devices:** iPhone (Safari), Android (Chrome),
Windows Chrome/Edge, macOS Safari.

Test on each: homepage + animation (slow/fast scroll, rotate), booking with a camera photo, tel: and
WhatsApp links, Maps link, a YouTube video, guides, fault codes, navigation/mobile dock, and admin sign-in
and status change.

---

## Final checklist

| Area | State |
|---|---|
| **A. Code** | [✓] typecheck, lint, 136 unit tests, 8 rules tests, 78 e2e tests, production build |
| **B. Firebase** | [!] project, Auth, rules/indexes/TTL deploy, Storage bucket, staff accounts |
| **C. Vercel** | [!] project, root dir, Node 22+, env vars, domain |
| **D. Business content** | [✓] name, email, YouTube, expertise · [ ] phone/WhatsApp, address, hours, logo, MOT status, legal details |
| **E. SEO** | [✓] implementation · [ ] real data, og:image, favicon · [!] Search Console, Business Profile |
| **F. Security** | [✓] code · [!] deploy rules, set salt, staff MFA · [ ] CSP/App Check (can wait) |
| **G. Legal** | [ ] privacy notice (**blocker**), terms, retention · [!] ICO fee check |
| **H. Mobile testing** | [ ] real devices not tested |
| **I. Analytics** | [ ] none installed (none required; adding one would need cookie consent) |
| **J. Domain** | [ ] not purchased/connected |

---

## Exactly what the owner must provide
1. ~~Business name~~ — confirmed: AutoFixHub (OnTrack = work-experience context only).
2. ~~Email~~ — confirmed: muhammadibrahimx53@gmail.com.
3. Phone number and WhatsApp number.
4. Full UK address and Google Maps link.
5. Real opening hours.
6. Review the 13 confirmed-expertise services (drafts) and confirm MOT status (DVSA) before any MOT wording is published.
7. Logo (and a photo suitable as the social-share image).
8. Workshop photos (number plates blurred or consented).
9. Team/experience text; any qualifications or accreditations **with proof**.
10. ~~YouTube channel~~ — confirmed. Individual video links still to add.
11. Any real reviews (with source) or a Google reviews link.
12. Social media links.
13. Privacy-notice details: data retention period, who data is shared with, ICO registration status.
14. Booking/cancellation terms.
15. The domain name.

## Exactly what must be configured in Firebase
1. Create a production project (Blaze plan if required for Storage) and a separate dev project.
2. Enable Authentication → Email/Password. Create staff users; enable MFA if possible.
3. Create Firestore (a UK/EU region, e.g. `europe-west2` London) and the default Storage bucket.
4. Generate a service-account key (Project settings → Service accounts). Put it in Vercel env vars only.
5. `firebase deploy --only firestore:rules,firestore:indexes,storage --project <prod-id>`; confirm indexes are *Enabled* and the `rateLimits.expiresAt` TTL policy is active.
6. `npm run seed` (drafts) → review in admin → publish only confirmed services and fault codes.
7. Write real settings: `npm run seed -- --settings data/settings.local.json` (filled from the owner's facts), or use `/admin/settings`.
8. `npm run admin:grant -- --email <owner email> --role owner`.
9. Test one gallery upload and one booking with a photo (Section 2 "verify" rows).

## Exactly what must be configured in Vercel
1. Import the repo; set Root Directory to `workshop` if needed.
2. Node.js version: 22.x or later.
3. Environment variables from Section 1 (Production), including `IP_HASH_SALT`, `SHOW_PLACEHOLDERS=false`, and `NEXT_PUBLIC_SITE_URL=https://<domain>`. Preview should use the dev Firebase project.
4. Add the domain; after DNS is live, confirm `NEXT_PUBLIC_SITE_URL` matches and redeploy.
5. Optional: Vercel Analytics (would require a cookie/consent review).

## Exactly what real content must be added
Business settings (name, contact, address, hours, maps), confirmed services and descriptions, workshop
photos, about/team text, privacy notice (code change to `/privacy` + version bump), at least a few repair
guides and videos (optional for day one), reviewed fault codes, real reviews or a Google reviews link, logo,
favicon and social image.

## What can wait until after launch
- CSP, App Check / Turnstile (add if spam appears).
- Booking email/SMS notification to the workshop (today staff must check `/admin/bookings`).
- Automated data-retention clean-up.
- Admin list pagination (fine at small-business volume).
- Slimming the booking page's Zod bundle (~392 KB uncompressed).
- Removing unused starter SVGs in `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`; not referenced anywhere).
- More guides, videos and fault codes.
- Analytics.

## Firestore TTL (dormant workshop features only)
`firestore.indexes.json` no longer declares the `rateLimits.expiresAt` TTL policy: TTL requires the Blaze plan
and made the index deploy fail on the free Spark plan ("billing disabled"). It is only used by the dormant
booking rate limiter. If `WORKSHOP_FEATURES_ENABLED` is ever turned on, upgrade to Blaze and enable a TTL
policy on `rateLimits.expiresAt` (Firestore → TTL).

## Update: UI/UX, stability & security pass (2026-09-26)
Done against the real project `autofixhub-56567`:
- **Firestore indexes + rules deployed** (`firebase deploy --only firestore:indexes,firestore:rules`). This fixed the
  real `FAILED_PRECONDITION: The query requires an index` on `auditLogs` (and the same latent error on `bookings`):
  the indexes were declared in `firestore.indexes.json` but had never been deployed. Both queries verified working.
- The project's live Firestore rules are now the repo's rules (public read of published content only, no client writes).
- **Verified on the real project** (browser, real login form, owner account): sign-in with redirect-back, dashboard
  with no index errors, refresh keeps the session, all 9 admin sections load, guide draft → 404 → publish → public +
  sitemap → unpublish → 404 → delete, cleared optional field stays cleared, sign-out locks routes, 0 console errors.
  The test guide was deleted; a few `auditLogs` entries from the test remain (by design, the audit log is append-only).

Still required:
- **Storage**: the project has no Storage bucket yet (Firebase Console → Storage → Get started; new projects need the
  Blaze plan). Until then Media uploads can't work and `storage.rules` can't be deployed.
- `npm run seed` has not been run on the real project (0 categories, 0 fault codes).
- Rotate the service-account key that was shared in chat, and delete the downloaded JSON from `Downloads`.
