# Date Invite Pixel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 🦸 SUPERPOWERS is mandatory for implementation, debugging, TDD and verification.

**Goal:** Rebuild the existing Date Invite static site to closely match the approved warm romantic sunset reference while preserving direct Telegram delivery and adding a functional alternate-date flow.

**Architecture:** Keep the existing dependency-free Render Static Site. Replace the old four-step sealed/letter/choice/result UI with three reference-driven views (`invitation`, `date_picker`, `success`). Use three dedicated image assets for the terrace hero, date illustration and success illustration; keep state and date formatting in small JS modules and keep Telegram deep-link generation isolated in `delivery.js`.

**Tech Stack:** HTML, CSS, vanilla ES modules, Node built-in `node:test` for behavior tests, Render Static Site.

**Spec:** `docs/superpowers/specs/2026-10-05-date-invite-pixel-redesign.md`

## Global Constraints
- Approved reference image + spec are visual source of truth.
- Mobile-first, target 390px; review at 320 / 360 / 390 / 412 / 430px.
- No backend, database, auth, tracking, cookies, analytics, or new runtime dependencies.
- Preserve `@DanilVlasenk` Telegram delivery and `noindex,nofollow`.
- Accepted-response text must remain exactly: `Да ❤️ Я согласна. Посмотрим, что ты придумал 😌`.
- Alternate-date continue must open Telegram with the chosen date; no automatic send.
- Do not distribute font files.
- Use TDD for behavior changes: RED → GREEN → full regression → static check → live smoke.

## Review Focus
1. 320px width: no clipped headline/buttons and no horizontal scroll.
2. Short mobile viewport (~800px): question card remains reachable without overlap or inaccessible controls.
3. Dynamic dates across month/year boundaries: four options display correctly and Telegram text uses the selected calendar date.
4. Custom date input overrides quick selection and produces the correct Telegram draft.
5. Telegram deep-links preserve emoji/Cyrillic and never auto-send.

---

### Task 1: Reference Assets

**Files:**
- Create: `date-invite/public/assets/hero-sunset.webp`
- Create: `date-invite/public/assets/date-picker.webp`
- Create: `date-invite/public/assets/success-envelope.webp`

**Interfaces:**
- Consumes: approved 941×1672 reference image and the asset descriptions in the spec.
- Produces: three clean UI-safe assets with no baked-in Russian UI copy.

- [ ] **Step 1: Generate hero asset**

Create a clean golden-hour terrace image matching the reference scene: city/water, string lights, daisies, candle, two mugs, no people, no baked-in text.

- [ ] **Step 2: Generate date illustration asset**

Create the cream/pastel calendar + mug + foliage illustration with sparse coral hearts and no baked-in UI copy.

- [ ] **Step 3: Generate success illustration asset**

Create the cream/pastel envelope + heart card + floral sprig illustration with sparse coral hearts and no baked-in UI copy.

- [ ] **Step 4: Optimize and verify dimensions**

Use WebP, sized to avoid visible blur at 430px CSS width and small enough for fast mobile load. Verify no text artifacts.

- [ ] **Step 5: Commit assets**

Commit message: `feat(date-invite): add reference-matched visual assets`

---

### Task 2: State Model and Dynamic Date Options

**Files:**
- Modify: `date-invite/public/js/invite.js`
- Create: `date-invite/public/js/date-options.js`
- Test: `date-invite/test/invite.test.js`
- Test: `date-invite/test/date-options.test.js`

**Interfaces:**
- Produces `initialState()`, `transition(state, event)`, `createResponseText(answer, config)`.
- Produces `buildQuickDates(now)`, `formatDateLabel(date)`, `createAlternateDateText(date)`.
- `app.js` consumes these functions in Task 4.

- [ ] **Step 1: Write failing state tests**

Pin transitions:
- initial state = `invitation`
- `YES` → `success`
- `LATER` → `date_picker`
- `BACK` from picker → `invitation`
- invalid/repeated events do not move state
- accepted response text remains exact

- [ ] **Step 2: Run state tests and verify RED**

Run: `node --test date-invite/test/invite.test.js`
Expected: FAIL because current state names/transition contract are old.

- [ ] **Step 3: Implement minimal new state model**

Replace sealed/letter/choice/result state machine with the three states from the spec.

- [ ] **Step 4: Run state tests and verify GREEN**

Expected: PASS.

- [ ] **Step 5: Write failing date-option tests**

