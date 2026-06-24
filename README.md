# Norte 🌱

**Costa Rica–first, Spanish-language fintech top-of-funnel.** Norte gives young
LatAm earners a free, instant, personalized projection of their financial future
and a dead-simple plan — so they understand *why* investing matters and *how* to
start. We capture the lead and own the relationship. **We do not execute trades,
hold funds, or give personalized financial advice.** We are the trusted
top-of-funnel.

> **¿Tu plata te va a alcanzar cuando dejes de trabajar?**
> Descubrílo en 1 minuto — y mirá cómo podrías cambiarlo invirtiendo desde $10 al mes.

---

## What this is (v0)

A **mobile-first static web app** + a **free serverless backend**:

- **Frontend:** plain HTML + CSS + vanilla JS ES modules. No build step. Deploys
  as static files anywhere (GitHub Pages / Cloudflare Pages / Netlify free tier).
  Chart.js is the only runtime dependency, loaded via CDN.
- **Backend:** a single **Google Apps Script** Web App that writes submissions to
  a **Google Sheet** and sends an **automated confirmation email**. $0/month.

Screens: hero → multi-step calculator → animated results ("two futures") →
email gate → thank-you → educational articles.

---

## Project structure

```
NORTE/
├── index.html              # App shell: semantic HTML, i18n hooks, Chart.js CDN
├── css/styles.css          # Design system + every screen
├── js/
│   ├── config.js           # ⭐ Single source of truth (assumptions, WEBHOOK_URL, flags)
│   ├── copy.js             # ALL Spanish strings + t() helper (i18n-ready)
│   ├── calc.js             # Pure financial math + validation + formatting
│   ├── tracking.js         # UTM/?source= capture + willingness-event buffer
│   ├── api.js              # Lead submit + event tracking (text/plain, no preflight)
│   ├── content.js          # Article access + tiny safe Markdown renderer
│   ├── ui.js               # View machine, steps, results, chart, form (only DOM file)
│   └── main.js             # Bootstrap
├── content/articles.js     # 5 starter articles (Gen-Z Spanish)
├── apps-script/Code.gs     # Backend: Sheet + confirmation email (deploy steps inside)
├── README.md
├── ARCHITECTURE.md         # How v0 scales toward accounts, broker handoff, real backend
└── .gitignore
```

**Separation of concerns is intentional:** math, copy, data, and UI never bleed
into each other. Want to change the default return? `config.js`. Reword a button?
`copy.js`. Add an article? `content/articles.js`. None require touching logic.

---

## Run locally

ES modules need to be served over `http://` (not opened as a `file://`). Use any
static server:

```bash
# Python (preinstalled on most machines)
python -m http.server 5173
# then open http://localhost:5173

# …or Node
npx serve .
```

The **calculator works fully offline** — all math runs client-side. Only the
email submission and Chart.js (CDN) need the network.

---

## Configure the backend (one-time, ~5 min)

The full idiot-proof guide lives at the top of [`apps-script/Code.gs`](apps-script/Code.gs).
Short version:

1. Create a blank Google Sheet.
2. In it: **Extensions ▸ Apps Script**. Paste all of `Code.gs`. Save.
3. **Deploy ▸ New deployment ▸ Web app**, *Execute as: Me*, *Who has access:
   Anyone*. Authorize.
4. Copy the **`/exec` Web app URL**.
5. Paste it into `js/config.js`:
   ```js
   WEBHOOK_URL: 'https://script.google.com/macros/s/AKfy.../exec',
   ```
6. Submit a test. A row appears in the Sheet; you get the confirmation email.

> The `WEBHOOK_URL` is **not a secret** — it only accepts writes. It's fine to
> commit it. Until it's set, the app degrades gracefully and tells the user
> instead of silently losing their data.

---

## Deploy the frontend (pick one, all free)

**GitHub Pages**
```bash
git init && git add . && git commit -m "Norte v0"
# push to a GitHub repo, then: Settings ▸ Pages ▸ Deploy from branch ▸ main / root
```

