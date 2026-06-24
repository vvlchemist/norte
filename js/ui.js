/**
 * ui.js — The view layer & app state machine.
 * -------------------------------------------------------------
 * Owns: view switching, the multi-step calculator, the animated results
 * ("two futures"), the Chart.js line chart, the email-gate form, the
 * thank-you state and the educational content views.
 *
 * Keeps math in calc.js, strings in copy.js, network in api.js. This file
 * is the only one that touches the DOM.
 */

import { CONFIG } from './config.js';
import { t } from './copy.js';
import { project, validateInputs, formatMoney, formatPercent } from './calc.js';
import { submitLead, trackEvent } from './api.js';
import { getArticles, getArticle, renderMarkdown } from './content.js';
import { saveDraft, loadDraft, clearDraft } from './tracking.js';

/* ----------------------------------------------------------------
 * Tiny DOM helpers
 * ---------------------------------------------------------------- */

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * Hyperscript-ish element factory.
 * el('button', {class:'btn', onClick:fn, 'data-x':'1'}, 'Label' | [nodes])
 */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset') {
      Object.assign(node.dataset, v);
    } else {
      node.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function cssVar(name, fallback = '') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/* ----------------------------------------------------------------
 * App state
 * ---------------------------------------------------------------- */

const A = CONFIG.assumptions;

const state = {
  view: 'hero',
  step: 0,
  inputs: {
    currentAge: null,
    retirementAge: A.defaultRetirementAge,
    monthly: A.defaultMonthly,
    currentSavings: 0,
    annualReturn: A.defaultAnnualReturn,
  },
  projection: null,
};

let chartInstance = null;
let calcStartedFired = false;

/* ----------------------------------------------------------------
 * Calculator step definitions (one question per screen)
 * ---------------------------------------------------------------- */

const STEPS = [
  { key: 'currentAge',    type: 'number',        copy: 'calc.edad',        min: A.minAge,     max: A.maxAge },
  { key: 'retirementAge', type: 'number',        copy: 'calc.edadRetiro',  min: A.minAge,     max: A.maxAge },
  { key: 'monthly',       type: 'slider-money',  copy: 'calc.aporte',      min: A.minMonthly, max: A.maxMonthly, step: A.monthlyStep },
  { key: 'currentSavings',type: 'money-input',   copy: 'calc.ahorro',      min: 0,            optional: true },
  { key: 'annualReturn',  type: 'slider-percent',copy: 'calc.rendimiento', min: A.minAnnualReturn, max: A.maxAnnualReturn, step: A.returnStep },
];

/* ================================================================
 * View switching
 * ================================================================ */

function showView(name) {
  state.view = name;
  qsa('[data-view]').forEach((sec) => {
    const active = sec.dataset.view === name;
    sec.hidden = !active;
    sec.classList.toggle('view--active', active);
  });
  // Move focus to the view's main heading for screen readers / keyboard.
  const heading = qs(`[data-view="${name}"] [data-focus]`) || qs(`[data-view="${name}"] h1, [data-view="${name}"] h2`);
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/* ================================================================
 * Static i18n hydration ([data-i18n] / [data-i18n-attr])
 * ================================================================ */

function applyStaticI18n() {
  qsa('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  // data-i18n-attr="aria-label:a11y.menu;placeholder:form.email"
  qsa('[data-i18n-attr]').forEach((node) => {
    node.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) node.setAttribute(attr, t(key));
    });
  });
  // Footer year etc.
  qsa('[data-i18n-tpl]').forEach((node) => {
    node.textContent = t(node.dataset.i18nTpl, { year: CONFIG.legal.year });
  });
}

/* ================================================================
 * Calculator
 * ================================================================ */

function startCalculator() {
  state.step = 0;
  if (!calcStartedFired) {
    trackEvent('calc_started');
    calcStartedFired = true;
  }
  showView('calc');
  renderStep();
}

