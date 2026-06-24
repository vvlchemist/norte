/**
 * config.js — Single source of truth for Norte.
 * -------------------------------------------------------------
 * Everything that a founder/operator might want to tweak without
 * touching application logic lives here: product identity, financial
 * assumptions, the backend webhook, feature flags and educational links.
 *
 * This file ships to the browser, so it must NOT contain secrets.
 * The WEBHOOK_URL is a public Apps Script endpoint — that's fine and
 * expected; it only accepts writes, never exposes data.
 */

export const CONFIG = {
  /* ----------------------------------------------------------------
   * Product identity
   * ---------------------------------------------------------------- */
  product: {
    name: 'Norte',
    // Short, human description used in <title>, emails, etc.
    tagline: 'Tu futuro financiero, claro y en un minuto.',
    // Default UI locale. Add more locales in js/copy.js to expand.
    locale: 'es',
    // Two-letter ISO country for the v0 launch (used for content framing).
    country: 'CR',
  },

  /* ----------------------------------------------------------------
   * Money / formatting
   * ---------------------------------------------------------------- */
  currency: {
    code: 'USD',
    symbol: '$',
    // Locale used by Intl.NumberFormat for thousands separators.
    // 'en-US' -> $1,234 ; switch to 'es-CR' if you prefer 1.234 grouping.
    numberLocale: 'en-US',
  },

  /* ----------------------------------------------------------------
   * Financial assumptions — change these to re-tune the whole app.
   * Returns are expressed as decimals (0.07 === 7%).
   * ---------------------------------------------------------------- */
  assumptions: {
    // Annual nominal return shown by default on the slider.
    defaultAnnualReturn: 0.07,
    minAnnualReturn: 0.03,
    maxAnnualReturn: 0.10,
    returnStep: 0.005,

    // Retirement age defaults & guardrails.
    defaultRetirementAge: 65,
    minAge: 18,
    maxAge: 75,

    // Monthly contribution slider (in `currency.code`).
    minMonthly: 10,
    maxMonthly: 1000,
    defaultMonthly: 50,
    monthlyStep: 5,

    // "Safe withdrawal" rate for the optional retirement-income estimate.
    // 4% rule => annual income = nestEgg * 0.04 ; monthly = /12.
    withdrawalRate: 0.04,

    // Annuity timing for the contributions formula.
    // 'ordinary' (end of period) matches the spec formula exactly.
    // 'due' (start of period) is slightly more optimistic.
    annuityTiming: 'ordinary',
  },

  /* ----------------------------------------------------------------
   * Backend (Google Apps Script Web App).
   * Paste the /exec URL you get after deploying apps-script/Code.gs.
   * Leave empty during local dev — the app degrades gracefully and
   * tells the user instead of losing their data silently.
   * ---------------------------------------------------------------- */
  WEBHOOK_URL: 'https://script.google.com/macros/s/AKfycbzJqDgw8UKHWJwpyeZIxiRiw_0oQBjwM_nGNyfzONMqjGi4cvsJ7ABKkOwQYXCeCb9gkg/exec',

  /* ----------------------------------------------------------------
   * Feature flags — flip behaviour without code surgery.
   * ---------------------------------------------------------------- */
  features: {
    // Show the optional "ingreso mensual estimado en el retiro" block.
    showRetirementIncome: true,
    // Fire lightweight willingness events (funnel analytics) to the Sheet.
    trackWillingnessEvents: true,
    // Show the educational content / articles section.
    showEducation: true,
    // Privacy-friendly analytics (only loads if id is set below).
    analytics: {
      // 'none' | 'cloudflare' | 'ga4'
      provider: 'none',
      // Cloudflare Web Analytics token, or GA4 measurement id (G-XXXX).
      id: '',
    },
  },

  /* ----------------------------------------------------------------
   * Educational links — NON-AFFILIATED. These are public resources only.
   * Do not add referral/affiliate URLs here; the primary CTA must remain
   * our own early-access list.
   * ---------------------------------------------------------------- */
  links: {
    // Our own early-access waitlist CTA target (anchor or external form).
    earlyAccess: '#plan',
    // Public regulator (SUGEVAL) — educational reference only.
    sugeval: 'https://www.sugeval.fi.cr/',
    // Share helpers.
    shareText:
      '¿Tu plata te va a alcanzar cuando dejes de trabajar? Lo calculé en 1 minuto con Norte 👇',
    // Optional WhatsApp community / share number (leave empty to hide).
    whatsapp: '',
  },

  /* ----------------------------------------------------------------
   * Legal / compliance toggles.
   * ---------------------------------------------------------------- */
  legal: {
    companyName: 'Norte',
    // Year used in the footer.
    year: new Date().getFullYear(),
    // Where the privacy note lives (anchor or external page).
    privacyUrl: '#privacidad',
  },
};

// Convenience: a frozen copy prevents accidental runtime mutation.
Object.freeze(CONFIG);
