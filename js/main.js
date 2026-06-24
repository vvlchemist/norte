/**
 * main.js — Application entry point.
 * -------------------------------------------------------------
 * Boots tracking (attribution + analytics) and then the UI. Keeping this
 * thin makes the wiring obvious: tracking first (so attribution is ready
 * before any event fires), then the app.
 */

import { initTracking } from './tracking.js';
import { initApp } from './ui.js';

function boot() {
  initTracking(); // capture UTM/source + optional analytics
  initApp();      // hydrate copy, wire views, render hero
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
