@AGENTS.md

# Constellate

Between-visit patient-monitoring platform for **rheumatology** practices. It instruments the
**treat-to-target (T2T)** loop:

> Check-in → Care Plan (instance of a Protocol) → Trigger fires → Flag raised into the Action Queue →
> provider takes an Action → recorded as a Disposition → loops.

This is an **early PMF-stage demo**, not production. Anchored on **rheumatoid arthritis (RA)** with
**methotrexate (MTX)** as the primary protocol.

## The three pillars
1. **Encoded Plan** — provider sets up a per-patient Care Plan (target, med+dose+start, cadence, editable Triggers/Thresholds).
2. **Check-in → RAPID3 engine** — a patient check-in computes a RAPID3 disease-activity score and buckets it.
3. **Action Queue** — a prioritized list of **Flags** (not a dashboard of everyone); each card shows the triggering signal + plan context + a suggested Action the provider approves / edits / dismisses.

## Hard rules
- **DESIGN.md is the single source of truth for all visual decisions.** Never invent a color, spacing,
  radius, or motion value — port from DESIGN.md (already mapped into `app/globals.css`). DESIGN.md is
  authored under the "Carbon Health" name; that's provenance only — **the product is Constellate**, swap
  any stray product wording.
- **Regulatory posture (clinician-facing, non-device):** flags read *"this patient crossed the threshold
  YOU set"* — never *"this patient should be escalated."* The provider's encoded thresholds do the
  flagging. **No patient-facing medical advice anywhere** (the portal carries none).
- **Use the exact glossary terms** (below) in code — tables, types, vars.

## Architecture
- **Next.js 16 (App Router) + React 19 + TypeScript**, Tailwind v4 + shadcn/ui, deployed on Vercel.
  Next 16 breaking changes apply — see `@AGENTS.md`; `params`/`searchParams` are **Promises** (await them).
- **Client-side Zustand store is the live source of truth** (`lib/store/`), seeded from mock data
  (`lib/mock/`). State resets on refresh. `app/api/*` route handlers exist to show the backend contract
  and return mock-shaped JSON — they are **not** authoritative. (Chosen because server in-memory state is
  unreliable on Vercel serverless.) Supabase is deferred.
- **Clinical/engine logic is pure & unit-tested** (`lib/clinical/`, `lib/engine/`) and callable from both
  the store and the API routes.
- **Persona switcher, no auth:** top bar toggles Provider Console (`/console`) vs. a patient's Portal
  (`/portal/[id]`).

## Glossary (exact terms)
Protocol (template) · Care Plan (per-patient instance) · Enrollment · Check-in · Channel (`sms`|`portal`,
same records) · Patient Portal · Cadence · Measure/Score (e.g. RAPID3) · Threshold (provider-editable
boundary) · Trigger (rule: check-in-driven or time-driven) · Re-engagement · Flag (the card) · Action
Queue (list of Flags) · Severity/Tier (`urgent`|`warning`|`stable`) · Action (closed toolset) ·
Disposition (recorded resolution) · Patient Status (latest Score + ladder rung; ≠ Care Plan).

## Project structure
- `app/` — routes. `console/` (provider), `portal/[id]/` (patient), `api/` (mock contract).
- `components/` — `ui/` (shadcn), plus feature folders (queue, careplan, checkin, shared).
- `lib/types.ts` — every glossary entity. `lib/clinical/` (rapid3, labSchedule), `lib/engine/`
  (evaluateCheckin, evaluateTime, suggestedAction), `lib/mock/` (seed, scenarios), `lib/store/`.

## Commands
- `pnpm dev` — run the app (Turbopack).
- `pnpm test` — Vitest unit tests (`lib/**/*.test.ts`). `pnpm test:watch` to watch.
- `pnpm build` / `pnpm lint`.

## RAPID3 (clinical reference)
Three patient self-report measures only — no labs/joint count. FN (10 ADL items 0–3 → sum 0–30 → **÷3 →
0–10**) + PN (pain VAS 0–10) + PtGl (patient global VAS 0–10) = **0–30**. Buckets: `remission ≤3 · low
>3–6 · moderate >6–12 · high >12`.

## Build phases (update this section each phase)
- [x] **Phase 0** — Scaffold, DESIGN.md tokens in `globals.css`, fonts (Inter + JetBrains Mono),
  shadcn/ui, Vitest, root layout + TopBar shell, CLAUDE.md.
- [x] **Phase 1** — `lib/types.ts` (full glossary), `lib/dates.ts`, `lib/clinical/rapid3.ts` +
  `labSchedule.ts` with 27 passing unit tests.
- [x] **Phase 2** — `lib/mock/` (protocols, seed: hero + 6 supporting → 9 engine-generated flags,
  scenarios), `lib/flags.ts`, `lib/store/useConstellateStore.ts` (Zustand + pure selectors).
- [x] **Phase 3** — `lib/engine/` (evaluateCheckin, evaluateTime, suggestedAction, resolve) +
  `lib/labels.ts`; 47 tests total (clinical + engine + seed narrative).
- [x] **Phase 4** — Provider console: `app/console/` (sidebar + Action Queue split view),
  `components/queue/` (FlagCard, FlagDetail, ActionToolbar), `components/shared/` (SeverityBadge,
  Rapid3Pill, ScoreTrend), `lib/ui.ts` (tone → DESIGN status palette). Verified: flare → 11 flags,
  Maria top with 3; approve resolves + records disposition. Root `/` is a 200 client-redirect (preview
  readiness probe rejects the 307).
- [x] **Phase 5** — Patients list, patient detail (`components/console/patient-detail.tsx`), Care Plan
  editor (`components/careplan/` PlanEditor + ThresholdEditor → `editThresholds`/`updateCarePlan`),
  protocol template view, `components/shared/message-thread.tsx`. Dynamic pages are server components
  that `await params` and render a client child.
- [x] **Phase 6** — Patient Portal (`components/portal/portal-home.tsx`, airy + no medical advice) and
  the in-browser check-in (`checkin-form.tsx`: 10 MDHAQ items + pain/global VAS sliders + symptom chips).
  TopBar is now a persona switcher (console ⇄ portal). Runtime entities are stamped via `demoStamp(asOf,
  seq)` so new flags read "today". Verified: portal check-in with fever → urgent flag in console.
- [x] **Phase 7** — Mock API routes (`app/api/`: protocols, flags, patients, care-plans/[id], POST
  checkins, POST flags/[id]/actions) — illustrative contract via the same seed + engine; not
  authoritative. Pure selectors extracted to `lib/store/selectors.ts` (server-safe, re-exported by the
  store). `app/api/_mock.ts` tags responses `x-constellate-mock`.
- [x] **Phase 8** — TopBar **Demo** menu (Simulate Maria's flare / Run time sweep +7d / Reset) +
  persona switcher, FlagDetail enter motion, README. Production build green (15 routes), 47 tests pass.
  Verified end-to-end in-browser: seed → flare → approve → portal check-in.
