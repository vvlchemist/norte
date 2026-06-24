/**
 * api.js — Talks to the Google Apps Script backend.
 * -------------------------------------------------------------
 * Design constraints:
 *  - We POST with Content-Type: text/plain so the request stays a "simple
 *    request" and the browser does NOT send a CORS preflight (OPTIONS),
 *    which Apps Script web apps don't handle. The Apps Script reads the
 *    raw body and JSON.parse()s it.
 *  - We never lose the user's data silently: submitLead returns a typed
 *    result the UI can use to show success/error/retry, and on network
 *    failure we attempt a best-effort no-cors retry so the row still lands.
 *
 * See apps-script/Code.gs for the matching server.
 */

import { CONFIG } from './config.js';
import { getAttribution } from './tracking.js';

/**
 * @typedef {Object} SubmitResult
 * @property {boolean} ok
 * @property {'success'|'no_webhook'|'network'|'server'} status
 * @property {string} [message]
 */

/**
 * Submit a lead (the email-gate form + computed projection).
 * @param {Object} lead  fields matching the data schema (see README)
 * @returns {Promise<SubmitResult>}
 */
export async function submitLead(lead) {
  if (!CONFIG.WEBHOOK_URL) {
    return { ok: false, status: 'no_webhook' };
  }

  const payload = {
    type: 'lead',
    timestamp: new Date().toISOString(),
    moneda: CONFIG.currency.code,
    ...getAttribution(),
    ...lead,
  };

  try {
    const res = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      // text/plain => simple request => no preflight.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    // Apps Script returns JSON {ok:true}. Some setups return an opaque
    // redirect; treat a 2xx as success even if we can't parse the body.
    if (res.ok) {
      let body = null;
      try { body = await res.json(); } catch { /* opaque/non-JSON is fine */ }
      if (!body || body.ok !== false) {
        return { ok: true, status: 'success' };
      }
      return { ok: false, status: 'server', message: body && body.error };
    }
    return { ok: false, status: 'server' };
  } catch (err) {
    // CORS or network error. Best-effort fire-and-forget so we don't lose
    // the lead, then report a soft failure so the UI can confirm/retry.
    try {
      await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
    } catch { /* ignore */ }
    return { ok: false, status: 'network', message: String(err && err.message || err) };
  }
}

/**
 * Fire a lightweight willingness event (funnel analytics). Fire-and-forget:
 * never blocks the UI and never throws.
 * @param {string} name   e.g. 'cta_calcular', 'results_reached', 'quiero_invertir'
 * @param {Object} [meta] extra small fields (step, monthly, etc.)
 */
export function trackEvent(name, meta = {}) {
  if (!CONFIG.features.trackWillingnessEvents || !CONFIG.WEBHOOK_URL) return;

  const payload = {
    type: 'event',
    event: name,
    timestamp: new Date().toISOString(),
    ...getAttribution(),
    ...meta,
  };

  const body = JSON.stringify(payload);

  // Prefer sendBeacon — survives page navigations and is non-blocking.
  // Beacon sends as text/plain by default with a Blob, avoiding preflight.
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
      const sent = navigator.sendBeacon(CONFIG.WEBHOOK_URL, blob);
      if (sent) return;
    }
  } catch { /* fall through to fetch */ }

  try {
    fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
    }).catch(() => {});
  } catch { /* never throw from analytics */ }
}
