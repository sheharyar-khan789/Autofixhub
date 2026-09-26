# AutoFixHub — Premium Automotive Cinematic Home Experience Master Prompt

## ROLE

Act as a senior:

- Creative Director
- Automotive Digital Experience Designer
- Premium UI/UX Designer
- Motion Designer
- Frontend Engineer
- Responsive Design Specialist
- Performance Engineer

You are working on the existing **AutoFixHub** project.

The application already has substantial functionality implemented, including:

- Firebase authentication
- Firestore
- Admin CMS
- Guides
- Fault Codes
- Videos
- Categories
- Search
- SEO
- Security rules
- Responsive layouts
- Existing exploded-car scroll animation
- Automated tests

Your task now is **NOT to rebuild the application**.

Your task is to transform the **visual experience**, especially the Home page, into a genuinely premium automotive digital experience.

---

# 1. THE CORE DESIGN IDEA

The final experience should combine three visual directions:

### A. Premium automotive presentation

Think of the visual confidence, spacing, lighting, proportions, cinematic photography and product presentation associated with premium automotive websites.

Do NOT copy any specific company's website, branding, logo, layout, assets, or proprietary design.

Use only the general design principles:

- cinematic
- sophisticated
- minimal
- confident
- premium
- immersive
- strong typography
- large visual subjects
- controlled motion
- dramatic lighting
- generous negative space
- high-quality composition

### B. Automotive engineering / technical visualization

AutoFixHub is not simply a workshop website.

It is:

**Automotive Repair Knowledge + Diagnostics + Engineering + YouTube Content**

The visual system should therefore communicate:

- mechanical engineering
- diagnostics
- vehicle systems
- precision
- technical knowledge
- repair expertise
- modern automotive technology

Use subtle visual language such as:

- engineering diagrams
- blueprint-inspired geometry
- technical measurement marks
- extremely subtle grid systems
- component outlines
- depth lines
- diagnostic-style details

These must remain subtle.

Do NOT make the website look like a sci-fi gaming interface.

### C. The existing exploded-car scrolling experience

This is the most important existing interaction.

**DO NOT REMOVE IT.**

**DO NOT REPLACE IT.**

**DO NOT TURN IT INTO A STATIC IMAGE.**

The existing pre-rendered exploded-car image sequence must remain the core hero interaction.

The goal is to make the environment around it dramatically better.

The final experience should feel like:

> A premium automotive engineering presentation where the vehicle gradually reveals its mechanical systems as the user scrolls.

---

# 2. IMPORTANT: AUDIT BEFORE EDITING

Before touching the code:

Inspect:

- current Home page
- hero component
- exploded-car animation
- image sequence
- background implementation
- typography
- section structure
- shared layout
- navigation
- responsive styles
- existing animations
- existing design tokens
- image assets
- tests
- performance-sensitive code

Understand exactly how the current car animation works.

Do not replace working code unnecessarily.

Identify which parts are already good and preserve them.

---

# 3. DO NOT MAKE THIS A "MORE EFFECTS" REDESIGN

This is extremely important.

Do NOT simply add:

- more gradients
- more glowing borders
- more circles
- more random particles
- more neon
- more animations
- more shadows
- more decorative lines

Premium design does NOT come from adding effects.

Premium design comes from:

- composition
- hierarchy
- typography
- spacing
- lighting
- depth
- proportion
- restraint
- motion choreography
- visual consistency

Every visual effect must have a reason.

If an effect does not improve the composition, remove it.

---

# 4. NEW HOME PAGE ART DIRECTION

Reimagine the Home page as a **cinematic automotive experience**.

The page should feel like a continuous visual story.

Suggested visual journey:

## Scene 01 — INTRO

User lands on AutoFixHub.

The screen should immediately communicate:

**AUTOMOTIVE KNOWLEDGE  
WITHOUT THE GUESSWORK.**

or an equivalent existing brand message if the current content is stronger.

Supporting message should communicate:

- repair knowledge
- diagnostics
- guides
- fault codes
- real-world automotive content

Primary actions:

- Explore Guides
- Watch on YouTube

Do not overcrowd the hero.

---