Assert:
- exactly four upcoming options
- month/year rollover works
- Russian weekday/day/month labels are stable
- custom/selected date text format is `Давай выберем другой день 🙂 Мне подходит {day} {month}.`

- [ ] **Step 6: Run date-option tests and verify RED**

Expected: FAIL because module does not exist.

- [ ] **Step 7: Implement `date-options.js`**

Use visitor-local calendar dates and deterministic Russian label formatting. No external date library.

- [ ] **Step 8: Run date-option tests and verify GREEN**

Expected: PASS.

- [ ] **Step 9: Commit**

Commit message: `feat(date-invite): add reference flow and date selection model`

---

### Task 3: Reference-Matched Markup and Styling

**Files:**
- Replace: `date-invite/public/index.html`
- Replace: `date-invite/public/styles.css`
- Test: `date-invite/test/static.test.js`

**Interfaces:**
- DOM hooks required by Task 4:
  - `[data-screen="invitation"]`
  - `[data-screen="date_picker"]`
  - `[data-screen="success"]`
  - `#yes-button`
  - `#later-button`
  - `#date-back`
  - `#quick-dates`
  - `#custom-date`
  - `#date-continue`
  - `#send-response`
  - `#response-preview`

- [ ] **Step 1: Write failing static-contract tests**

Assert exact required copy, required three screens, asset references, required controls, `noindex,nofollow`, semantic buttons and absence of the old envelope/letter UI.

- [ ] **Step 2: Run static test and verify RED**

Expected: FAIL against current markup.

- [ ] **Step 3: Replace HTML structure**

Implement the three screens only, preserving accessibility labels and safe-area behavior.

- [ ] **Step 4: Replace CSS with design tokens and reference geometry**

Implement:
- 430px centered mobile canvas on desktop
- hero as full-bleed visual
- reference-like top typography placement
- cream bottom question card with 64px heart tab
- 72px primary/secondary buttons
- reference-like date cards
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

### Task 4: Wire Interaction and Telegram Date Flow

**Files:**
- Replace: `date-invite/public/js/app.js`
- Keep/modify only if needed: `date-invite/public/js/delivery.js`
- Test: `date-invite/test/delivery.test.js`
- Test: `date-invite/test/app-contract.test.js`

**Interfaces:**
- Uses state functions from Task 2.
- Uses date-option functions from Task 2.
- Uses `buildTelegramUrl(text, username)` / `deliverResponse(text, location)` from `delivery.js`.

- [ ] **Step 1: Write failing interaction-contract tests**

Pin:
- YES renders success and exact response preview
- LATER renders date picker
- selecting a quick date updates selected state
- custom date overrides quick selection
- date continue builds Telegram text for chosen date
- success send builds Telegram text for accepted response

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL against current `app.js`.

- [ ] **Step 3: Implement interaction wiring**

Keep DOM update logic small; no framework. Preserve direct navigation to the Telegram URL only on explicit CTA clicks.

- [ ] **Step 4: Run tests and verify GREEN**

Expected: PASS.

- [ ] **Step 5: Verify Telegram encoding regression**

Run delivery tests for Cyrillic + emoji and both message variants.

- [ ] **Step 6: Commit**

Commit message: `feat(date-invite): wire Telegram date and success flows`

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

Verify all HTML/CSS/JS/assets exist and expected copy/hooks are present.

- [ ] **Step 3: Push final commits to `date-invite`**

Render auto-deploy is enabled; do not manually trigger a redundant deploy.

- [ ] **Step 4: Wait for Render deploy status `live`**

Confirm deployed commit matches the branch head.

- [ ] **Step 5: Live functional smoke**

Browser-test:
- YES → success → Telegram `@DanilVlasenk` with exact accepted text, do not send
- LATER → quick date → Telegram with chosen date, do not send
- LATER → custom date → Telegram with custom date, do not send
- BACK → invitation

- [ ] **Step 6: Live visual pixel review**

At 390px first, compare against reference for:
- hero crop
- headline coordinates
- question-card top edge and heart tab
- button heights/widths/radii
- date illustration/card spacing
- success illustration/text/CTA spacing

Then verify 320 / 360 / 412 / 430px for responsive integrity.

- [ ] **Step 7: Defect handling**

For any visual or functional failure: prove the root cause, apply the minimal fix, rerun targeted verification, then rerun full regression and live smoke.

- [ ] **Step 8: Final acceptance report**

Report branch/head, tests, Render deploy ID/status, live URL, and any known visual deltas from the approved reference.
