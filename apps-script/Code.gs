/**
 * Norte — Google Apps Script backend (Code.gs)
 * =====================================================================
 * Free, serverless backend for capturing leads + funnel events into a
 * Google Sheet, and sending an automated confirmation email.
 *
 * It accepts JSON POSTed as text/plain (the frontend does this on purpose
 * so the browser does NOT send a CORS preflight, which Apps Script can't
 * answer). Two payload shapes:
 *   { type:'lead',  ... }   -> appended to the "Leads" sheet + email sent
 *   { type:'event', ... }   -> appended to the "Eventos" sheet (no email)
 *
 * ---------------------------------------------------------------------
 * DEPLOY — STEP BY STEP (do this once; ~5 minutes)
 * ---------------------------------------------------------------------
 * 1.  Go to https://sheets.google.com and create a NEW blank spreadsheet.
 *     Name it e.g. "Norte Leads". You don't need to add any columns —
 *     this script creates the headers automatically.
 * 2.  In that spreadsheet, click  Extensions ▸ Apps Script.
 *     A code editor opens in a new tab.
 * 3.  Delete whatever code is there, then paste THIS ENTIRE FILE.
 * 4.  (Optional) Change CONFIG below — e.g. EMAIL_FROM_NAME.
 * 5.  Click the  Save  (disk) icon.
 * 6.  Click  Deploy ▸ New deployment.
 *       • Click the gear ⚙ next to "Select type" ▸ choose  Web app.
 *       • Description: "Norte v1"
 *       • Execute as:  Me (your@gmail.com)
 *       • Who has access:  Anyone
 *       • Click  Deploy.
 * 7.  Google asks you to authorize. Click  Authorize access ▸ pick your
 *     account ▸ "Advanced" ▸ "Go to <project> (unsafe)" ▸ Allow.
 *     (It says "unsafe" because it's your own unverified script — normal.)
 * 8.  Copy the  Web app URL  (ends in /exec). THIS is your WEBHOOK_URL.
 * 9.  Open the frontend file  js/config.js  and paste it:
 *       WEBHOOK_URL: 'https://script.google.com/macros/s/AKfy.../exec'
 * 10. Done. Submit a test from the site; a row should appear in the Sheet
 *     and you should receive the confirmation email.
 *
 * RE-DEPLOYING AFTER EDITS: Deploy ▸ Manage deployments ▸ edit (pencil) ▸
 * Version: "New version" ▸ Deploy. (The /exec URL stays the same.)
 *
 * UPGRADE PATH WHEN VOLUME GROWS (still free tiers):
 *   • Email/list management: pipe new rows to MailerLite or Brevo (free
 *     tier) via their API for real automations, double opt-in, segments.
 *   • Structured data / no-code app: mirror to Airtable (free) for a
 *     friendlier UI and richer views.
 *   • Gmail send quota: consumer Gmail allows ~500 emails/day. If you
 *     exceed it, move sending to MailerLite/Brevo and keep the Sheet as
 *     the raw capture log.
 * =====================================================================
 */

/* ----------------------------- CONFIG ----------------------------- */
var CONFIG = {
  LEADS_SHEET: 'Leads',
  EVENTS_SHEET: 'Eventos',
  EMAIL_FROM_NAME: 'Norte',
  PRODUCT_NAME: 'Norte',
  CURRENCY_SYMBOL: '$',
  // Set to '' to disable confirmation emails entirely.
  SEND_CONFIRMATION_EMAIL: true,
};

/* Canonical column order for the Leads sheet (matches the data schema). */
var LEAD_HEADERS = [
  'timestamp', 'nombre', 'email', 'edad', 'edad_retiro',
  'ahorro_mensual_usd', 'ahorro_actual_usd', 'rendimiento_supuesto',
  'proyeccion_invertido', 'proyeccion_sin_invertir', 'diferencia',
  'moneda', 'consentimiento',
  'utm_source', 'utm_medium', 'utm_campaign', 'referrer', 'user_agent', 'idioma',
  'email_enviado',
];

