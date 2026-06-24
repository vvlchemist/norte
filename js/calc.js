/**
 * calc.js — Pure financial math. No DOM, no side effects.
 * -------------------------------------------------------------
 * Everything here is deterministic and unit-testable. The UI passes in
 * raw inputs and gets back numbers + a time series for the chart.
 *
 * Core model (monthly compounding):
 *   r = annualReturn / 12            (monthly rate)
 *   n = (retirementAge - currentAge) * 12   (months)
 *   FV of contributions (ordinary annuity): P * ((1+r)^n - 1) / r
 *   FV of current savings:                  S * (1+r)^n
 *   investedTotal    = FV_contrib + FV_savings
 *   notInvestedTotal = P*n + S        (same money, 0% growth = cash)
 *   difference       = investedTotal - notInvestedTotal
 *
 * r === 0 is guarded with a linear model so we never divide by zero.
 */

import { CONFIG } from './config.js';

/* ----------------------------------------------------------------
 * Validation
 * ---------------------------------------------------------------- */

/**
 * Validate calculator inputs against config guardrails.
 * @returns {{ valid: boolean, errors: Object<string,string> }}
 *   errors maps field -> message key (resolved by the UI via t()).
 */
export function validateInputs({ currentAge, retirementAge, monthly, currentSavings }) {
  const { minAge, maxAge } = CONFIG.assumptions;
  const errors = {};

  if (!Number.isFinite(currentAge) || currentAge < minAge || currentAge > maxAge) {
    errors.currentAge = 'errors.ageRange';
  }

  if (!Number.isFinite(retirementAge) || retirementAge < minAge || retirementAge > maxAge) {
    errors.retirementAge = 'errors.retirementRange';
  } else if (Number.isFinite(currentAge) && retirementAge <= currentAge) {
    errors.retirementAge = 'errors.retirementAfter';
  }

  if (!Number.isFinite(monthly) || monthly < 0) {
    errors.monthly = 'errors.positive';
  }

  if (!Number.isFinite(currentSavings) || currentSavings < 0) {
    errors.currentSavings = 'errors.positive';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/* ----------------------------------------------------------------
 * Single-point future value (used internally and for the chart series)
 * ---------------------------------------------------------------- */

/**
 * Future value of a monthly contribution stream + lump sum after `months`.
 * @param {Object} p
 * @param {number} p.monthly         monthly contribution P
 * @param {number} p.savings         current savings S (lump sum at t=0)
 * @param {number} p.monthlyRate     r (decimal, e.g. 0.07/12)
 * @param {number} p.months          n
 * @param {'ordinary'|'due'} [p.timing]
 * @returns {number} invested value
 */
export function futureValue({ monthly, savings, monthlyRate: r, months: n, timing = 'ordinary' }) {
  if (n <= 0) return savings;

  // FV of the lump sum.
  const fvSavings = savings * Math.pow(1 + r, n);

  // FV of the contribution annuity, guarding r === 0 (linear).
  let fvContrib;
  if (r === 0) {
    fvContrib = monthly * n;
  } else {
    fvContrib = monthly * ((Math.pow(1 + r, n) - 1) / r);
    if (timing === 'due') fvContrib *= 1 + r; // contributions at start of period
  }

  return fvContrib + fvSavings;
}

/* ----------------------------------------------------------------
 * Main projection
 * ---------------------------------------------------------------- */

/**
 * Build the full projection used by the results screen.
 *
 * @param {Object} input
 * @param {number} input.currentAge
 * @param {number} input.retirementAge
 * @param {number} input.monthly          monthly contribution (USD)
 * @param {number} [input.currentSavings] lump sum today (USD)
 * @param {number} input.annualReturn     decimal, e.g. 0.07
 * @returns {{
 *   months:number, years:number, monthlyRate:number,
 *   invested:number, notInvested:number, difference:number,
 *   contributed:number, retirementIncome:number,
 *   series:Array<{year:number, age:number, invested:number, notInvested:number}>
 * }}
 */
export function project(input) {
  const {
    currentAge,
    retirementAge,
    monthly,
    currentSavings = 0,
    annualReturn,
  } = input;

  const { withdrawalRate, annuityTiming } = CONFIG.assumptions;

  const years = Math.max(0, retirementAge - currentAge);
  const months = years * 12;
  const r = annualReturn / 12;

  const invested = futureValue({
    monthly,
    savings: currentSavings,
    monthlyRate: r,
    months,
    timing: annuityTiming,
  });

  // Same dollars, zero growth: the "cash under the mattress" path.
  const contributed = monthly * months; // money the user actually puts in
  const notInvested = contributed + currentSavings;
  const difference = invested - notInvested;

  // Optional 4% rule: nestEgg * rate / 12 (== nestEgg / 25 / 12 at 4%).
  const retirementIncome = (invested * withdrawalRate) / 12;

  // Yearly series for the chart (sampled every 12 months + final point).
  const series = buildSeries({
    monthly,
    savings: currentSavings,
    monthlyRate: r,
    months,
    startAge: currentAge,
    timing: annuityTiming,
  });

  return {
    months,
    years,
    monthlyRate: r,
    invested,
    notInvested,
    difference,
    contributed,
    retirementIncome,
    series,
  };
}

/**
 * Yearly data points for the growth chart.
 * @returns {Array<{year:number, age:number, invested:number, notInvested:number}>}
 */
function buildSeries({ monthly, savings, monthlyRate: r, months, startAge, timing }) {
  const points = [];
  const totalYears = Math.floor(months / 12);

  for (let y = 0; y <= totalYears; y++) {
    const m = y * 12;
    points.push({
      year: y,
      age: startAge + y,
      invested: Math.round(futureValue({ monthly, savings, monthlyRate: r, months: m, timing })),
      notInvested: Math.round(monthly * m + savings),
    });
  }

  // Ensure the very last (possibly non-whole-year) month is represented.
  if (months % 12 !== 0) {
    points.push({
      year: months / 12,
      age: startAge + months / 12,
      invested: Math.round(futureValue({ monthly, savings, monthlyRate: r, months, timing })),
      notInvested: Math.round(monthly * months + savings),
    });
  }

  return points;
}

/* ----------------------------------------------------------------
 * Formatting helpers
 * ---------------------------------------------------------------- */

let _moneyFmt;
let _moneyFmtCents;

function moneyFormatter(withCents = false) {
  const opts = {
    style: 'currency',
    currency: CONFIG.currency.code,
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  };
  return new Intl.NumberFormat(CONFIG.currency.numberLocale, opts);
}

/**
 * Format a number as whole-dollar currency with thousands separators.
 * e.g. 1234567 -> "$1,234,567"
 */
export function formatMoney(value, { cents = false } = {}) {
  const n = Number.isFinite(value) ? value : 0;
  if (cents) {
    _moneyFmtCents = _moneyFmtCents || moneyFormatter(true);
    return _moneyFmtCents.format(n);
  }
  _moneyFmt = _moneyFmt || moneyFormatter(false);
  return _moneyFmt.format(Math.round(n));
}

/** Format a decimal return as a percent string, e.g. 0.07 -> "7%". */
export function formatPercent(decimal) {
  const pct = decimal * 100;
  // Show one decimal only when needed (7% not 7.0%, but 7.5%).
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}
