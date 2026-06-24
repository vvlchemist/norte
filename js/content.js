/**
 * content.js — Article access + a tiny, safe Markdown renderer.
 * -------------------------------------------------------------
 * We deliberately ship a minimal renderer (no dependency) that supports
 * the small Markdown subset our articles use. It escapes HTML first, so
 * article bodies can't inject markup — safe even if content later comes
 * from a CMS.
 *
 * Supported: # / ## headings, paragraphs, - lists, > blockquotes,
 * **bold**, *italic*, and [text](url) links.
 */

import { ARTICLES } from '../content/articles.js';

export function getArticles() {
  return ARTICLES;
}

export function getArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null;
}

/** Escape HTML special chars to prevent injection. */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline formatting: bold, italic, links. Operates on already-escaped text. */
function renderInline(text) {
  return text
    // [label](url) — only allow http/https/# targets.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[^\s)]*)\)/g,
      (_m, label, href) => `<a href="${href}" rel="noopener noreferrer"${href.startsWith('http') ? ' target="_blank"' : ''}>${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}

/**
 * Render a small Markdown subset to an HTML string.
 * @param {string} md
 * @returns {string} HTML
 */
export function renderMarkdown(md) {
  const lines = md.split('\n');
  const html = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen === 'ol') html.push('</ol>');
    else if (listOpen) html.push('</ul>');
    listOpen = false;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const safe = escapeHtml(line);

    if (line.trim() === '') {
      closeList();
      continue;
    }

    if (/^#\s+/.test(line)) {
      closeList();
      html.push(`<h1>${renderInline(escapeHtml(line.replace(/^#\s+/, '')))}</h1>`);
    } else if (/^##\s+/.test(line)) {
      closeList();
      html.push(`<h2>${renderInline(escapeHtml(line.replace(/^##\s+/, '')))}</h2>`);
    } else if (/^>\s?/.test(line)) {
      closeList();
      html.push(`<blockquote>${renderInline(escapeHtml(line.replace(/^>\s?/, '')))}</blockquote>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li>${renderInline(escapeHtml(line.replace(/^[-*]\s+/, '')))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      // Ordered items: render as list items inside a <ol>. Simple handling:
      // treat consecutive numbered lines as their own <ol>.
      if (!listOpen) {
        html.push('<ol>');
        listOpen = 'ol';
      }
      html.push(`<li>${renderInline(escapeHtml(line.replace(/^\d+\.\s+/, '')))}</li>`);
    } else {
      closeList();
      html.push(`<p>${renderInline(safe)}</p>`);
    }
  }
  closeList(); // close any trailing list (ul/ol)
  return html.join('\n');
}