/* Core columns for the Eventos sheet; everything else lands in "meta". */
var EVENT_HEADERS = [
  'timestamp', 'event', 'utm_source', 'utm_medium', 'utm_campaign',
  'referrer', 'idioma', 'meta',
];

/* ------------------------------ Entry ----------------------------- */

function doPost(e) {
  try {
    var data = parseBody(e);
    if (!data) return jsonOut({ ok: false, error: 'empty_body' });

    if (data.type === 'event') {
      appendEvent(data);
      return jsonOut({ ok: true, kind: 'event' });
    }

    // Default: treat as a lead.
    var emailSent = handleLead(data);
    return jsonOut({ ok: true, kind: 'lead', email_enviado: emailSent });
  } catch (err) {
    // Log for debugging in the Apps Script "Executions" view.
    console.error('doPost error: ' + (err && err.stack ? err.stack : err));
    return jsonOut({ ok: false, error: String(err) });
  }
}

/* Simple health check so you can open the /exec URL in a browser. */
function doGet() {
  return jsonOut({ ok: true, service: 'norte', ts: new Date().toISOString() });
}

/* ----------------------------- Helpers ---------------------------- */

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    // Fall back to form-encoded just in case.
    if (e.parameter && Object.keys(e.parameter).length) return e.parameter;
    throw new Error('invalid_json');
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  // Create header row if the sheet is empty.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ------------------------------ Leads ----------------------------- */

function handleLead(data) {
  var sheet = getSheet(CONFIG.LEADS_SHEET, LEAD_HEADERS);

  // Try to send the email first so we can record whether it went out.
  var emailSent = false;
  if (CONFIG.SEND_CONFIRMATION_EMAIL && data.email) {
    emailSent = sendConfirmationEmail(data);
  }

  var row = LEAD_HEADERS.map(function (key) {
    if (key === 'email_enviado') return emailSent ? 'sí' : 'no';
    if (key === 'timestamp') return data.timestamp || new Date().toISOString();
    if (key === 'consentimiento') return data.consentimiento ? 'sí' : 'no';
    var v = data[key];
    return (v === undefined || v === null) ? '' : v;
  });

  sheet.appendRow(row);
  return emailSent;
}

/* ------------------------------ Events ---------------------------- */

function appendEvent(data) {
  var sheet = getSheet(CONFIG.EVENTS_SHEET, EVENT_HEADERS);

  // Everything not in the core columns gets stashed as JSON for later.
  var core = { timestamp: 1, event: 1, utm_source: 1, utm_medium: 1, utm_campaign: 1, referrer: 1, idioma: 1, type: 1, user_agent: 1 };
  var meta = {};
  Object.keys(data).forEach(function (k) {
    if (!core[k]) meta[k] = data[k];
  });

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.event || '',
    data.utm_source || '',
    data.utm_medium || '',
    data.utm_campaign || '',
    data.referrer || '',
    data.idioma || '',
    Object.keys(meta).length ? JSON.stringify(meta) : '',
  ]);
}

/* ----------------------- Confirmation email ----------------------- */

