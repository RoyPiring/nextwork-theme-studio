/* A small DOM and extension-API stand-in, so src/content.js can be loaded and
 * driven in a test.
 *
 * One limitation worth knowing. The sandbox is given the host's Object, Array,
 * RegExp and friends, and then vm.createContext runs the source in a new
 * realm. A literal created inside that realm is not an instanceof the host
 * constructor of the same name. Nothing here relies on cross-realm
 * instanceof, and the code under test does not use it, but a test that starts
 * to would fail for a reason that has nothing to do with the code.
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
  toggle(n, force) {
    const on = force === undefined ? !this.set.has(n) : !!force;
    if (on) this.set.add(n); else this.set.delete(n);
    return on;
  }
}

/* Does one element match one selector.
 *
 * Compound parts are read left to right - "button[data-min]" is a tag and an
 * attribute, and closest() is given exactly that. Anything it does not
 * understand throws, so a selector this does not cover fails loudly instead of
 * quietly matching nothing and leaving a test green for the wrong reason. */
function matchesSelector(el, sel) {
  return String(sel).split(',').map(s => s.trim()).filter(Boolean)
    .some(part => matchesOne(el, part));
}

function matchesOne(el, part) {
  if (part === '*') return true;
  const bits = part.match(/^[a-zA-Z][\w-]*|\[[^\]]*\]|\.[\w-]+|#[\w-]+/g);
  if (!bits || bits.join('') !== part) {
    throw new Error('harness: unsupported selector "' + part + '"');
  }
  return bits.every(bit => {
    if (bit.startsWith('#')) return el.id === bit.slice(1);
    if (bit.startsWith('.')) return el.classList.contains(bit.slice(1));
    if (bit.startsWith('[')) {
      const body = bit.slice(1, -1);
      if (body.startsWith('class*=')) {
        const want = body.slice(body.indexOf('=') + 1).replace(/^["']|["']$/g, '');
        return [...el.classList.set].some(c => c.indexOf(want) !== -1);
      }
      /* Every other operator is refused rather than misread. Left to fall
       * through, "[data-min^=2]" took the name as "data-min^", found nothing
       * under it, and returned no elements - which reads as "the page does
       * not have one" and leaves the test green. */
      const operator = /([~^$*|])=/.exec(body);
      if (operator) {
        throw new Error('harness: unsupported attribute operator "' +
                        operator[0] + '" in "' + bit + '"');
      }
      const eq = body.indexOf('=');
      const name = (eq === -1 ? body : body.slice(0, eq)).trim();
      const key = name.replace(/^data-/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
      /* id and class are held as properties rather than in the attribute bag,
       * so asking the bag for them would answer "absent" for every element and
       * quietly match nothing. */
      const value = name === 'id' ? (el.id || undefined)
        : name === 'class' ? (el.className || undefined)
        : name.startsWith('data-') ? el.dataset[key]
        : el.attributes[name];
      if (eq === -1) return value !== undefined;
      /* Trimmed, so [data-min = "25"] reads as the same thing it does in a
       * browser rather than matching nothing. */
      const want = body.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      return String(value) === want;
    }
    return el.tagName === bit.toUpperCase();
  });
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
    /* Text runs and elements together, in the order they appear.
     *
     * Held as a separate text field beside the children, "Theme <b>Ocean</b>
     * is on" read back with the child's words moved to the end, and text set
     * before a child was appended disappeared entirely. Either way an
     * assertion about a label was measuring something the page does not
     * show. */
    this._content = [];
    this.id = '';
    this.shadowRoot = null;
    this._rect = { left: 0, top: 0, width: 300, height: 200 };
    this._computed = {};
    this._seq = ++nodeSeq;
    this.listeners = {};
  }
  /* className and classList are two views of the same thing in a browser.
   * Keeping them as separate fields here meant an element built with
   * className was invisible to a .class selector, which is a bug in the
   * harness that would read as a bug in the code under test. */
  get className() { return [...this.classList.set].join(' '); }
  set className(v) {
    this.classList.set = new Set(String(v == null ? '' : v).split(/\s+/).filter(Boolean));
  }
  /* Setting textContent empties the element, which is how the popup clears a
   * list before rebuilding it. Held as a plain field, the old children stayed
   * and every render appended another copy - the list would have grown on
   * each click while the test watched the count and saw nothing wrong. */
  get textContent() {
    return this._content
      .map(n => (typeof n === 'string' ? n : n.textContent)).join('');
  }
  set textContent(v) {
    this.children.forEach(c => { c.parentNode = null; c.isConnected = false; });
    this.children = [];
    const text = String(v == null ? '' : v);
    this._content = text === '' ? [] : [text];
  }
  appendText(text) {
    if (text !== '') this._content.push(String(text));
  }
  /* The real DOM has both; code walking ancestors uses parentElement. */
  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this._content.push(child);
    return child;
  }
  remove() {
    if (!this.parentNode) return;
    const i = this.parentNode.children.indexOf(this);
    if (i >= 0) this.parentNode.children.splice(i, 1);
    const j = this.parentNode._content.indexOf(this);
    if (j >= 0) this.parentNode._content.splice(j, 1);
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
  setAttribute(k, v) {
    if (k === 'class') { this.className = v; return; }
    this.attributes[k] = String(v);
  }
  getAttribute(k) {
    if (k === 'class') return this.className || null;
    return k in this.attributes ? this.attributes[k] : null;
  }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener() {}
  getBoundingClientRect() { return Object.assign({}, this._rect); }
  setPointerCapture() {}
  releasePointerCapture() {}
  /* A script clicking an element itself, which is how the editor opens the
   * file chooser and how it starts a download. */
  click() {
    let stopped = false;
    const event = {
      type: 'click', target: this,
      preventDefault() {},
      stopPropagation() { stopped = true; }
    };
    let node = this;
    while (node && !stopped) {
      (node.listeners.click || []).forEach(fn => fn.call(node, event));
      node = node.parentElement;
    }
  }
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
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const all = [];
    (function walk(node) {
      node.children.forEach(c => { all.push(c); walk(c); });
    })(this);
    if (sel === '*') return all;
    return all.filter(el => matchesSelector(el, sel));
  }
  /* This element or the nearest ancestor that matches. The popup asks for the
   * label wrapping a switch, and for the button under a click. */
  closest(sel) {
    let node = this;
    while (node && node.nodeType === 1) {
      if (matchesSelector(node, sel)) return node;
      node = node.parentElement;
    }
    return null;
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

/* Enough of an HTML parser for the extension's own two pages.
 *
 * The pages are built here rather than described in the test, so a test drives
 * the same DOM the browser would. An id renamed in the HTML and not in the
 * script then fails a test instead of shipping a popup where one control does
 * nothing - which is a class of bug nothing else here would catch.
 *
 * It handles what those pages use and throws on the rest.
 *
 * Read in one pass, left to right.
 *
 * Comments and the contents of script and style are skipped where they are met
 * rather than stripped out beforehand. Removing them first is the shape of a
 * sanitiser, and it has a sanitiser's problem: what one pass leaves behind the
 * next can read as markup, and a script holding "-->" would end a comment that
 * had not started. Passing over them in place cannot do that. */
const RAW_TEXT_TAGS = new Set(['script', 'style']);
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

const TAG = /^<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/;

function parseHTML(html, doc, into) {
  const root = into || doc.createElement('div');
  const stack = [root];
  const top = () => stack[stack.length - 1];

  /* Text is kept exactly as written. textContent in a browser hands back the
   * source whitespace, not what the layout makes of it, so collapsing runs
   * here would have tests comparing against text the DOM does not hold. A run
   * that is only whitespace is text too - it is the space between two
   * elements. */
  const text = s => { if (s) top().appendText(decodeEntities(s)); };

  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { text(html.slice(i)); break; }
    text(html.slice(i, lt));

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', lt)) {          /* a doctype, or anything like it */
      const end = html.indexOf('>', lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    const m = TAG.exec(html.slice(lt));
    if (!m) { text('<'); i = lt + 1; continue; }
    i = lt + m[0].length;

    const name = m[2].toLowerCase();
    if (m[1]) {
      /* Unwind to the matching open tag; a stray close is ignored rather than
       * silently reparenting everything after it. */
      for (let j = stack.length - 1; j > 0; j--) {
        if (stack[j].tagName === name.toUpperCase()) { stack.length = j; break; }
      }
      continue;
    }

    const el = doc.createElement(name);
    applyAttributes(el, m[3]);
    top().appendChild(el);

    if (RAW_TEXT_TAGS.has(name)) {
      /* Everything up to the matching close is text, whatever it looks like,
       * and it stays as text: textContent in a browser includes a stylesheet
       * and a script body. Entities are not decoded in here - raw text is
       * exactly what was written. */
      const close = new RegExp('</' + name + '\\s*>', 'i');
      const rest = html.slice(i);
      const found = close.exec(rest);
      el.appendText(found ? rest.slice(0, found.index) : rest);
      i += found ? found.index + found[0].length : rest.length;
      continue;
    }
    if (!VOID_TAGS.has(name) && !m[4]) stack.push(el);
  }
  return root;
}

/* One pass, so nothing this produces is read again.
 *
 * Run as a sequence of replacements, "&amp;lt;" became "&lt;" and then "<" -
 * text that says the name of a tag turned into the tag. */
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '
};

/* Load a whole page into a document that already has an html, head and body.
 *
 * Parsed straight into the body, the file's own <body> became a child of it -
 * a body inside a body - so document.body was not the element the page
 * declares, and anything written on that tag, a class among them, was on a
 * node no script would ever find. */
function parseDocument(html, doc) {
  const parsed = parseHTML(html, doc);
  ['head', 'body'].forEach(part => {
    const found = parsed.querySelectorAll(part)[0];
    if (found) adopt(found, doc[part]);
  });
  /* A fragment with no body of its own is the body. */
  if (!parsed.querySelectorAll('body')[0]) adopt(parsed, doc.body);
  return doc;
}

/* Move everything one element holds into another, in order, attributes and
 * all. The target keeps its identity, which is what makes it the document's
 * own body rather than a copy of it. */
function adopt(source, target) {
  Object.keys(source.attributes).forEach(k => target.setAttribute(k, source.attributes[k]));
  source.classList.set.forEach(c => target.classList.add(c));
  Object.keys(source.dataset).forEach(k => { target.dataset[k] = source.dataset[k]; });

  source._content.forEach(node => {
    if (typeof node === 'string') target.appendText(node);
    else { node.parentNode = target; target.children.push(node); target._content.push(node); }
  });
  source._content = [];
  source.children = [];
}

function decodeEntities(s) {
  return String(s).replace(/&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
    if (body.charAt(0) === '#') {
      const hex = body.charAt(1) === 'x' || body.charAt(1) === 'X';
      const code = parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      if (!code || code > 0x10ffff) return whole;
      return String.fromCodePoint(code);
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body)
      ? ENTITIES[body] : whole;
  });
}

function applyAttributes(el, source) {
  const attr = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let a;
  while ((a = attr.exec(source || '')) !== null) {
    const key = a[1];
    const value = decodeEntities(a[2] !== undefined ? a[2]
      : a[3] !== undefined ? a[3]
      : a[4] !== undefined ? a[4] : '');
    if (key === 'id') el.id = value;
    else if (key === 'class') el.className = value;
    else if (key.startsWith('data-')) {
      el.dataset[key.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = value;
    } else {
      el.setAttribute(key, value);
      /* The properties a script reads back off a control. `checked` follows
       * the attribute only as a starting state, as it does in a browser. */
      if (key === 'type' || key === 'value' || key === 'min' ||
          key === 'max' || key === 'step' || key === 'title') {
        el[key] = value;
      }
      if (key === 'checked') el.checked = true;
      if (key === 'disabled') el.disabled = true;
    }
  }
  if (el.tagName === 'INPUT' && el.checked === undefined) el.checked = false;
  if (el.tagName === 'INPUT' && el.value === undefined) el.value = '';
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

/* Build an environment for the background worker and load it into one.
 *
 * The same file runs two ways: Chromium runs it as a service worker, where
 * importScripts exists, and Firefox runs it as an event page, where it does
 * not and the manifest lists the libraries instead. `serviceWorker` picks
 * which of those is being exercised.
 */
function loadBackground(options) {
  const opts = options || {};
  const stored = Object.assign({}, opts.settings || {});
  const timers = [];
  const badge = { text: null, color: null, title: null };
  const changeListeners = [];
  const commandListeners = [];
  const installedListeners = [];
  const startupListeners = [];
  const imported = [];

  /* Set for the next read only, the way Chrome reports one. */
  let pendingError = opts.lastError || null;

  const chrome = {
    runtime: {
      lastError: null,
      onInstalled: { addListener(fn) { installedListeners.push(fn); } },
      onStartup: { addListener(fn) { startupListeners.push(fn); } }
    },
    commands: { onCommand: { addListener(fn) { commandListeners.push(fn); } } },
    action: {
      setBadgeText(o) { badge.text = o.text; },
      setBadgeBackgroundColor(o) { badge.color = o.color; },
      setTitle(o) { badge.title = o.title; }
    },
    storage: {
      local: {
        get(keys, cb) {
          /* After an error Chrome invokes the callback with undefined and
           * sets runtime.lastError. Code that does not check it then builds
           * from nothing. */
          /* lastError exists only while the failing callback runs, and is
           * cleared afterwards. Leaving it set makes every later read fail
           * too, so a recovery could never be tested. */
          if (pendingError) {
            const err = pendingError;
            pendingError = null;        /* one read, not every read after it */
            timers.push(() => {
              chrome.runtime.lastError = err;
              try { cb(undefined); } finally { chrome.runtime.lastError = null; }
            });
            return;
          }
          const snapshot = JSON.parse(JSON.stringify(stored));
          /* `get(null, ...)` asks for everything; an object asks for those
           * keys with those defaults. Both shapes are used here. */
          const answer = (keys === null || keys === undefined)
            ? snapshot
            : Object.assign({}, keys, Object.fromEntries(
                Object.keys(keys).filter(k => k in snapshot).map(k => [k, snapshot[k]])));
          timers.push(() => cb(answer));
        },
        set(patch, cb) {
          Object.assign(stored, JSON.parse(JSON.stringify(patch)));
          if (cb) timers.push(cb);
          const changes = {};
          Object.keys(patch).forEach(k => { changes[k] = { newValue: patch[k] }; });
          changeListeners.forEach(fn => timers.push(() => fn(changes, 'local')));
        }
      },
      onChanged: { addListener(fn) { changeListeners.push(fn); } }
    }
  };

  const sandbox = {
    chrome,
    Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
    isFinite, parseInt, parseFloat, console
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  if (opts.serviceWorker) {
    sandbox.importScripts = function () {
      /* However many are passed. Assuming three would break silently the day
       * a fourth library is added, which is the day it matters. */
      const names = Array.prototype.slice.call(arguments);
      names.forEach(n => imported.push(n));
      load(names.map(n => 'src/' + n));
    };
  }

  const vm = require('node:vm');
  vm.createContext(sandbox);
  function load(files) {
    files.forEach(f => vm.runInContext(
      fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }));
  }

  /* The event-page path has no importScripts, so the libraries are already
   * present when the worker starts. */
  if (!opts.serviceWorker) {
    load(['src/wallpapers.js', 'src/scenes.js', 'src/theme-engine.js']);
  }
  load(['src/background.js']);

  function flush(rounds) {
    for (let i = 0; i < (rounds || 12); i++) {
      const batch = timers.splice(0, timers.length);
      if (!batch.length) break;
      batch.forEach(fn => fn());
    }
  }

  return {
    chrome, sandbox, badge, stored, flush, imported,
    /* Make the next storage read fail, once. */
    failNextRead(err) { pendingError = err || { message: 'storage unavailable' }; },
    clearError() { pendingError = null; },
    install() { installedListeners.forEach(fn => fn()); },
    startup() { startupListeners.forEach(fn => fn()); },
    command(name) { commandListeners.forEach(fn => fn(name)); },
    /* Apply the new values before notifying, as Chrome does. Without this a
     * test has to seed storage with the value it is about to "change" to, and
     * then it is not testing a transition at all. */
    change(changes, area) {
      if (area === 'local') {
        Object.keys(changes).forEach(k => {
          if ('newValue' in changes[k]) stored[k] = changes[k].newValue;
          else delete stored[k];
        });
      }
      changeListeners.forEach(fn => fn(changes, area));
    }
  };
}

module.exports = { loadContentScript, loadBackground };

/* Build one of the extension's own pages, load its script into it, and hand
 * back the controls a test needs.
 *
 * The DOM comes from the page's real HTML. A control the script wires up by id
 * has to exist in the file for the wiring to run at all, so the two staying in
 * step is checked by the tests rather than by looking.
 */
function loadPage(options) {
  const opts = options || {};
  const doc = new FakeDocument();
  const stored = Object.assign({}, opts.settings || {});
  const changeListeners = [];
  /* Scheduled callbacks, by the id handed back. Held in a map rather than a
   * list so cancelling one actually removes it: as a no-op, a callback that
   * had been cancelled still ran, and a debounce that clears its previous
   * timer looked correct here whatever it did. */
  const timers = new Map();
  let timerSeq = 0;
  function queue(fn) { timerSeq += 1; timers.set(timerSeq, fn); return timerSeq; }
  const intervals = new Map();
  const reads = [];
  const opened = { optionsPage: 0, reloadedTabs: 0, closed: 0 };
  let intervalSeq = 0;

  parseDocument(fs.readFileSync(path.join(ROOT, opts.page), 'utf8'), doc);

  const chrome = {
    runtime: {
      lastError: null,
      id: 'test',
      openOptionsPage() { opened.optionsPage++; },
      onMessage: { addListener() {} }
    },
    tabs: { reload() { opened.reloadedTabs++; } },
    storage: {
      local: {
        /* The keys are honoured. Handing back everything regardless meant a
         * script could ask for one key, read another off the answer, and get
         * a value the browser would have reported as missing. */
        get(keys, cb) {
          const all = JSON.parse(JSON.stringify(stored));
          let snapshot = all;
          if (typeof keys === 'string') {
            snapshot = keys in all ? { [keys]: all[keys] } : {};
          } else if (Array.isArray(keys)) {
            snapshot = {};
            keys.forEach(k => { if (k in all) snapshot[k] = all[k]; });
          } else if (keys && typeof keys === 'object') {
            /* An object is a set of defaults. */
            snapshot = Object.assign({}, keys);
            Object.keys(keys).forEach(k => { if (k in all) snapshot[k] = all[k]; });
          }
          reads.push({ cb, snapshot });
        },
        set(patch, cb) {
          Object.assign(stored, JSON.parse(JSON.stringify(patch)));
          if (cb) queue(cb);
          changeListeners.forEach(fn => queue(() => fn({}, 'local')));
        },
        clear(cb) {
          Object.keys(stored).forEach(k => { delete stored[k]; });
          if (cb) queue(cb);
          changeListeners.forEach(fn => queue(() => fn({}, 'local')));
        }
      },
      onChanged: { addListener(fn) { changeListeners.push(fn); } }
    }
  };

  /* Whatever the page hands to the browser to save. The editor builds a Blob
   * and asks for a URL for it, so holding the blobs is enough to see what an
   * export would contain without a download happening. */
  const saved = [];
  const asked = [];
  let blobSeq = 0;

  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts || [];
      this.type = (options || {}).type || '';
    }
    text() { return Promise.resolve(this.parts.join('')); }
  }

  const win = {
    innerWidth: 420,
    innerHeight: 600,
    close() { opened.closed++; },
    addEventListener() {},
    removeEventListener() {},
    alert() {}
  };
  win.top = win;

  const sandbox = {
    window: win,
    document: doc,
    location: { pathname: '/' + path.basename(opts.page) },
    chrome,
    Blob: FakeBlob,
    URL: {
      createObjectURL(blob) {
        blobSeq += 1;
        saved.push({ type: blob.type, text: (blob.parts || []).join('') });
        return 'blob:test/' + blobSeq;
      },
      revokeObjectURL() {}
    },
    /* Counted, so a test can tell "it did not delete" from "it never
     * asked". A version that prompts and then does nothing satisfies the
     * first and not the second. */
    confirm(message) {
      asked.push(String(message));
      return opts.confirm === undefined ? true : opts.confirm;
    },
    alert() {},
    getComputedStyle(el) { return Object.assign({}, el._computed || {}); },
    /* The delay is recorded by nobody: flush() runs what is pending in the
     * order it was scheduled. Two timers with different delays therefore fire
     * in the order they were made rather than the order a browser would use,
     * so do not write a test whose meaning depends on which lands first. */
    setTimeout(fn) { return queue(fn); },
    clearTimeout(id) { timers.delete(id); },
    setInterval(fn, ms) { intervalSeq += 1; intervals.set(intervalSeq, { fn, ms }); return intervalSeq; },
    clearInterval(id) { intervals.delete(id); },
    requestAnimationFrame(fn) { return queue(fn); },
    cancelAnimationFrame(id) { timers.delete(id); },
    /* Math, Date, Array and the rest are deliberately not passed in. A vm
     * context has its own, and handing it this realm's would shadow them: an
     * array made inside the sandbox would carry the inner prototype while the
     * Array it is compared against is the outer one, so "[] instanceof Array"
     * answers false here and true in a browser. Any branch turning on that
     * would be exercised backwards. */
    console
  };
  sandbox.globalThis = sandbox;

  const vm = require('node:vm');
  vm.createContext(sandbox);
  sandbox.self = sandbox;
  ['src/wallpapers.js', 'src/scenes.js', 'src/theme-engine.js']
    .concat(opts.scripts || [])
    .forEach(f => vm.runInContext(
      fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }));

  function flush(o) {
    const options = o || {};
    for (let i = 0; i < (options.rounds || 12); i++) {
      let pending = [];
      if (options.deliverReads !== false) {
        pending = reads.splice(0, reads.length);
        if (options.reverseReads) pending.reverse();
        pending.forEach(r => r.cb(r.snapshot));
      }
      const batch = [...timers.values()];
      timers.clear();
      batch.forEach(fn => fn());
      if (!pending.length && !batch.length) break;
    }
  }

  /* Dispatch to the listeners on an element, and to any ancestor listening for
   * the same type, which is the bubbling the pages rely on for their lists. */
  function dispatch(el, type, extra, settle) {
    /* An event that is stopped goes no further. As a no-op, a handler that
     * stopped it here still reached every ancestor listening for the same
     * thing, so a delegated handler fired in a test where the page would not
     * have run it. */
    let stopped = false;
    const event = Object.assign({
      type,
      target: el,
      preventDefault() {},
      stopPropagation() { stopped = true; }
    }, extra || {});
    let node = el;
    while (node && !stopped) {
      (node.listeners[type] || []).forEach(fn => fn.call(node, event));
      node = node.parentElement;
    }
    /* A write held behind a timer has not happened yet when the handler
     * returns. Tests that care about that fire without settling, look, then
     * settle. */
    if (settle !== false) flush();
    return event;
  }

  return {
    doc, chrome, window: win, sandbox, stored, reads, flush, opened, intervals,
    /* What an export handed to the browser to save. */
    saved,
    /* Every question the page put to the person using it. */
    asked,
    /* Hand the page a file the way a chooser would, and wait for it to be
     * read - the page reads the file through a promise. */
    async chooseFile(id, text) {
      const input = doc.getElementById(id);
      if (!input) throw new Error('no file input with id "' + id + '"');
      input.files = [new FakeBlob([text], { type: 'application/json' })];
      dispatch(input, 'change');
      await Promise.resolve();
      await Promise.resolve();
      flush();
    },
    el(id) {
      const found = doc.getElementById(id);
      if (!found) throw new Error('no element with id "' + id + '" in ' + opts.page);
      return found;
    },
    /* Set a control's value the way a person would, then fire the event the
     * page listens for. */
    fire(id, type, extra) { return dispatch(this.el(id), type, extra); },
    /* Fire and stop, leaving anything on a timer still pending. */
    fireOnly(id, type, extra) { return dispatch(this.el(id), type, extra, false); },
    /* Make the next storage read fail the way the real API does: it sets
     * runtime.lastError rather than throwing, so unread it passes silently. */
    failNextRead(message) {
      const real = chrome.storage.local.get;
      chrome.storage.local.get = function (keys, cb) {
        chrome.storage.local.get = real;
        reads.push({
          snapshot: null,
          cb(snapshot) {
            chrome.runtime.lastError = { message: message || 'storage is unavailable' };
            try { cb(snapshot); } finally { chrome.runtime.lastError = null; }
          }
        });
      };
    },
    set(id, value) {
      const el = this.el(id);
      if (typeof value === 'boolean') el.checked = value;
      else el.value = String(value);
      return el;
    },
    click(el, extra) { return dispatch(el, 'click', extra); },
    /* Run every interval once, which is how the clock is advanced. */
    tick() {
      [...intervals.values()].forEach(t => t.fn());
      flush();
    }
  };
}

module.exports.loadPage = loadPage;
module.exports.parseHTML = parseHTML;
module.exports.parseDocument = parseDocument;