function renderStep() {
  const stage = qs('#calc-stage');
  stage.innerHTML = '';
  const def = STEPS[state.step];
  const total = STEPS.length;

  // Progress
  const progressPct = Math.round(((state.step) / total) * 100);
  const progress = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(state.step + 1) }, [
    el('div', { class: 'progress__bar' }, [
      el('span', { class: 'progress__fill', style: `width:${Math.max(8, progressPct + 100 / total)}%` }),
    ]),
    el('p', { class: 'progress__label', text: t('calc.progress', { n: state.step + 1, total }) }),
  ]);

  // Question card
  const card = el('div', { class: 'qcard', key: def.key });
  const titleRow = el('div', { class: 'qcard__head' }, [
    el('h2', { class: 'qcard__title', 'data-focus': true, text: t(`${def.copy}.title`) }),
    def.optional ? el('span', { class: 'pill', text: t(`${def.copy}.optional`) }) : null,
  ]);
  card.append(titleRow);

  const fieldId = `field-${def.key}`;
  const control = renderControl(def, fieldId);
  card.append(control.node);

  card.append(el('p', { class: 'qcard__help', id: `${fieldId}-help`, text: t(`${def.copy}.help`) }));

  if (def.key === 'annualReturn') {
    card.append(el('p', { class: 'qcard__warn', text: t('calc.rendimiento.warning') }));
  }

  const error = el('p', { class: 'qcard__error', id: `${fieldId}-error`, role: 'alert', 'aria-live': 'assertive' });
  card.append(error);

  // Nav
  const isLast = state.step === total - 1;
  const nav = el('div', { class: 'qcard__nav' }, [
    state.step > 0
      ? el('button', { class: 'btn btn--ghost', type: 'button', onClick: goBack, text: t('calc.back') })
      : el('span'),
    el('button', {
      class: 'btn btn--primary',
      type: 'button',
      onClick: () => goNext(control, error, fieldId),
      text: isLast ? t('calc.seeResults') : t('calc.next'),
    }),
  ]);
  card.append(nav);

  stage.append(progress, card);

  // Focus the input and support Enter-to-advance.
  const focusable = control.input || qs('input', card);
  if (focusable) {
    if (def.key !== 'currentSavings') focusable.focus({ preventScroll: true });
    focusable.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goNext(control, error, fieldId);
      }
    });
  }
}