function sendConfirmationEmail(data) {
  try {
    var nombre = (data.nombre || '').toString().trim() || 'hola';
    var invertido = money(data.proyeccion_invertido);
    var sinInvertir = money(data.proyeccion_sin_invertir);
    var diferencia = money(data.diferencia);
    var aporte = money(data.ahorro_mensual_usd);
    var years = (Number(data.edad_retiro) - Number(data.edad)) || '';
    var rendimiento = pct(data.rendimiento_supuesto);

    var subject = '🌱 Tu plan de Norte: lo que tu plata podría llegar a ser';

    var html = ''
      + '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#11201a;">'
      + '<div style="background:#11201a;color:#fff;padding:28px 24px;border-radius:16px 16px 0 0;">'
      + '<h1 style="margin:0;font-size:22px;">Hola, ' + escapeHtml(nombre) + ' 👋</h1>'
      + '<p style="margin:8px 0 0;color:#b9c4bd;">Acá está tu proyección. Guardala — es tu punto de partida.</p>'
      + '</div>'
      + '<div style="background:#faf7f0;padding:24px;border-radius:0 0 16px 16px;">'
      + card('Si invertís ' + aporte + ' al mes', invertido, '#12b07a', 'en ~' + years + ' años, con un rendimiento estimado de ' + rendimiento)
      + card('Si solo lo guardás (sin invertir)', sinInvertir, '#828b83', 'la misma plata, sin crecer')
      + '<div style="background:#11201a;color:#fff;padding:18px;border-radius:12px;text-align:center;margin:16px 0;">'
      + '<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#ff7a52;font-weight:bold;">Lo que dejás sobre la mesa</div>'
      + '<div style="font-size:30px;font-weight:bold;margin-top:4px;">' + diferencia + '</div>'
      + '</div>'
      + '<h3 style="margin:20px 0 6px;">Qué sigue</h3>'
      + '<p style="margin:0 0 12px;color:#3c4843;font-size:14px;line-height:1.6;">Estamos construyendo herramientas para que empezar a invertir sea fácil y barato desde Costa Rica. Te vamos avisando — sin fechas inventadas ni promesas vacías. Mientras tanto, podés invertir en un ETF que sigue al S&amp;P 500 a través de un puesto de bolsa regulado por la SUGEVAL.</p>'
      + '<p style="font-size:12px;color:#828b83;line-height:1.6;border-top:1px solid #e3ddd0;padding-top:14px;margin-top:18px;">Esto es una estimación educativa, no asesoría financiera. Invertir implica riesgo, incluida la posible pérdida de capital. Los rendimientos pasados no garantizan resultados futuros.</p>'
      + '<p style="font-size:12px;color:#828b83;">— El equipo de ' + escapeHtml(CONFIG.PRODUCT_NAME) + '</p>'
      + '</div></div>';

    var plain = 'Hola ' + nombre + ',\n\n'
      + 'Tu proyección con Norte:\n'
      + '• Si invertís ' + aporte + '/mes: ' + invertido + ' en ~' + years + ' años (rendimiento estimado ' + rendimiento + ')\n'
      + '• Si solo lo guardás: ' + sinInvertir + '\n'
      + '• Lo que dejás sobre la mesa: ' + diferencia + '\n\n'
      + 'Qué sigue: estamos construyendo herramientas para que empezar a invertir sea fácil y barato desde Costa Rica. Te avisamos.\n\n'
      + 'Esto es una estimación educativa, no asesoría financiera. Invertir implica riesgo.\n\n— Norte';

    MailApp.sendEmail({
      to: data.email,
      subject: subject,
      htmlBody: html,
      body: plain,
      name: CONFIG.EMAIL_FROM_NAME,
    });
    return true;
  } catch (err) {
    // Quota exceeded or invalid address — record the lead anyway.
    console.warn('email failed: ' + err);
    return false;
  }
}

/* email card helper */
function card(label, value, color, sub) {
  return '<div style="background:#fff;border:1px solid #eee5d6;border-radius:12px;padding:16px;margin-bottom:12px;">'
    + '<div style="font-size:13px;color:#3c4843;font-weight:bold;">' + escapeHtml(label) + '</div>'
    + '<div style="font-size:26px;font-weight:bold;color:' + color + ';margin:2px 0;">' + value + '</div>'
    + '<div style="font-size:12px;color:#828b83;">' + escapeHtml(sub) + '</div>'
    + '</div>';
}

/* --------------------------- Formatting --------------------------- */

function money(v) {
  var n = Number(v);
  if (!isFinite(n)) n = 0;
  return CONFIG.CURRENCY_SYMBOL + Math.round(n).toLocaleString('en-US');
}

function pct(v) {
  var n = Number(v);
  if (!isFinite(n)) return '';
  return (Math.round(n * 1000) / 10) + '%';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
