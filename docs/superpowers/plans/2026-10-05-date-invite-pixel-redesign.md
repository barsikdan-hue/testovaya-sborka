# Date Invite Pixel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 🦸 SUPERPOWERS is mandatory for implementation, debugging, TDD and verification.

**Goal:** Rebuild the existing Date Invite static site to closely match the approved warm romantic sunset reference while preserving direct Telegram delivery and removing all date-related UI and logic.

**Architecture:** Keep the existing dependency-free Render Static Site. Replace the old sealed/letter/choice/result UI with two reference-driven views (`invitation`, `success`). Use two dedicated image assets for the terrace hero and success illustration; keep Telegram deep-link generation isolated in `delivery.js`. The secondary choice opens Telegram directly with a fixed alternate-day message.

**Tech Stack:** HTML, CSS, vanilla ES modules, Node built-in `node:test` for behavior tests, Render Static Site.

**Spec:** `docs/superpowers/specs/2026-10-05-date-invite-pixel-redesign.md`

## Global Constraints
- Approved reference image + spec are visual source of truth.
- Mobile-first, target 390px; review at 320 / 360 / 390 / 412 / 430px.
- No backend, database, auth, tracking, cookies, analytics, or new runtime dependencies.
- Preserve `@DanilVlasenk` Telegram delivery and `noindex,nofollow`.
- Accepted-response text must remain exactly: `Да ❤️ Я согласна. Посмотрим, что ты придумал 😌`.
- Alternate-day text must remain exactly: `Давай выберем другой день 🙂`.
- No dates, calendar controls, date inputs, or date formatting logic anywhere.
- Do not distribute font files.
- Use TDD for behavior changes: RED → GREEN → full regression → static check → live smoke.

## Review Focus
1. 320px width: no clipped headline/buttons and no horizontal scroll.
2. Short mobile viewport (~800px): question card remains reachable without overlap or inaccessible controls.
3. Telegram deep-links preserve Cyrillic + emoji for both message variants.
4. Secondary CTA opens Telegram directly without rendering an intermediate screen.
5. No date-related UI, assets, copy or dead JS remains in the production build.

---

### Task 1: Reference Assets

**Files:**
- Create: `date-invite/public/assets/hero-sunset.webp`
- Create: `date-invite/public/assets/success-envelope.webp`

**Interfaces:**
- Consumes: approved 941×1672 reference image and the asset descriptions in the spec.
- Produces: two clean UI-safe assets with no baked-in Russian UI copy.

- [ ] **Step 1: Generate hero asset**

Create a clean golden-hour terrace image matching the reference scene: city/water, string lights, daisies, candle, two mugs, no people, no baked-in text.

- [ ] **Step 2: Generate success illustration asset**

Create the cream/pastel envelope + heart card + floral sprig illustration with sparse coral hearts and no baked-in UI copy.

- [ ] **Step 3: Optimize and verify dimensions**

Use WebP, sized to avoid visible blur at 430px CSS width and small enough for fast mobile load. Verify no text artifacts.

- [ ] **Step 4: Commit assets**

Commit message: `feat(date-invite): add reference-matched visual assets`

---

### Task 2: State Model and Response Texts

**Files:**
- Modify: `date-invite/public/js/invite.js`
- Test: `date-invite/test/invite.test.js`

**Interfaces:**
- Produces `initialState()`, `transition(state, event)`, `createResponseText(answer, config)`.
- `app.js` consumes these functions in Task 4.

- [ ] **Step 1: Write failing state tests**

Pin:
- initial state = `invitation`
- `YES` → `success`
- invalid/repeated events do not move state
- accepted response text remains exactly `Да ❤️ Я согласна. Посмотрим, что ты придумал 😌`
- alternate response text remains exactly `Давай выберем другой день 🙂`

- [ ] **Step 2: Run state tests and verify RED**

Run: `node --test date-invite/test/invite.test.js`
Expected: FAIL because current state names/transition contract are old.

- [ ] **Step 3: Implement minimal two-state model**

Replace sealed/letter/choice/result state machine with `invitation` and `success`. Keep alternate-day behavior as a response action, not a state.

- [ ] **Step 4: Run state tests and verify GREEN**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(date-invite): simplify invitation state flow`

---

### Task 3: Reference-Matched Markup and Styling

**Files:**
- Replace: `date-invite/public/index.html`
- Replace: `date-invite/public/styles.css`
- Test: `date-invite/test/static.test.js`

**Interfaces:**
- DOM hooks required by Task 4:
  - `[data-screen="invitation"]`
  - `[data-screen="success"]`
  - `#yes-button`
  - `#later-button`
  - `#send-response`
  - `#response-preview`

