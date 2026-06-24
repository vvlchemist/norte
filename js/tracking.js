/**
 * tracking.js — Attribution + lightweight funnel analytics.
 * -------------------------------------------------------------
 * Two responsibilities:
 *  1. Parse UTM / ?source= params on load and keep them for the session
 *     so they ride along into the lead submission payload.
 *  2. Expose trackEvent() for willingness signals (CTA clicks, reaching
 *     results, "quiero invertir" clicks) so we can measure drop-off per
 *     source. Events are sent to the same backend, tagged type:'event'.
 *
 * NOTE: sessionStorage here is ONLY a within-session convenience cache for
 * attribution + a half-finished form. It is never the system of record —
 * the Google Sheet is. See README.
 */

import { CONFIG } from './config.js';

const STORAGE_KEY = 'norte.session.v1';

/* ----------------------------------------------------------------
 * Attribution
 * ---------------------------------------------------------------- */

/**
 * Read UTM + fallback attribution params from the current URL.
 * Falls back to a friendly ?source= param for channels (WhatsApp groups,
 * IG bios) where building full UTMs is awkward.
 */
export function parseAttribution() {
  const params = new URLSearchParams(window.location.search);
  const get = (k) => (params.get(k) || '').slice(0, 120); // bound length

  const source = get('utm_source') || get('source');
  const medium = get('utm_medium') || (get('source') ? 'referral' : '');

  return {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: get('utm_campaign'),
    referrer: (document.referrer || '').slice(0, 200),
    idioma: CONFIG.product.locale,
    user_agent: (navigator.userAgent || '').slice(0, 300),
  };
}

/* ----------------------------------------------------------------
 * Session cache (attribution + partial form)
 * ---------------------------------------------------------------- */

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeSession(patch) {
  try {
    const next = { ...readSession(), ...patch };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return patch; // storage may be unavailable (private mode); non-fatal
  }
}

/** Module-level attribution, captured once on init. */
let attribution = {};

/** Initialise tracking: capture attribution and stash it for the session. */
export function initTracking() {
  const existing = readSession().attribution;
  // Prefer the first-touch attribution within the session.
  attribution = existing && existing.utm_source ? existing : parseAttribution();
  writeSession({ attribution });
  loadAnalytics();
  return attribution;
}

export function getAttribution() {
  return { ...attribution };
}

/** Persist a partial form so a refresh mid-flow doesn't lose progress. */
export function saveDraft(draft) {
  writeSession({ draft });
}

export function loadDraft() {
  return readSession().draft || null;
}

export function clearDraft() {
  writeSession({ draft: null });
}

/* ----------------------------------------------------------------
 * Optional privacy-friendly analytics (config-gated)
 * ---------------------------------------------------------------- */

function loadAnalytics() {
  const a = CONFIG.features.analytics;
  if (!a || a.provider === 'none' || !a.id) return;

  if (a.provider === 'cloudflare') {
    const s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: a.id }));
    document.head.appendChild(s);
  } else if (a.provider === 'ga4') {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(a.id)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', a.id, { anonymize_ip: true });
  }
}
