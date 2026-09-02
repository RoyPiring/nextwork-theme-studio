/* A small DOM and extension-API stand-in, so src/content.js can be loaded and
 * driven in a test.
 *
 * This is not a browser. It implements the handful of things the content
 * script actually touches, and nothing else, which keeps it short enough to
 * read and to trust. Anything the script starts using that is missing here
 * will throw rather than quietly do nothing.
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

class FakeClassList {
  constructor() { this.set = new Set(); }
  add(...n) { n.forEach(x => this.set.add(x)); }
  remove(...n) { n.forEach(x => this.set.delete(x)); }
  contains(n) { return this.set.has(n); }
}

class FakeStyle {
  constructor() { this.props = new Map(); }
  setProperty(name, value, priority) {
    this.props.set(name, { value, priority: priority || '' });
  }
  removeProperty(name) { this.props.delete(name); }
  getPropertyValue(name) {
    const e = this.props.get(name);
    return e ? e.value : '';
  }
  get cssText() {
    return [...this.props.entries()]
      .map(([k, v]) => k + ': ' + v.value + (v.priority ? ' !' + v.priority : ''))
      .join('; ');
  }
}

let nodeSeq = 0;

class FakeElement {
  constructor(tag, doc) {
    this.tagName = String(tag).toUpperCase();
    this.nodeType = 1;              /* ELEMENT_NODE; the observer filters on it */
    this.isConnected = true;
    this.ownerDocument = doc;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.style = new FakeStyle();
    this.classList = new FakeClassList();
    this.attributes = {};
    this.textContent = '';
    this.id = '';
    this.shadowRoot = null;
    this._rect = { left: 0, top: 0, width: 300, height: 200 };
    this._computed = {};
    this._seq = ++nodeSeq;
    this.listeners = {};
  }
  /* The real DOM has both; code walking ancestors uses parentElement. */
  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (!this.parentNode) return;
    const i = this.parentNode.children.indexOf(this);
    if (i >= 0) this.parentNode.children.splice(i, 1);
    this.parentNode = null;
  }
  contains(node) {
    let n = node;
    while (n) { if (n === this) return true; n = n.parentNode; }
    return false;
  }
  getRootNode() {
    let n = this;
    while (n.parentNode) n = n.parentNode;
    return n.ownerDocument || n;
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener() {}
  getBoundingClientRect() { return Object.assign({}, this._rect); }
  setPointerCapture() {}
  releasePointerCapture() {}
  /* The content script normalises colours by round-tripping them through a
   * canvas fillStyle, because getComputedStyle hands back whatever colour
   * space the author wrote. This does the same job for the notations the
   * tests use, and keeps the "unparseable" behaviour: an invalid value leaves
   * fillStyle at whatever it was. */
  getContext(kind) {
    if (kind !== '2d') return null;
    const ctx = {
      _fill: '#000000',
      get fillStyle() { return this._fill; },
      set fillStyle(v) {
        const hex = /^#([0-9a-f]{6})$/i.exec(String(v).trim());
        if (hex) { this._fill = '#' + hex[1].toLowerCase(); return; }
        const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i
          .exec(String(v).trim());
        if (!rgb) return;                       /* unparseable: unchanged */
        const a = rgb[4] === undefined ? 1 : parseFloat(rgb[4]);
        const to = n => Math.max(0, Math.min(255, Math.round(parseFloat(n))));
        if (a >= 1) {
          this._fill = '#' + [rgb[1], rgb[2], rgb[3]]
            .map(n => to(n).toString(16).padStart(2, '0')).join('');
        } else {
          this._fill = 'rgba(' + to(rgb[1]) + ', ' + to(rgb[2]) + ', ' +
                       to(rgb[3]) + ', ' + a + ')';
        }
      }
    };
    return ctx;
  }
  /* Only the shapes the content script uses: a comma list of tag names, or
   * '*', or an attribute selector. */
  /* Tag names, .classes and [attributes], in a comma list. Enough for what the
   * content script asks for, and it throws on anything else rather than
   * quietly returning nothing. */
  querySelectorAll(sel) {
    const all = [];
    (function walk(node) {
      node.children.forEach(c => { all.push(c); walk(c); });
    })(this);
    if (sel === '*') return all;
    const parts = sel.split(',').map(s => s.trim()).filter(Boolean);
    const match = (el, part) => {
      if (part.startsWith('[class*=')) {
        const want = part.slice(part.indexOf('"') + 1, part.lastIndexOf('"'));
        return (el.className || '').toString().indexOf(want) !== -1 ||
               [...el.classList.set].some(c => c.indexOf(want) !== -1);
      }
      if (part.startsWith('[') && part.endsWith(']')) {
        const key = part.slice(1, -1).replace(/^data-/, '')
          .replace(/-(\w)/g, (_, c) => c.toUpperCase());
        return el.dataset[key] !== undefined;
      }
      if (part.startsWith('.')) return el.classList.contains(part.slice(1));
      if (/^[a-zA-Z][\w-]*$/.test(part)) return el.tagName === part.toUpperCase();
      throw new Error('harness: unsupported selector "' + part + '"');
    };
    return all.filter(el => parts.some(part => match(el, part)));
  }
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeElement('html', this);
    /* The panel test compares an element's width against the page width. */
    this.documentElement.clientWidth = 1440;
    this.head = new FakeElement('head', this);
    this.body = new FakeElement('body', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.listeners = {};
  }
  createElement(tag) { return new FakeElement(tag, this); }
  getElementById(id) {
    let found = null;
    (function walk(node) {
      if (found) return;
      for (const c of node.children) {
        if (c.id === id) { found = c; return; }
        walk(c);
        if (found) return;
      }
    })(this.documentElement);
    return found;
  }
  querySelectorAll(sel) { return this.documentElement.querySelectorAll(sel); }
  /* What is stacked under a point, deepest first. The content script asks this
   * to find out whether a picture sits behind some text, which is not a thing
   * a background colour can tell it. */
  elementsFromPoint(x, y) {
    const hits = [];
    (function walk(node, depth) {
      node.children.forEach(function (c) {
        const r = c._rect;
        if (r && x >= r.left && x <= r.left + r.width &&
                 y >= r.top && y <= r.top + r.height) hits.push({ el: c, depth: depth });
        walk(c, depth + 1);
      });
    })(this.documentElement, 0);
    hits.sort(function (a, b) { return b.depth - a.depth; });
    return hits.map(function (h) { return h.el; });
  }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
}