- [ ] **Step 1: Write failing static-contract tests**

Assert exact required copy, required two screens, asset references, required controls, `noindex,nofollow`, semantic buttons, absence of the old envelope/letter UI, and absence of all calendar/date-picker markup.

- [ ] **Step 2: Run static test and verify RED**

Expected: FAIL against current markup.

- [ ] **Step 3: Replace HTML structure**

Implement only the two approved screens, preserving accessibility labels and safe-area behavior.

- [ ] **Step 4: Replace CSS with design tokens and reference geometry**

Implement:
- 430px centered mobile canvas on desktop
- hero as full-bleed visual
- reference-like top typography placement
- cream bottom question card with 64px heart tab
- 72px primary/secondary buttons
- reference-like success layout
- motion tokens + reduced-motion fallback

- [ ] **Step 5: Add asset stability rules**

Set fixed aspect ratios/min-heights and `object-fit`/`background-position` so images do not create layout shift and the 390px crop matches the reference.

- [ ] **Step 6: Run static test and verify GREEN**

Expected: PASS.

- [ ] **Step 7: Manual responsive inspection**

Inspect 320 / 360 / 390 / 412 / 430px. Fix only geometry mismatches and overflow.

- [ ] **Step 8: Commit**

Commit message: `feat(date-invite): rebuild UI from approved reference`

---

### Task 4: Wire Interaction and Telegram Flow

**Files:**
- Replace: `date-invite/public/js/app.js`
- Keep/modify only if needed: `date-invite/public/js/delivery.js`
- Test: `date-invite/test/delivery.test.js`
- Test: `date-invite/test/app-contract.test.js`

**Interfaces:**
- Uses state functions from Task 2.
- Uses `buildTelegramUrl(text, username)` / `deliverResponse(text, location)` from `delivery.js`.

- [ ] **Step 1: Write failing interaction-contract tests**

Pin:
- YES renders success and exact response preview
- LATER opens Telegram directly with `Давай выберем другой день 🙂`
- success send opens Telegram with `Да ❤️ Я согласна. Посмотрим, что ты придумал 😌`
- no intermediate date-picker state exists

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL against current `app.js`.

- [ ] **Step 3: Implement interaction wiring**

Keep DOM update logic small; no framework. Preserve direct navigation to the Telegram URL only on explicit CTA clicks.

- [ ] **Step 4: Run tests and verify GREEN**

Expected: PASS.

- [ ] **Step 5: Verify Telegram encoding regression**

Run delivery tests for Cyrillic + emoji and both message variants.

- [ ] **Step 6: Commit**

Commit message: `feat(date-invite): wire simplified Telegram flows`

---

### Task 5: Full Verification and Render Acceptance

**Files:**
- Modify only if a proven defect is found.

**Interfaces:**
- Consumes final static build from Tasks 1–4.
- Produces a customer-ready live Render deployment.

- [ ] **Step 1: Run full local regression**

Run all `node --test` suites.
Expected: 0 FAIL.

- [ ] **Step 2: Run static check**

Verify all HTML/CSS/JS/assets exist, expected copy/hooks are present, and date-related artifacts are absent.

- [ ] **Step 3: Push final commits to `date-invite`**

Render auto-deploy is enabled; do not manually trigger a redundant deploy.

- [ ] **Step 4: Wait for Render deploy status `live`**

Confirm deployed commit matches the branch head.

- [ ] **Step 5: Live functional smoke**

Browser-test:
- YES → success → Telegram `@DanilVlasenk` with exact accepted text, do not send
- LATER → Telegram `@DanilVlasenk` with `Давай выберем другой день 🙂`, do not send
- confirm no calendar/date-picker screen is reachable

- [ ] **Step 6: Live visual pixel review**

At 390px first, compare against reference for:
- hero crop
- headline coordinates
- question-card top edge and heart tab
- button heights/widths/radii
- success illustration/text/CTA spacing

Then verify 320 / 360 / 412 / 430px for responsive integrity.

- [ ] **Step 7: Defect handling**

For any visual or functional failure: prove the root cause, apply the minimal fix, rerun targeted verification, then rerun full regression and live smoke.

- [ ] **Step 8: Final acceptance report**

Report branch/head, tests, Render deploy ID/status, live URL, and any known visual deltas from the approved reference.
