# Date Invite Pixel Redesign — Design Spec

## Status
APPROVED DESIGN INPUT. The visual reference supplied by the owner and the approved JSON in chat are the source of truth for this redesign.

## Goal
Rebuild the existing Date Invite mobile site to match the approved warm romantic sunset reference as closely as practical while preserving the existing direct Telegram delivery to `@DanilVlasenk`.

## Scope
Three product states:
1. Invitation hero + question card.
2. Alternate-date picker.
3. Positive confirmation + Telegram send.

No backend, database, auth, analytics, cookies, or tracking.

## Source of Truth Priority
1. Approved visual reference image (941×1672, ~9:16).
2. Approved JSON design spec from owner.
3. Existing functional Telegram behavior.
4. Existing implementation only where it does not conflict with 1–3.

## Visual Direction
- Warm romantic sunset.
- Peach/blush/cream palette.
- Cozy terrace at golden hour.
- Rounded cards and buttons.
- Hand-drawn coral heart accents used sparingly.
- Modern, soft, romantic, slightly playful.
- Avoid noir, dark luxury, neon, corporate white UI, heavy borders.

## Mobile Geometry
- Primary design viewport: 390px wide, min-height 800px.
- Supported review widths: 320 / 360 / 390 / 412 / 430px.
- Desktop: centered mobile canvas, max width 430px, peach background.
- No horizontal scroll or layout shift.

## Design Tokens
### Colors
- page background: `#FCDCCE`
- primary surface: `#FFF5F0`
- secondary surface: `#FDECE4`
- soft surface: `#FBE2D8`
- text primary: `#553427`
- text secondary: `#76564C`
- text muted: `#A98578`
- accent: `#F36F68`
- accent hover: `#EE625E`
- accent soft: `#FDA99A`
- accent pale: `#FFD4CA`
- border: `#EDC7BA`
- white: `#FFFFFF`

### Gradients
- primary button: `linear-gradient(135deg, #FA8175 0%, #F05F61 100%)`
- page: `linear-gradient(180deg, #FDE7DD 0%, #FAD7C9 100%)`

### Radius
- screen 34px
- large card 30px
- card 22px
- button 20px
- pill 16px

### Shadows
- card `0 18px 48px rgba(108, 60, 43, 0.10)`
- button `0 10px 24px rgba(238, 97, 94, 0.22)`
- floating `0 14px 35px rgba(90, 49, 34, 0.12)`

## Typography
Display preference: Caveat / Marck Script / handwritten rounded fallback.
Body preference: Manrope / Nunito Sans / system sans-serif.

- headline: 44px mobile, line-height 1.08, weight ~650
- section title: 28px, line-height 1.15
- body large: 20px / 1.45
- body: 16px / 1.5
- eyebrow: 11px, letter-spacing .30em, uppercase
- button: 19px / 600

No font files may be distributed. Use web-safe or remote CSS font imports only if the runtime remains dependency-free; otherwise use system fallbacks that preserve metrics as closely as possible.

## Assets
Three clean assets are required, derived visually from the approved reference but without baked-in UI text:

### Hero
Photorealistic warm terrace at sunset with:
- city skyline and water in distance
- string lights
- daisies
- lit candle
- two mugs
- no people
- golden-hour glow

### Date illustration
Soft watercolor/vector hybrid:
- desk calendar
- steaming mug
- small leaves/flowers
- sparse heart doodles

### Success illustration
Soft watercolor/vector hybrid:
- envelope
- heart card
- floral sprig
- sparse heart doodles

These are image assets, not CSS illustrations.

## Screen 1 — Invitation
- Full-bleed hero image.
- Top padding ~52px.
- Eyebrow centered: `ОДНО МАЛЕНЬКОЕ ПРИГЛАШЕНИЕ`.
- Headline centered: `Для тебя\nкое-что есть`.
- Copy centered:
  - `Хочу украсть у суеты один вечер.`
  - `И провести его с тобой.`
- Bottom question card on cream surface with top-only large radius.
- Center overlapping circular heart tab, 64px.
- Question: `Пойдёшь со мной\nна свидание?`.
- Primary button: `Да ❤️`, 72px high, full width, arrow icon.
- Secondary button: `Давай выберем другой день`, 72px high, calendar icon.

## Screen 2 — Date Picker
- Cream background, 24px padding.
- Back button.
- Date illustration near top, approx 190px visual height.
- Title: `Давай выберем\nдругой день?`.
- Subtitle: `Когда тебе будет удобно,\nа я всё красиво придумаю ✨`.
- Four date cards in one row using the reference geometry.
- The literal April dates in the reference are visual sample data only. Production renders the next 4 available calendar dates based on the visitor's local date while preserving width, line breaks, and selected-card styling.
- Selected date uses accent background and white text.
- `Или предложи свой вариант` label.
- Native/custom date input styled like the reference.
- `Продолжить` primary button.
- Continue opens Telegram with the selected date prefilled.

Date message format:
`Давай выберем другой день 🙂 Мне подходит {day} {month}.`

If the custom date input is used, that value replaces the quick-date selection.

## Screen 3 — Success
- Cream background.
- Success illustration approx 300px visual height.
- Title: `Да ❤️\nЯ согласна.`.
- Subtitle: `Посмотрим, что ты придумал 😌`.
- Message preview card with exact text:
  `Да ❤️ Я согласна. Посмотрим, что ты придумал 😌`
- Primary CTA: `Отправить Данилу` with Telegram-style paper-plane icon.
- CTA uses current direct Telegram deep-link to `DanilVlasenk` and prefilled text. No auto-send.

## State Model
Replace the old sealed → letter → choice flow with the reference-driven states:
- `invitation`
- `date_picker`
- `success`

Transitions:
- invitation + YES → success
- invitation + LATER → date_picker
- date_picker + BACK → invitation
- date_picker + CONTINUE → Telegram deeplink with selected date
- success + SEND → Telegram deeplink with accepted-response text

Invalid/repeated events keep current state.

## Motion
- fast: 180ms
- normal: 320ms
- screen: 500ms
- easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- screen transition: opacity 0→1, translateY 16px→0, scale .99→1
- press scale: .98
- sparse heart float: 4px amplitude, 4–7s
- `prefers-reduced-motion` supported

## Implementation Constraints
- Preserve current Render Static Site architecture.
- Preserve `@DanilVlasenk` delivery.
- Do not add backend.
- Do not add new unrelated sections.
- Do not silently rewrite owner-approved copy.
- Maintain `noindex,nofollow`.
- Mobile-first.
- Accessible keyboard focus and semantic buttons.

## Acceptance
### Visual
- Very high similarity to the approved reference.
- Hero crop feels like reference at 390px viewport.
- Card silhouette, spacing, radii, button heights and headline positions match reference closely.
- Review at 320, 360, 390, 412 and 430px.
- No horizontal scroll.
- No layout shift after images load.

### Functional
- YES: invitation → success → Telegram `@DanilVlasenk` with `Да ❤️ Я согласна. Посмотрим, что ты придумал 😌`.
- LATER: invitation → date picker → select quick/custom date → Telegram `@DanilVlasenk` with chosen date.
- Back from date picker returns to invitation.
- No message is sent automatically.