/** Build the input control for a step; returns { node, input, getValue }. */
function renderControl(def, fieldId) {
  const current = state.inputs[def.key];

  if (def.type === 'number') {
    const input = el('input', {
      class: 'field__input field__input--number',
      id: fieldId,
      type: 'number',
      inputmode: 'numeric',
      min: def.min,
      max: def.max,
      value: current ?? '',
      'aria-describedby': `${fieldId}-help ${fieldId}-error`,
      autocomplete: 'off',
    });
    const node = el('div', { class: 'field field--inline' }, [
      input,
      el('span', { class: 'field__suffix', text: t(`${def.copy}.suffix`) }),
    ]);
    return { node, input, getValue: () => numberOrNaN(input.value) };
  }

  if (def.type === 'money-input') {
    const input = el('input', {
      class: 'field__input field__input--money',
      id: fieldId,
      type: 'number',
      inputmode: 'numeric',
      min: def.min,
      step: '10',
      value: current ?? 0,
      'aria-describedby': `${fieldId}-help ${fieldId}-error`,
      autocomplete: 'off',
    });
    const node = el('div', { class: 'field field--money' }, [
      el('span', { class: 'field__prefix', text: CONFIG.currency.symbol }),
      input,
    ]);
    return { node, input, getValue: () => numberOrNaN(input.value) };
  }

  if (def.type === 'slider-money') {
    const valueLabel = el('output', { class: 'slider__value', for: fieldId, text: formatMoney(current) });
    const numberInput = el('input', {
      class: 'slider__number',
      type: 'number',
      'aria-label': t(`${def.copy}.title`),
      min: def.min, max: def.max, step: def.step, value: current,
    });
    const range = el('input', {
      class: 'slider__range',
      id: fieldId,
      type: 'range',
      min: def.min, max: def.max, step: def.step, value: current,
      'aria-describedby': `${fieldId}-help`,
    });
    const sync = (v) => {
      const n = clamp(Number(v), def.min, def.max);
      range.value = n;
      numberInput.value = n;
      valueLabel.textContent = formatMoney(n);
      setSliderFill(range);
    };
    range.addEventListener('input', () => sync(range.value));
    numberInput.addEventListener('input', () => sync(numberInput.value));
    const node = el('div', { class: 'slider' }, [
      el('div', { class: 'slider__top' }, [
        valueLabel,
        el('div', { class: 'slider__num-wrap' }, [
          el('span', { class: 'slider__num-prefix', text: CONFIG.currency.symbol }),
          numberInput,
        ]),
      ]),
      range,
      el('div', { class: 'slider__ends' }, [
        el('span', { text: formatMoney(def.min) }),
        el('span', { text: `${formatMoney(def.max)}+` }),
      ]),
    ]);
    setTimeout(() => setSliderFill(range), 0);
    return { node, input: range, getValue: () => numberOrNaN(range.value) };
  }

  if (def.type === 'slider-percent') {
    const valueLabel = el('output', { class: 'slider__value slider__value--accent', for: fieldId, text: formatPercent(current) });
    const range = el('input', {
      class: 'slider__range',
      id: fieldId,
      type: 'range',
      min: def.min, max: def.max, step: def.step, value: current,
      'aria-describedby': `${fieldId}-help`,
    });
    const sync = () => {
      valueLabel.textContent = formatPercent(Number(range.value));
      setSliderFill(range);
    };
    range.addEventListener('input', sync);
    const node = el('div', { class: 'slider' }, [
      el('div', { class: 'slider__top' }, [
        el('span', { class: 'slider__caption', text: t('calc.rendimiento.label') }),
        valueLabel,
      ]),
      range,
      el('div', { class: 'slider__ends' }, [
        el('span', { text: formatPercent(def.min) }),
        el('span', { text: formatPercent(def.max) }),
      ]),
    ]);
    setTimeout(() => setSliderFill(range), 0);
    return { node, input: range, getValue: () => Number(range.value) };
  }

  return { node: el('div'), input: null, getValue: () => null };
}

/** Paint the filled portion of a range input via a CSS variable. */
function setSliderFill(range) {
  const min = Number(range.min), max = Number(range.max), val = Number(range.value);
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  range.style.setProperty('--fill', `${pct}%`);
}

function goNext(control, errorNode, fieldId) {
  const def = STEPS[state.step];
  const value = control.getValue();

  // Commit value into state, then validate the whole set incrementally.
  state.inputs[def.key] = Number.isNaN(value) ? null : value;

  const fieldError = validateField(def, value);
  if (fieldError) {
    showFieldError(control, errorNode, fieldId, fieldError);
    return;
  }
  clearFieldError(control, errorNode, fieldId);
  saveDraft({ inputs: state.inputs });

  if (state.step === STEPS.length - 1) {
    computeAndShowResults();
  } else {
    state.step += 1;
    renderStep();
  }
}

function goBack() {
  if (state.step === 0) {
    showView('hero');
    return;
  }
  state.step -= 1;
  renderStep();
}

/** Validate a single step's value; returns a resolved message or ''. */
function validateField(def, value) {
  const { minAge, maxAge } = A;
  if (def.key === 'currentAge') {
    if (!Number.isFinite(value) || value < minAge || value > maxAge) {
      return t('errors.ageRange', { min: minAge, max: maxAge });
    }
  }
  if (def.key === 'retirementAge') {
    if (!Number.isFinite(value) || value < minAge || value > maxAge) {
      return t('errors.retirementRange', { min: minAge, max: maxAge });
    }
    if (Number.isFinite(state.inputs.currentAge) && value <= state.inputs.currentAge) {
      return t('errors.retirementAfter');
    }
  }
  if ((def.key === 'currentSavings' || def.key === 'monthly') && (!Number.isFinite(value) || value < 0)) {
    return t('errors.positive');
  }
  return '';
}

