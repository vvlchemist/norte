# ARCHITECTURE.md — how Norte v0 is built to scale

This document explains the **intentional** shape of the v0 so a future engineer
can extend it toward a real regional platform without a rewrite. The v0 is a
seed, not a throwaway.

---

## 1. Guiding principles

1. **Config-driven.** Anything an operator tunes lives in `js/config.js`. Logic
   reads config; logic never hard-codes assumptions.
2. **Strict layering.** Each concern is one module with a narrow contract:
   - `calc.js` — **pure** math (no DOM, no I/O). Deterministic, unit-testable.
   - `copy.js` — all strings, keyed, with `t()`. Swappable per locale.
   - `tracking.js` — attribution + session draft + analytics loader.
   - `api.js` — the **only** module that knows the backend wire format.
   - `content.js` + `content/articles.js` — content source + renderer.
   - `ui.js` — the **only** module that touches the DOM (view machine).
   - `main.js` — bootstrap/wiring.
3. **The boundary is the payload.** The frontend and backend agree on a JSON
   shape (the data schema), nothing more. Either side can be replaced as long as
   the contract holds — that's the seam we grow along.
4. **Honesty/compliance are features**, encoded in copy + UI (slider, disclaimers,
   non-affiliation), not bolted on.

```
┌────────── Browser (static) ──────────┐        ┌──── Free backend ────┐
│  ui.js ──uses──▶ calc.js (pure)       │        │  Apps Script doPost  │
│   │               copy.js / content   │  JSON  │   ├─ Leads sheet     │
│   └──uses──▶ api.js ──────────────────┼───────▶│   ├─ Eventos sheet   │
│              tracking.js (UTM/draft)  │ text/  │   └─ MailApp email   │
└───────────────────────────────────────┘ plain └──────────────────────┘
```

---

## 2. Why these technology choices

- **No framework / no build.** Maximizes deploy targets (any static host),
  minimizes the maintenance surface for a solo founder, and keeps load fast on
  the phones that dominate the audience. ES modules give clean separation without
  a bundler. If/when complexity warrants it, a trivial Vite step can wrap the same
  files with zero rewrites (the modules are already standards-compliant ESM).
- **Apps Script + Sheet.** True $0, no servers, fully automated capture + email,
  and a spreadsheet a non-engineer founder can actually read. It's deliberately a
  **replaceable adapter** behind `api.js`.
- **Chart.js via CDN.** One dependency, lazy, and the app degrades gracefully if
  it fails to load (the SVG "two futures" still tells the story).

---

## 3. The seams we grow along

### Seam A — Backend (`api.js` ⇆ `CONFIG.WEBHOOK_URL`)
Today: POST JSON to Apps Script. Tomorrow: point `WEBHOOK_URL` at a real API
(Cloudflare Workers, Supabase Edge Functions, a Node/Go service). **No frontend
changes** beyond the URL if the new endpoint accepts the same payload. Migration
plan:
1. Stand up the new endpoint accepting the existing schema → dual-write to Sheet
   + DB.
2. Cut `WEBHOOK_URL` over. 3. Decommission the Sheet write when confident.

### Seam B — Identity & saved plans
The calculator state (`state.inputs` in `ui.js`) and the lead payload are already
a complete "plan." To add **accounts + saved plans**:
- Introduce an `auth.js` module (magic-link or OAuth) and a `plans.js` that
  persists `state.inputs` server-side keyed by user.
- `ui.js` reads/writes through `plans.js` instead of `sessionStorage` draft.
- Nothing in `calc.js` changes — projections are recomputed from saved inputs.

### Seam C — Broker handoff / referral (when a regulated option exists)
Today the primary CTA is **our own early-access list** and education is
**non-affiliated** (compliance requirement). When a regulated, integrated option
exists:
- Add a `partners` config block (regulated entity, disclosures, deep-link).
- Add a post-signup step in `ui.js` that hands off (referral link or, later, an
  embedded regulated flow). Keep all disclosures in `copy.js`.
- **Never** simulate a partnership before it's real and disclosed.

### Seam D — Multi-country / multi-language
`copy.js` is already locale-keyed and `config.js` carries `country` + `currency`.
To launch a new market:
- Add a locale object in `copy.js`, country-specific assumptions/links in
  `config.js`, and (optionally) country-scoped articles.
- Pension framing (IVM today) becomes a per-country content variable. The math is
  country-agnostic; only copy, currency, and regulator references change.

### Seam E — Content engine
Articles are a data array today (`content/articles.js`) rendered by a tiny safe
Markdown renderer. Swap the loader in `content.js` to fetch `.md`/`.json` files or
a headless CMS without touching the UI. SEO upgrade path: pre-render article
routes at build time (the trivial Vite step) for crawlability.

---

## 4. Data & analytics evolution

- **Now:** Sheet = system of record; Eventos tab = funnel telemetry; optional
  privacy-friendly web analytics (config-gated).
- **Next (free):** mirror rows to MailerLite/Brevo for real list automations and
  to Airtable for a friendlier ops UI.
- **Later:** a warehouse (BigQuery free tier) fed from the API for cohort/funnel
  analysis per acquisition channel — the `utm_*` fields are captured from day one
  precisely to enable this.

---

## 5. What we deliberately did NOT build (and why)

- **No trading, custody, fund movement, KYC.** Out of scope and regulated; we are
  top-of-funnel only.
- **No simulated partnerships.** Compliance + trust.
- **No paid dependencies / servers.** $0 constraint; also keeps the v0 honest
  about what it is.
- **No localStorage as source of truth.** Avoids a false sense of data durability;
  the Sheet/API is authoritative.

---

## 6. Testing & quality notes

- `calc.js` is pure and the natural first target for unit tests (Vitest/Jest):
  feed inputs, assert `invested`, `notInvested`, `difference`, and the `r === 0`
  linear guard. No DOM needed.
- The Markdown renderer in `content.js` escapes HTML before formatting — safe even
  if content later comes from an external source.
- Accessibility is a foundation requirement: semantic landmarks, labelled inputs,
  visible focus, `aria-live` errors, AA contrast, and `prefers-reduced-motion`
  fallbacks for every animation.
