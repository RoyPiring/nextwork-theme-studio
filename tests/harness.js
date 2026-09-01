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
  querySelectorAll(sel) {
    const all = [];
    (function walk(node) {
      node.children.forEach(c => { all.push(c); walk(c); });
    })(this);
    if (sel === '*') return all;
    if (sel.startsWith('[') && sel.endsWith(']')) {
      const key = sel.slice(1, -1).replace(/^data-/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
      return all.filter(e => e.dataset[key] !== undefined);
    }
    const tags = sel.split(',').map(s => s.trim().toUpperCase());
    return all.filter(e => tags.includes(e.tagName));
  }
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeElement('html', this);
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

  const chrome = {
    runtime: { lastError: null, id: 'test', onMessage: { addListener() {} } },
    storage: {
      local: {
        get(_keys, cb) {
          /* async, like the real one */
          const snapshot = JSON.parse(JSON.stringify(stored));
          timers.push(() => cb(snapshot));
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

  /* Run everything queued, including anything queued while draining. */
  function flush(rounds) {
    for (let i = 0; i < (rounds || 12); i++) {
      const batch = timers.splice(0, timers.length);
      if (!batch.length) break;
      batch.forEach(fn => fn());
    }
  }

  return {
    doc, chrome, window: win, sandbox, flush, stored,
    /* Add a panel the rescue pass will consider. */
    addPanel(computed, rect) {
      const el = doc.createElement('div');
      el._computed = computed;
      el._rect = Object.assign({ left: 0, top: 0, width: 400, height: 200 }, rect || {});
      doc.body.appendChild(el);
      return el;
    },
    mutate() { observers.forEach(o => o.fn([])); },
    panels() { return doc.querySelectorAll('div'); }
  };
}

module.exports = { loadContentScript };