function showFieldError(control, errorNode, fieldId, message) {
  errorNode.textContent = message;
  if (control.input) {
    control.input.setAttribute('aria-invalid', 'true');
    control.input.setAttribute('aria-describedby', `${fieldId}-help ${fieldId}-error`);
    control.input.focus();
  }
}

function clearFieldError(control, errorNode) {
  errorNode.textContent = '';
  if (control.input) control.input.removeAttribute('aria-invalid');
}

/* ================================================================
 * Results
 * ================================================================ */

function computeAndShowResults() {
  const { currentAge, retirementAge, monthly, currentSavings, annualReturn } = state.inputs;
  const { valid } = validateInputs({ currentAge, retirementAge, monthly, currentSavings });
  if (!valid) {
    // Shouldn't happen (per-step validation guards it), but be safe.
    state.step = 0;
    renderStep();
    return;
  }

  state.projection = project({ currentAge, retirementAge, monthly, currentSavings, annualReturn });
  trackEvent('results_reached', {
    edad: currentAge,
    aporte: monthly,
    years: state.projection.years,
    rendimiento: annualReturn,
  });

  renderResults();
  showView('results');
  // Animations run after the view is visible.
  requestAnimationFrame(() => animateResults());
}

function renderResults() {
  const stage = qs('#results-stage');
  stage.innerHTML = '';
  const p = state.projection;
  const i = state.inputs;
  const monthlyStr = formatMoney(i.monthly);

  // --- Header
  stage.append(
    el('header', { class: 'results__head' }, [
      el('h1', { class: 'results__title', 'data-focus': true, text: t('results.title') }),
      el('p', { class: 'results__subtitle', text: t('results.subtitle', { monthly: monthlyStr }) }),
    ])
  );

  // --- Signature "two futures" visual
  stage.append(buildTwoFutures(p, i));

  // --- The difference (cost of inaction), big
  stage.append(
    el('div', { class: 'diff' }, [
      el('p', { class: 'diff__label', text: t('results.diffLabel') }),
      el('p', { class: 'diff__value', 'data-countup': String(Math.round(p.difference)) }, formatMoney(0)),
      el('p', { class: 'diff__sub', text: t('results.diffSub') }),
    ])
  );

  // --- Chart
  stage.append(
    el('section', { class: 'chart-card' }, [
      el('h2', { class: 'chart-card__title', text: t('results.chartTitle') }),
      el('div', { class: 'chart-card__canvas-wrap' }, [
        el('canvas', { id: 'growth-chart', role: 'img', 'aria-label': t('a11y.chartAlt'), height: '260' }),
      ]),
    ])
  );

  // --- Plan line
  stage.append(
    el('div', { class: 'plan-line' }, [
      el('p', {
        html: t('results.planLine', {
          monthly: `<strong>${monthlyStr}</strong>`,
          years: `<strong>${p.years}</strong>`,
          invested: `<strong>${formatMoney(p.invested)}</strong>`,
        }),
      }),
    ])
  );

  // --- Risk line
  stage.append(
    el('div', { class: 'note note--risk' }, [
      el('span', { class: 'note__tag', text: t('results.riskLabel') }),
      el('p', { text: t('disclaimer.risk') }),
    ])
  );

  // --- Optional retirement income
  if (CONFIG.features.showRetirementIncome) {
    stage.append(
      el('div', { class: 'income' }, [
        el('p', { class: 'income__label', text: t('results.incomeLabel') }),
        el('p', { class: 'income__value', text: t('results.incomeValue', { income: formatMoney(p.retirementIncome) }) }),
        el('p', { class: 'income__disc', text: t('results.incomeDisclaimer') }),
      ])
    );
  }

  // --- "Where do I invest this?" (non-affiliated, educational)
  stage.append(
    el('section', { class: 'invest' }, [
      el('h2', { class: 'invest__title', text: t('invest.title') }),
      el('p', { text: t('invest.body') }),
      el('p', { class: 'invest__note', text: t('invest.note') }),
      el('a', {
        class: 'link-out', href: CONFIG.links.sugeval, target: '_blank', rel: 'noopener noreferrer',
        onClick: () => trackEvent('invest_info_click'),
        text: t('invest.sugevalCta') + ' ↗',
      }),
    ])
  );

  // --- Email gate (the conversion)
  stage.append(buildForm());

  // --- Recalc
  stage.append(
    el('div', { class: 'results__foot' }, [
      el('button', { class: 'btn btn--ghost', type: 'button', onClick: startCalculator, text: t('results.recalc') }),
    ])
  );
}