# 5. HERO COMPOSITION

The hero should NOT feel like:

Text box + image box + background.

Instead create one unified scene.

The car should feel like the central physical object inside the environment.

Think:

**dark automotive studio + engineering visualization + cinematic product presentation**

The composition should include:

### Foreground
Vehicle / exploded vehicle.

### Midground
Subtle technical information and labels.

### Background
Atmospheric depth, extremely subtle engineering geometry and controlled lighting.

### Typography
Confident, premium, editorial.

Everything should visually belong to the same environment.

---

# 6. BACKGROUND — MAJOR UPGRADE

The current background feels too plain.

Do not simply replace it with another generic gradient.

Create a layered environmental background.

Possible layers:

### Layer 1 — Deep base

A sophisticated dark automotive tone.

Avoid pure flat black.

Use subtle warm/cool tonal variation.

### Layer 2 — Atmospheric lighting

Use very soft light sources behind the vehicle.

The light should create depth around the car.

Do not create a huge glowing blob.

### Layer 3 — Technical environment

Extremely subtle:

- blueprint lines
- engineering geometry
- measurement marks
- radial technical structures
- vehicle-system diagrams

Opacity should be very low.

Users should feel the technical environment before consciously noticing it.

### Layer 4 — Depth haze

Very subtle atmospheric depth around the vehicle.

### Layer 5 — Grounding

Use a sophisticated ground shadow/contact shadow so the vehicle feels physically present.

### Layer 6 — Scroll-reactive environment

The background can move very subtly as the user scrolls.

The car should remain the primary subject.

---

# 7. COLOR DIRECTION

Use a premium automotive palette.

Base:

- deep charcoal
- near-black
- graphite
- warm dark metallic tones

Accent:

- restrained warm white
- muted silver
- subtle metallic grey
- extremely controlled red accent where appropriate

Do NOT create a red neon website.

Do NOT use bright cyberpunk colors.

Do NOT use excessive gradients.

The accent color should guide attention, not dominate the interface.

---

# 8. CAR AS THE HERO OBJECT

The car must become the visual anchor.

Do not put the car inside a small "card".

Do not make it feel trapped inside a rectangular container.

Allow the composition to breathe toward the edges of the viewport while maintaining safe boundaries.

On desktop:

- large vehicle
- cinematic scale
- strong central composition
- labels integrated around it
- sufficient negative space
- strong depth

On mobile:

- the vehicle remains visually important
- do not simply shrink desktop
- create a portrait-specific composition
- keep labels readable
- use markers when appropriate
- avoid covering the car with text

---

# 9. PRESERVE THE EXISTING SCROLL EXPLODED-CAR ANIMATION

The current animation is a pre-rendered image sequence.

Keep it.

Do not replace it with:

- Three.js
- WebGL
- a new 3D engine
- a different animation library

unless a genuine technical requirement is discovered and the change is clearly justified.

The current sequence should remain the source of truth.

---

# 10. MAKE THE EXISTING ANIMATION FEEL MORE PREMIUM

The scroll choreography should feel cinematic.

Current conceptual sequence:

### Phase 1
Vehicle intact.

### Phase 2
Vehicle begins separating.

### Phase 3
Major components move apart.

### Phase 4
Exploded engineering view.

### Phase 5
Components remain readable.

### Phase 6
Vehicle gradually returns/recomposes if that behavior already exists.

Preserve the current timing logic unless testing shows a real problem.

Improve the presentation around it.

---

# 11. DEPTH DURING SCROLL

Use subtle depth cues.

For example:

- foreground components can have slightly different movement
- background can shift slower
- vehicle can subtly push toward the viewer
- lighting can change slightly
- atmospheric depth can respond subtly
- labels can appear according to component visibility

Do not exaggerate.

The user should feel:

> "This object has depth."

not:

> "A bunch of CSS animations are happening."

---

# 12. LIGHTING CHOREOGRAPHY

Use light as part of the storytelling.

When the vehicle is intact:

- controlled studio-style lighting

As the vehicle begins to explode:

- subtle illumination can reveal separating components

At maximum separation:

- technical details become slightly more visible

During recomposition:

- lighting can settle again

Keep this subtle.

No flashing.

No distracting color changes.

---

# 13. LABEL SYSTEM

Existing labels:

- bonnet
- petrol engine
- front suspension
- doors and body panels
- high-voltage hybrid components
- wheels and tyres

Keep these.

Do not invent technical information.

Desktop:

- elegant leader lines
- restrained typography
- balanced positioning
- no collisions

Mobile:

- numbered markers on/near the vehicle
- compact parts legend beneath/around it
- no text covering important vehicle components

The label system should feel like a premium engineering visualization.

---

# 14. HERO TYPOGRAPHY

Typography should feel editorial and confident.

Avoid:

- oversized SaaS-style text
- childish rounded typography
- excessive font weights
- too many font sizes

Use:

- strong headline
- restrained supporting copy
- clear hierarchy
- generous line-height
- controlled letter spacing

The headline should be visually powerful without occupying the entire screen.

---

# 15. HERO CTA DESIGN

Primary CTA:

**Explore Guides**

Secondary:

**Watch on YouTube**

Buttons should feel premium.

Use:

- strong spacing
- subtle borders
- restrained hover effects
- clear contrast
- comfortable touch targets

Avoid giant pill buttons unless they genuinely fit the visual language.

---

# 16. MOBILE HERO — REDESIGN, NOT SHRINK

This is critical.

Mobile should have its own composition.

Do NOT simply take the desktop hero and reduce sizes.

The mobile sequence should feel intentionally designed.

Suggested composition:

1. Compact premium header
2. Small category/eyebrow
3. Strong headline
4. Short supporting text
5. CTA
6. Large vehicle visual
7. Technical markers
8. Compact explanatory content
9. Transition into next section

The vehicle should still feel important.

Avoid:

- tiny car
- huge blank areas
- labels covering the car
- buttons touching screen edges
- excessive text above the fold

---

# 17. MOBILE BACKGROUND

The mobile background should NOT simply be a scaled desktop background.

Create a more controlled portrait composition.

Use:

- subtle radial light behind the vehicle
- dark atmospheric layers
- technical geometry
- faint blueprint elements
- controlled depth

Reduce decorative complexity on small screens.

Performance is more important than visual quantity.

---

# 18. HOME PAGE SECTION TRANSITIONS

This is one of the most important improvements.

The Home page should not feel like:

Hero
↓
Cards
↓
Cards
↓
Cards
↓
Footer

Instead, create visual rhythm.

For example:

## Section A
Cinematic hero.

## Section B
Automotive knowledge / popular topics.

Use a slightly different surface treatment.

## Section C
Latest repair guides.

Editorial layout.

## Section D
Fault codes / diagnostics.

More technical visual language.

## Section E
Vehicle systems/categories.

Use large visual cards.

## Section F
YouTube content.

Give the video section its own strong visual identity.

## Section G
Final CTA.

Return to a darker cinematic environment.

These sections should feel related but not identical.

---

# 19. SECTION BACKGROUNDS

Do not use one background across the entire page.

Use controlled transitions:

- dark → slightly lighter graphite
- graphite → technical dark
- technical dark → cinematic dark
- cinematic dark → deep final CTA

Transitions should be subtle.

Do not make every section visually noisy.

---

# 20. AUTOMOTIVE CONTENT CARDS

Guides, fault codes and videos should feel editorial rather than generic SaaS cards.

Improve:

- image treatment
- typography
- spacing
- metadata
- hover states
- card hierarchy

Cards should have enough visual identity without becoming decorative boxes everywhere.

---

# 21. VIDEO SECTION

The YouTube section should feel like an important part of the brand.

Create a cinematic video presentation.

Use existing real YouTube content/data.

Do NOT create fake videos.

Do NOT invent view counts.

Do NOT invent subscribers.

Use only actual data available in the application.

---

# 22. SEARCH

Search is one of AutoFixHub's major product features.

Make the Home search visually integrated into the experience.

It should feel like:

**"Find the answer to your car problem."**

rather than a generic website search box.

Keep all existing search functionality.

Do not break the search implementation.

---

# 23. VISUAL HIERARCHY

