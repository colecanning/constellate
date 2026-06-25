# Constellate

Between-visit patient-monitoring for **rheumatology** practices. Constellate instruments the
**treat-to-target (T2T)** loop clinicians run in their heads but don't track between visits:

> Check-in → Care Plan (instance of a Protocol) → Trigger fires → Flag raised into the Action Queue →
> provider takes an Action → recorded as a Disposition → loops.

Early PMF-stage **demo**, anchored on rheumatoid arthritis (RA) with methotrexate (MTX).

## The three pillars

1. **Encoded Plan** — a per-patient Care Plan with target, medication ladder rung, cadence, and
   provider-editable Triggers/Thresholds.
2. **Check-in → RAPID3 engine** — a patient check-in (web or simulated SMS) computes a RAPID3
   disease-activity score and buckets it.
3. **Action Queue** — a prioritized list of **Flags** (not a dashboard of everyone). Each card shows
   the triggering signal + plan context + a suggested Action the provider approves / edits / dismisses.

**Demo narrative:** a week-10 MTX patient reports swelling + fatigue + low fever → the queue surfaces
three flags at top — RAPID3 jumped low→moderate (flare), CBC/LFT labs due this week, and a fever
red-flag on an immunosuppressant — each against the provider's own encoded thresholds.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**, Tailwind v4 + shadcn/ui, deployed on Vercel.
- **Client-side Zustand store** is the live source of truth (`lib/store/`), seeded from mock data
  (`lib/mock/`). State resets on refresh. `app/api/*` route handlers return mock-shaped JSON to show the
  backend contract — they are not authoritative. Supabase is deferred.
- **Pure, unit-tested clinical/engine logic** (`lib/clinical/`, `lib/engine/`), shared by the store and
  the API routes.

All visual decisions come from **`DESIGN.md`** (mapped into `app/globals.css`). See `CLAUDE.md` for the
architecture, glossary, and build phases.

## Commands

```bash
pnpm dev     # run the app (Turbopack)
pnpm test    # Vitest unit tests (lib/**/*.test.ts)
pnpm build   # production build
pnpm lint    # eslint
```

## Try the demo

1. Open `/` → the **Action Queue** (`/console`).
2. Top bar → **Demo → Simulate Maria's flare (SMS)** → she jumps to the top with three flags. Open one,
   approve the suggested action → it resolves and records a Disposition.
3. Top bar → **View as patient** → open a portal, run an in-browser check-in.