/** The animated two-futures cards + divergence SVG. */
function buildTwoFutures(p, i) {
  const wrap = el('section', { class: 'futures' });

  const investedCard = el('div', { class: 'future future--invested' }, [
    el('span', { class: 'future__label', text: t('results.investedLabel') }),
    el('span', { class: 'future__value', 'data-countup': String(Math.round(p.invested)) }, formatMoney(0)),
    el('span', { class: 'future__age', text: t('results.atAge', { age: i.retirementAge }) }),
  ]);

  const notInvestedCard = el('div', { class: 'future future--cash' }, [
    el('span', { class: 'future__label', text: t('results.notInvestedLabel') }),
    el('span', { class: 'future__value', 'data-countup': String(Math.round(p.notInvested)) }, formatMoney(0)),
    el('span', { class: 'future__age', text: t('results.contributedLabel') + ' ' + formatMoney(p.contributed) }),
  ]);

  wrap.append(buildDivergenceSVG(p.series), el('div', { class: 'futures__cards' }, [investedCard, notInvestedCard]));
  return wrap;
}

/** Inline SVG of the two paths diverging — the signature moment. */
function buildDivergenceSVG(series) {
  const W = 320, H = 150, pad = 8;
  const maxVal = Math.max(...series.map((s) => s.invested), 1);
  const n = series.length;
  const x = (idx) => pad + (idx / (n - 1)) * (W - 2 * pad);
  const y = (val) => H - pad - (val / maxVal) * (H - 2 * pad);

  const investedPts = series.map((s, idx) => `${x(idx).toFixed(1)},${y(s.invested).toFixed(1)}`);
  const cashPts = series.map((s, idx) => `${x(idx).toFixed(1)},${y(s.notInvested).toFixed(1)}`);

  // Gap area: invested line forward, cash line back.
  const areaD =
    `M ${investedPts[0]} ` +
    investedPts.slice(1).map((pt) => `L ${pt}`).join(' ') +
    ' ' +
    cashPts.slice().reverse().map((pt) => `L ${pt}`).join(' ') +
    ' Z';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'divergence');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('a11y.chartAlt'));
  svg.setAttribute('preserveAspectRatio', 'none');

  const mk = (tag, attrs) => {
    const e = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  const area = mk('path', { d: areaD, class: 'divergence__gap' });
  const cash = mk('polyline', { points: cashPts.join(' '), class: 'divergence__line divergence__line--cash' });
  const inv = mk('polyline', { points: investedPts.join(' '), class: 'divergence__line divergence__line--invested' });

  svg.append(area, cash, inv);
  return svg;
}

/* ----------------------------------------------------------------
 * Animations
 * ---------------------------------------------------------------- */

