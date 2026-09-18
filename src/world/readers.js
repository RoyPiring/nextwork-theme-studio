/* NextWorld · readers: what the extension can honestly see
 * Pure functions of a document. They match on text and ARIA, never on a
 * site's class names, use only the plainest DOM calls so the test harness
 * can stand in for a page, and return null rather than a partial reading. */
'use strict';
(function () {
  const text = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  const kids = el => Array.prototype.slice.call(el && el.children || []);
  const all = (el, sel) => Array.prototype.slice.call(el && el.querySelectorAll ? el.querySelectorAll(sel) : []);
  const first = (el, sel) => all(el, sel)[0] || null;
  const attr = (el, k) => (el && el.getAttribute ? el.getAttribute(k) : null) || '';
  const after = el => { const p = el && el.parentElement; if (!p) return null; const c = kids(p); return c[c.indexOf(el) + 1] || null; };
  /* is this step ticked? any of the ways a checklist marks it */
  function ticked(el) {
    if (!el) return false;
    const marked = e => attr(e, 'aria-checked') === 'true' || /^(complete|checked|done)$/.test(attr(e, 'data-state')) || /^(complete|completed|checked|done)$/i.test(attr(e, 'aria-label').trim()) || /(^|\s)(done|complete|completed)(\s|$)/.test(attr(e, 'class'));
    if (marked(el)) return true;
    if (all(el, 'input').some(i => i.checked)) return true;
    if (all(el, '[aria-checked], [data-state]').some(e => attr(e, 'aria-checked') === 'true' || /^(complete|checked|done)$/.test(attr(e, 'data-state')))) return true;   /* a 'Mark complete' button inside a step is not a tick */
    try { const cs = el.ownerDocument && el.ownerDocument.defaultView && el.ownerDocument.defaultView.getComputedStyle(el); if (cs && /line-through/.test(cs.textDecorationLine || cs.textDecoration || '')) return true; } catch (e) { /* a stand-in document */ }
    return false;
  }
  /* the page's own title: the heading in its main content, never the site's name */
  function titleOf(doc) { const hs = all(doc, 'h1'); const inMain = e => { for (let p = e && e.parentElement; p; p = p.parentElement) { const tag = (p.tagName || '').toLowerCase(); if (tag === 'main' || tag === 'article' || attr(p, 'role') === 'main') return true; } return false; }; const h = hs.find(inMain) || hs[0]; const t = text(h); return /^next\s*work(\.ai)?$/i.test(t) ? '' : t; }
  /* the project page: its title, and how many steps are done of how many */
  function readProjectPage(doc, pathname) {
    if (!doc || !/^\/projects?\/[^/]+/.test(pathname || '')) return null;
    const title = titleOf(doc); if (!title) return null;
    const head = all(doc, 'h2, h3, h4').find(h => /^steps?$/i.test(text(h))); let done = 0, total = 0;
    if (head) {
      let list = after(head); while (list && !kids(list).length) list = after(list);
      if (list) { const items = kids(list).filter(c => text(c)); total = items.length; done = items.filter(ticked).length; }
    }
    return { title, done, total, at: Date.now() };
  }
  /* the portfolio page: the learn lists and their counts */
  function readPortfolioPage(doc, pathname) {
    if (!doc || !/^\/portfolio\/[^/]+/.test(pathname || '')) return null;
    const lists = [];
    all(doc, '*').forEach(el => {
      if (kids(el).length) return; const m = /^(\d+)\s+projects?\s*·\s*Learnlist$/i.exec(text(el)); if (!m) return;
      let card = el.parentElement; while (card && card.parentElement && !first(card, 'h1, h2, h3, h4, b, strong') && card !== doc.body) card = card.parentElement; if (!card) return;
      const name = text(first(card, 'h1, h2, h3, h4') || first(card, 'b, strong')); if (!name) return;
      const blurb = text(all(card, 'p').find(p => text(p) !== name && !/Learnlist$/i.test(text(p))));
      if (!lists.some(l => l.name === name)) lists.push({ name, count: +m[1], blurb: blurb.slice(0, 180) });
    });
    const h1 = text(first(doc, 'h1')); const name = h1 ? h1.split(':')[0].trim() : '';
    if (!lists.length) return null;
    return { lists, name, at: Date.now() };
  }
  NW.Readers = { readProjectPage, readPortfolioPage, ticked, titleOf };
})();