At any point on the Home page, the user should know what matters.

Priority:

1. Brand/message
2. Vehicle
3. Primary action
4. Automotive knowledge
5. Supporting technical details

Background effects should always remain below these priorities.

---

# 24. RESPONSIVE BREAKPOINT STRATEGY

Test and intentionally design:

- 320px
- 360px
- 375px
- 390px
- 393px
- 412px
- 430px
- 768px
- 1024px
- 1280px
- 1440px

Do not rely solely on standard Tailwind breakpoints if the composition requires additional responsive handling.

---

# 25. MOBILE-SPECIFIC REQUIREMENTS

At 320px:

- no horizontal overflow
- headline readable
- buttons usable
- vehicle visible
- markers readable
- parts list readable
- header usable

At 390px:

- hero should feel balanced
- vehicle should have sufficient scale
- background should create depth
- no excessive empty space

At 430px:

- take advantage of the additional width without making the design feel stretched.

---

# 26. TABLET

At 768px and 1024px:

Do not simply choose between mobile and desktop.

Use an intentional intermediate composition.

The vehicle, labels and text should transition naturally.

---

# 27. DESKTOP

At 1280px and 1440px:

The hero should feel expansive.

The vehicle should have cinematic scale.

There should be enough negative space for premium presentation.

Labels should not crowd the vehicle.

The composition should feel like a designed scene rather than a collection of components.

---

# 28. MICRO-INTERACTIONS

Use subtle interactions:

- hover
- focus
- image movement
- button feedback
- card transitions
- navigation transitions

But keep them restrained.

Premium ≠ animated everywhere.

---

# 29. SCROLL EXPERIENCE

The complete page should feel connected.

The scroll should have:

- visual continuity
- section transitions
- controlled reveals
- subtle depth
- consistent pacing

Do not create scroll-jacking.

Do not hijack normal browser scrolling.

Do not make the user fight the page.

---

# 30. PERFORMANCE

This is mandatory.

The website must remain fast.

Avoid:

- large new dependencies
- unnecessary JavaScript
- continuous expensive scroll calculations
- layout thrashing
- huge background videos
- unnecessary particle systems
- WebGL unless absolutely necessary

Use existing optimized animation mechanisms.

Prefer:

- CSS transforms
- opacity
- requestAnimationFrame where appropriate
- compositor-friendly animation
- existing image sequence implementation

---

# 31. ACCESSIBILITY

Preserve:

- keyboard navigation
- focus states
- semantic HTML
- reduced-motion support
- readable contrast
- accessible buttons
- accessible labels

For:

`prefers-reduced-motion`

remove or substantially reduce decorative motion while keeping the content and vehicle visualization usable.

---

# 32. KEEP ALL EXISTING FUNCTIONALITY

This is NON-NEGOTIABLE.

Do not break:

- Firebase
- Firestore
- Authentication
- Admin login
- Admin dashboard
- Roles
- Security rules
- Guides
- Fault Codes
- Videos
- Categories
- Search
- Contact
- SEO
- sitemap
- robots
- APIs
- caching
- publishing
- draft system
- error handling

Do not change business logic merely for visual reasons.

---

# 33. ADMIN

Do not redesign the admin again.

Only ensure that Home-page changes do not affect admin.

Admin functionality must remain untouched.

If shared components are modified, verify that the admin does not regress.

---

# 34. DO NOT INVENT BUSINESS INFORMATION

Never invent:

- phone number
- WhatsApp number
- address
- postcode
- certification
- MOT claim
- manufacturer authorization
- fake reviews
- fake statistics
- fake business claims

AutoFixHub must remain separate from OnTrack.

Do not introduce OnTrack branding.

---

# 35. ASSET RULE

Before creating new visuals:

Inspect existing assets.

Reuse high-quality existing assets wherever possible.

Do not use random stock images.

Do not generate fake car photography.

Do not replace the existing exploded-car frames.

If a visual asset is genuinely missing, use CSS/HTML composition only where appropriate rather than introducing unnecessary external assets.

---

# 36. DO NOT COPY OTHER BRANDS

Premium automotive websites may be used as conceptual inspiration for:

- composition
- restraint
- typography
- spacing
- cinematic presentation
- interaction quality

But do NOT copy:

- exact layouts
- logos
- brand identity
- proprietary assets
- exact text
- exact animations
- distinctive branded UI

AutoFixHub must have its own identity.

---

# 37. IMPLEMENTATION PROCESS

Follow this order:

### Phase 1 — Audit

Inspect everything.

### Phase 2 — Visual direction

Define the Home page visual system before coding.

Determine:

- background layers
- typography hierarchy
- color system
- section rhythm
- hero composition
- car scale
- label placement
- mobile composition

### Phase 3 — Implement

Make targeted changes.

### Phase 4 — Responsive refinement

Test all target widths.

### Phase 5 — Performance

Check animation performance.

### Phase 6 — Functional regression

Confirm all existing functionality still works.

### Phase 7 — Visual QA

Review screenshots at:

- 320
- 390
- 768
- 1024
- 1440

---

# 38. IMPORTANT: DO NOT STOP AFTER "IT WORKS"

A technically working page is not the goal.

The goal is:

> **Does this actually look premium?**

If the answer is no, continue refining the visual composition.

Do not declare success merely because:

- build passes
- tests pass
- responsive tests pass

Those are necessary but not sufficient.

---

# 39. VISUAL QA QUESTIONS

Before finishing, inspect the Home page and answer:

### Hero
- Does the first screen immediately feel premium?
- Does the car feel like the hero object?
- Does the background create depth?
- Does the composition feel intentional?
- Does the page look expensive rather than generic?

### Scroll
- Does the exploded-car animation feel cinematic?
- Does the environment respond subtly?
- Does the user feel the vehicle has depth?
- Is the motion smooth?

### Mobile
- Does the page still feel premium at 320px?
- Is the car large enough?
- Is the typography balanced?
- Is there too much empty space?
- Are the technical details readable?
- Does the page feel designed specifically for mobile?

### Whole page
- Do sections transition naturally?
- Is there visual rhythm?
- Does the page have a clear identity?
- Is anything visually unnecessary?

---

# 40. TESTING

After implementation run:

- TypeScript
- ESLint
- Unit tests
- Firestore rules tests
- Admin tests
- Responsive tests
- Full E2E suite
- Production build

Do NOT modify tests simply to hide failures.

If the hero timeout issue exists, verify the actual cause.

If a test fails because of a real regression, fix the implementation.

---

# 41. FINAL REPORT

Provide:

## Visual Changes
What changed in the Home page.

## Hero
What changed around the exploded-car experience.

## Background
Explain the new visual environment.

## Mobile
Explain the mobile-specific composition.

## Desktop
Explain desktop improvements.

## Animation
Confirm that the existing pre-rendered image sequence remains.

## Functionality
Confirm what existing functionality was preserved.

## Tests
Provide exact results.

## Files Changed
List important files.

## Remaining Issues
Only genuine issues.

## Manual Actions
Only things I need to do manually.

---

# FINAL CREATIVE DIRECTION

The final AutoFixHub Home page should feel like:

**Premium automotive brand**
+
**engineering visualization**
+
**automotive knowledge platform**
+
**cinematic scrolling experience**

The user should feel:

> "This looks like a serious automotive technology platform."

Not:

> "This is a workshop website with some effects."

The visual system should be:

**dark  
cinematic  
technical  
premium  
minimal  
deep  
confident  
automotive  
editorial  
responsive**

The existing exploded-car scroll interaction is the centerpiece.

Everything else should make that interaction feel more impressive.

---

# MOST IMPORTANT RULE

**DO NOT DESTROY WHAT ALREADY WORKS.**

The existing functionality and existing exploded-car sequence are valuable.

Improve the environment, composition, art direction, visual hierarchy, background, lighting, depth, typography, section transitions and responsive presentation around them.

Do not turn this into a backend rewrite.

Do not turn this into a framework migration.

Do not add unnecessary dependencies.

Do not sacrifice performance.

Do not sacrifice mobile usability.

Do not sacrifice accessibility.

Make the final experience feel **premium, cinematic, automotive and intentional.**