function animateResults() {
  renderChart();
  const reduce = prefersReducedMotion();

  // Count-up numbers.
  qsa('[data-countup]').forEach((node) => {
    const to = Number(node.dataset.countup);
    if (reduce) {
      node.textContent = formatMoney(to);
    } else {
      animateCount(node, 0, to, 1100);
    }
  });

  // Draw the divergence lines.
  qsa('.divergence__line').forEach((path, idx) => {
    const len = path.getTotalLength ? path.getTotalLength() : 0;
    if (reduce || !len) {
      path.style.strokeDasharray = 'none';
      return;
    }
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    // Force layout, then transition.
    void path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${idx === 0 ? 0.9 : 1.2}s ease-out`;
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
  });

  const gap = qs('.divergence__gap');
  if (gap && !reduce) {
    gap.style.opacity = '0';
    gap.style.transition = 'opacity 0.8s ease-out 0.6s';
    requestAnimationFrame(() => { gap.style.opacity = ''; });
  }

  // Lift the invested card away from the cash card.
  const investedCard = qs('.future--invested');
  if (investedCard && !reduce) investedCard.classList.add('is-lifting');
}

function animateCount(node, from, to, duration) {
  const start = performance.now();
  const ease = (x) => 1 - Math.pow(1 - x, 3); // easeOutCubic
  function frame(now) {
    const tn = Math.min(1, (now - start) / duration);
    const val = from + (to - from) * ease(tn);
    node.textContent = formatMoney(val);
    if (tn < 1) requestAnimationFrame(frame);
    else node.textContent = formatMoney(to);
  }
  requestAnimationFrame(frame);
}

function renderChart() {
  if (!window.Chart) return; // CDN not loaded (offline) — chart is optional.
  const canvas = qs('#growth-chart');
  if (!canvas) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const p = state.projection;
  const green = cssVar('--c-green', '#10b981');
  const greenSoft = cssVar('--c-green-soft', 'rgba(16,185,129,0.15)');
  const muted = cssVar('--c-muted', '#9aa39c');
  const ink = cssVar('--c-ink', '#13211b');

  chartInstance = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: p.series.map((s) => s.age),
      datasets: [
        {
          label: t('results.chartInvested'),
          data: p.series.map((s) => s.invested),
          borderColor: green,
          backgroundColor: greenSoft,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: t('results.chartNotInvested'),
          data: p.series.map((s) => s.notInvested),
          borderColor: muted,
          borderDash: [6, 6],
          fill: false,
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReducedMotion() ? false : { duration: 900 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: ink, usePointStyle: true, boxWidth: 8, font: { family: 'Inter, sans-serif' } } },
        tooltip: {
          callbacks: {
            title: (items) => `${t('results.chartAxisAge')}: ${items[0].label}`,
            label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: t('results.chartAxisAge'), color: muted },
          ticks: { color: muted, maxTicksLimit: 8 },
          grid: { display: false },
        },
        y: {
          ticks: { color: muted, callback: (v) => formatMoney(v) },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
      },
    },
  });
}

/* ================================================================
 * Email-gate form
 * ================================================================ */

function buildForm() {
  const section = el('section', { class: 'gate', id: 'plan' });
  section.append(
    el('div', { class: 'gate__head' }, [
      el('h2', { class: 'gate__title', text: t('form.title') }),
      el('p', { class: 'gate__subtitle', text: t('form.subtitle') }),
    ])
  );

  const nameInput = el('input', { class: 'field__input', id: 'lead-name', type: 'text', name: 'nombre', autocomplete: 'given-name', placeholder: t('form.namePlaceholder'), 'aria-describedby': 'name-error' });
  const emailInput = el('input', { class: 'field__input', id: 'lead-email', type: 'email', name: 'email', inputmode: 'email', autocomplete: 'email', placeholder: t('form.emailPlaceholder'), 'aria-describedby': 'email-error', required: true });
  const consentInput = el('input', { type: 'checkbox', id: 'lead-consent', name: 'consent' });

  const nameError = el('p', { class: 'field__error', id: 'name-error', role: 'alert' });
  const emailError = el('p', { class: 'field__error', id: 'email-error', role: 'alert' });
  const consentError = el('p', { class: 'field__error', id: 'consent-error', role: 'alert' });
  const formError = el('p', { class: 'field__error field__error--form', role: 'alert', 'aria-live': 'assertive' });

  const submitBtn = el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: t('form.submit') });

  const form = el('form', { class: 'gate__form', novalidate: true }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'lead-name', text: t('form.name') }),
      nameInput, nameError,
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'lead-email', text: t('form.email') }),
      emailInput, emailError,
    ]),
    el('label', { class: 'consent' }, [
      consentInput,
      el('span', { text: t('form.consent') }),
    ]),
    consentError,
    submitBtn,
    formError,
    el('p', { class: 'gate__privacy', text: t('form.privacy') }),
  ]);

  // Prefill from draft if the user came back.
  const draft = loadDraft();
  if (draft && draft.lead) {
    nameInput.value = draft.lead.nombre || '';
    emailInput.value = draft.lead.email || '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit({ form, nameInput, emailInput, consentInput, nameError, emailError, consentError, formError, submitBtn });
  });

  section.append(form);
  // Track when a user reaches/engages the plan CTA region.
  section.querySelector('button[type="submit"]').addEventListener('focus', () => trackEvent('plan_cta_focus'), { once: true });
  return section;
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function handleSubmit(ctx) {
  const { nameInput, emailInput, consentInput, nameError, emailError, consentError, formError, submitBtn } = ctx;
  [nameError, emailError, consentError, formError].forEach((n) => (n.textContent = ''));

  let ok = true;
  if (!nameInput.value.trim()) { nameError.textContent = t('form.errorRequired'); ok = false; }
  if (!isValidEmail(emailInput.value.trim())) { emailError.textContent = t('form.errorEmail'); ok = false; }
  if (!consentInput.checked) { consentError.textContent = t('form.errorConsent'); ok = false; }
  if (!ok) return;

  const p = state.projection;
  const i = state.inputs;
  const lead = {
    nombre: nameInput.value.trim(),
    email: emailInput.value.trim(),
    edad: i.currentAge,
    edad_retiro: i.retirementAge,
    ahorro_mensual_usd: i.monthly,
    ahorro_actual_usd: i.currentSavings,
    rendimiento_supuesto: i.annualReturn,
    proyeccion_invertido: Math.round(p.invested),
    proyeccion_sin_invertir: Math.round(p.notInvested),
    diferencia: Math.round(p.difference),
    consentimiento: true,
  };

  // Persist a draft so nothing is lost if the network hiccups.
  saveDraft({ inputs: state.inputs, lead });

  submitBtn.disabled = true;
  submitBtn.textContent = t('form.submitting');
  trackEvent('plan_cta_submit', { aporte: i.monthly });

  const result = await submitLead(lead);

  submitBtn.disabled = false;
  submitBtn.textContent = t('form.submit');

  if (result.ok) {
    clearDraft();
    trackEvent('lead_submitted', { aporte: i.monthly });
    renderThanks(lead.email);
    showView('thanks');
    return;
  }

  if (result.status === 'no_webhook') {
    // Backend not wired yet: don't pretend it worked.
    formError.textContent = t('form.noWebhook');
    return;
  }

  // network/server: data preserved in draft; offer retry.
  formError.textContent = t('form.errorGeneric');
  submitBtn.textContent = t('form.retry');
}

/* ================================================================
 * Thank-you
 * ================================================================ */

function renderThanks(email) {
  const stage = qs('#thanks-stage');
  stage.innerHTML = '';

  const shareUrl = window.location.origin + window.location.pathname;
  const shareText = CONFIG.links.shareText;

  const shareBtn = el('button', {
    class: 'btn btn--primary',
    type: 'button',
    text: t('thanks.share'),
    onClick: async () => {
      trackEvent('share_click');
      if (navigator.share) {
        try { await navigator.share({ title: CONFIG.product.name, text: shareText, url: shareUrl }); } catch { /* cancelled */ }
      } else {
        try { await navigator.clipboard.writeText(`${shareText} ${shareUrl}`); shareBtn.textContent = '¡Copiado!'; } catch { /* ignore */ }
      }
    },
  });

  const actions = el('div', { class: 'thanks__actions' }, [shareBtn]);

  if (CONFIG.links.whatsapp) {
    const wa = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    actions.append(el('a', { class: 'btn btn--ghost', href: wa, target: '_blank', rel: 'noopener noreferrer', text: t('thanks.shareWhatsapp') }));
  }

  stage.append(
    el('div', { class: 'thanks' }, [
      el('div', { class: 'thanks__check', 'aria-hidden': 'true', text: '✓' }),
      el('h1', { class: 'thanks__title', 'data-focus': true, text: t('thanks.title') }),
      el('p', { class: 'thanks__body', text: t('thanks.body', { email }) }),
      el('div', { class: 'thanks__block' }, [
        el('h2', { class: 'thanks__h', text: t('thanks.nextTitle') }),
        el('p', { text: t('thanks.next') }),
      ]),
      el('div', { class: 'thanks__block' }, [
        el('h2', { class: 'thanks__h', text: t('thanks.shareTitle') }),
        el('p', { text: t('thanks.shareBody') }),
        actions,
      ]),
      CONFIG.features.showEducation
        ? el('button', { class: 'link-btn', type: 'button', onClick: () => openContent(), text: t('thanks.learnCta') + ' →' })
        : null,
    ])
  );
}

/* ================================================================
 * Educational content
 * ================================================================ */

function openContent() {
  renderArticleList();
  showView('content');
}

function renderArticleList() {
  const stage = qs('#content-stage');
  stage.innerHTML = '';
  stage.append(
    el('header', { class: 'content__head' }, [
      el('h1', { class: 'content__title', 'data-focus': true, text: t('content.title') }),
      el('p', { class: 'content__subtitle', text: t('content.subtitle') }),
    ])
  );

  const list = el('div', { class: 'articles' });
  getArticles().forEach((a) => {
    list.append(
      el('button', {
        class: 'article-card',
        type: 'button',
        onClick: () => openArticle(a.slug),
      }, [
        el('span', { class: 'article-card__tag', text: a.tag }),
        el('h2', { class: 'article-card__title', text: a.title }),
        el('p', { class: 'article-card__excerpt', text: a.excerpt }),
        el('span', { class: 'article-card__meta', text: t('content.readingTime', { min: a.minutes }) }),
      ])
    );
  });
  stage.append(list);

  stage.append(
    el('div', { class: 'content__cta' }, [
      el('button', { class: 'btn btn--primary', type: 'button', onClick: startCalculator, text: t('content.cta') }),
    ])
  );
}

function openArticle(slug) {
  const article = getArticle(slug);
  if (!article) return openContent();
  trackEvent('article_open', { slug });

  const stage = qs('#article-stage');
  stage.innerHTML = '';
  stage.append(
    el('article', { class: 'article' }, [
      el('button', { class: 'link-btn', type: 'button', onClick: openContent, text: '← ' + t('content.backToArticles') }),
      el('span', { class: 'article__tag', text: article.tag }),
      el('h1', { class: 'article__title', 'data-focus': true, text: article.title }),
      el('p', { class: 'article__meta', text: t('content.readingTime', { min: article.minutes }) }),
      el('div', { class: 'article__body', html: renderMarkdown(article.body) }),
      el('div', { class: 'article__foot' }, [
        el('p', { class: 'article__disc', text: t('disclaimer.full') }),
        el('button', { class: 'btn btn--primary', type: 'button', onClick: startCalculator, text: t('content.cta') }),
      ]),
    ])
  );
  showView('article');
}

/* ================================================================
 * Utilities
 * ================================================================ */

function numberOrNaN(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/* ================================================================
 * Bootstrap (called by main.js)
 * ================================================================ */

export function initApp() {
  applyStaticI18n();

  // Restore any in-progress inputs from this session.
  const draft = loadDraft();
  if (draft && draft.inputs) {
    Object.assign(state.inputs, draft.inputs);
  }

  // Wire the static hero + header controls.
  qsa('[data-action="start-calc"]').forEach((btn) =>
    btn.addEventListener('click', () => {
      trackEvent('cta_calcular', { from: btn.dataset.from || 'hero' });
      startCalculator();
    })
  );
  qsa('[data-action="open-content"]').forEach((btn) =>
    btn.addEventListener('click', (e) => { e.preventDefault(); openContent(); })
  );
  qsa('[data-action="go-home"]').forEach((btn) =>
    btn.addEventListener('click', (e) => { e.preventDefault(); showView('hero'); })
  );

  // Hide the education nav entry if disabled.
  if (!CONFIG.features.showEducation) {
    qsa('[data-action="open-content"]').forEach((b) => (b.hidden = true));
  }

  showView('hero');
}