/* Build an environment, load content.js into it, and hand back the controls a
 * test needs. */
function loadContentScript(options) {
  const opts = options || {};
  const doc = new FakeDocument();
  const stored = Object.assign({}, opts.settings || {});
  const changeListeners = [];
  const observers = [];
  const timers = [];
  const reads = [];

  const chrome = {
    runtime: { lastError: null, id: 'test', onMessage: { addListener() {} } },
    storage: {
      local: {
        get(_keys, cb) {
          /* Async, like the real one, and held separately so a test can
           * deliver two overlapping reads out of order. That is the whole
           * point: the API gives no ordering guarantee, and code that assumes
           * one only fails under load. */
          reads.push({ cb, snapshot: JSON.parse(JSON.stringify(stored)) });
        },
        set(patch, cb) {
          Object.assign(stored, JSON.parse(JSON.stringify(patch)));
          if (cb) timers.push(cb);
          changeListeners.forEach(fn => timers.push(() => fn({}, 'local')));
        }
      },
      onChanged: { addListener(fn) { changeListeners.push(fn); } }
    }
  };

  const win = {
    innerWidth: 1440,
    innerHeight: 900,
    localStorage: {
      _v: {},
      getItem(k) { return k in this._v ? this._v[k] : null; },
      setItem(k, v) { this._v[k] = String(v); }
    }
  };
  win.top = win;
  win.addEventListener = function () {};
  win.removeEventListener = function () {};

  class FakeSheet {
    constructor() { this.text = ''; }
    replaceSync(css) { this.text = css; }
  }

  const sandbox = {
    window: win,
    document: doc,
    location: { pathname: opts.pathname || '/projects/abc' },
    chrome,
    CSSStyleSheet: FakeSheet,
    getComputedStyle(el) {
      return Object.assign(
        { backgroundColor: 'rgb(29, 30, 31)', color: 'rgb(232, 233, 233)',
          borderTopColor: 'rgb(60, 62, 64)' },
        el._computed || {});
    },
    MutationObserver: class {
      constructor(fn) { this.fn = fn; observers.push(this); }
      observe() {}
      disconnect() {}
    },
    setTimeout(fn) { timers.push(fn); return timers.length; },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
    isFinite, parseInt, parseFloat, console
  };
  sandbox.globalThis = sandbox;

  const vm = require('node:vm');
  vm.createContext(sandbox);
  /* In a page, `self` IS the global, so `self.NWT = x` makes a bare `NWT`
   * resolve. Point it at the sandbox or the content script cannot see the
   * engine it was loaded alongside. */
  sandbox.self = sandbox;
  ['src/wallpapers.js', 'src/scenes.js', 'src/theme-engine.js', 'src/content.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }));

  /* Run everything queued, including anything queued while draining.
   * `reverseReads` delivers outstanding storage reads newest-first, which is
   * the ordering the real API is free to choose and code often assumes it
   * will not. */
  function flush(opts) {
    const o = opts || {};
    for (let i = 0; i < (o.rounds || 12); i++) {
      let pending = [];
      if (o.deliverReads !== false) {
        pending = reads.splice(0, reads.length);
        if (o.reverseReads) pending.reverse();
        pending.forEach(r => r.cb(r.snapshot));
      }
      const batch = timers.splice(0, timers.length);
      batch.forEach(fn => fn());
      if (!pending.length && !batch.length) break;
    }
  }

  return {
    doc, chrome, window: win, sandbox, flush, stored, reads,
    /* Add a panel the rescue pass will consider. */
    addPanel(computed, rect) {
      const el = doc.createElement('div');
      el._computed = computed;
      el._rect = Object.assign({ left: 0, top: 0, width: 400, height: 200 }, rect || {});
      doc.body.appendChild(el);
      return el;
    },
    mutate(records) { observers.forEach(o => o.fn(records || [])); },
    /* Count how many times a walk started from the document root, which is
     * the cost the observer is supposed to stop paying. */
    countWalks(run) {
      let fromRoot = 0;
      /* paintShadowRoots walks from `document`, not documentElement. */
      const original = doc.querySelectorAll.bind(doc);
      doc.querySelectorAll = function (sel) {
        if (sel === '*') fromRoot++;
        return original(sel);
      };
      try { run(); } finally { doc.querySelectorAll = original; }
      return { fromRoot };
    },
    panels() { return doc.querySelectorAll('div'); }
  };
}

module.exports = { loadContentScript };