**Cloudflare Pages** — connect the repo, *Build command:* (none),
*Output dir:* `/`. Also gives you free privacy-friendly Web Analytics (see below).

**Netlify** — drag-and-drop the folder onto app.netlify.com, or connect the repo
with no build command and publish directory `.`.

---

## Data schema (one row per submission)

Written to the **Leads** sheet, in this order:

| field | meaning |
|---|---|
| `timestamp` | ISO time of submission |
| `nombre` | name |
| `email` | email |
| `edad` | current age |
| `edad_retiro` | retirement age |
| `ahorro_mensual_usd` | monthly contribution (USD) |
| `ahorro_actual_usd` | current savings (USD) |
| `rendimiento_supuesto` | assumed annual return (decimal, e.g. `0.07`) |
| `proyeccion_invertido` | projected invested total |
| `proyeccion_sin_invertir` | projected not-invested total |
| `diferencia` | difference (cost of inaction) |
| `moneda` | currency code |
| `consentimiento` | consent (sí/no) |
| `utm_source` / `utm_medium` / `utm_campaign` | attribution |
| `referrer` | document referrer |
| `user_agent` | browser UA |
| `idioma` | UI locale |
| `email_enviado` | whether the confirmation email sent (sí/no) |

**Willingness events** go to a second **Eventos** sheet: `cta_calcular`,
`calc_started`, `results_reached`, `plan_cta_submit`, `lead_submitted`,
`article_open`, `share_click`, etc., each with attribution + a JSON `meta`
column. This lets you measure funnel drop-off per traffic source.

> The Google Sheet is the **system of record.** `sessionStorage` is used only to
> remember a half-finished form within a session — never as the source of truth.

---

## How to change things

| You want to… | Edit |
|---|---|
| Change default return / withdrawal rate / age limits / slider ranges | `js/config.js → assumptions` |
| Point at your backend | `js/config.js → WEBHOOK_URL` |
| Turn analytics / retirement-income / education on/off | `js/config.js → features` |
| Reword any UI text | `js/copy.js` |
| Add / translate a language | duplicate the `es` object in `js/copy.js`, set `CONFIG.product.locale` |
| Add an article | append an object to `content/articles.js` |
| Change colors / type | `css/styles.css → :root` tokens |
| Change the email | `apps-script/Code.gs → sendConfirmationEmail` |

---

## Tracking & attribution

- UTM params (`utm_source/medium/campaign`) are read on load and carried through
  to the submission. A friendly `?source=` fallback exists for channels (WhatsApp
  groups, IG bios) where full UTMs are awkward.
- **Optional** privacy-friendly analytics are config-gated and off by default:
  set `features.analytics.provider` to `'cloudflare'` or `'ga4'` and supply an
  `id`. With `'none'`, nothing third-party loads.

---

## Compliance & honesty (by design)

- A persistent disclaimer is always visible: *"Esto es una estimación educativa,
  no asesoría financiera…"*
- Results show **risk**, not only upside, and the return assumption is a **slider**
  the user controls — it's an estimate, never a promise.
- "Where to invest" content is **educational and non-affiliated**: it points to
  regulated SUGEVAL puestos de bolsa as a category and to our own early-access
  list. **No fabricated partnerships, referrals, or affiliate links.**
- No trading, custody, KYC, or personalized advice anywhere in this codebase.

---

## Upgrade path (when volume grows — still free tiers first)

See [`ARCHITECTURE.md`](ARCHITECTURE.md). In short: keep the Sheet as the raw
capture log and add MailerLite/Brevo (free) for real list automations, or Airtable
(free) for a friendlier data UI — then graduate to a real backend + accounts +
regulated broker handoff when there's demand to justify it.

---

## License & status

v0 / pre-launch foundation. Built to be extended, not thrown away.
Educational tool — **not** a broker, custodian, or financial advisor.
