/* Tests for the stand-in the other tests are written against.
 *
 * A fault here does not fail anything - it quietly changes what every test
 * that touches it is measuring. Three of these were found that way: a matcher
 * that answered "no elements" instead of throwing, text that read back in the
 * wrong order, and text that disappeared when a child was added after it. Each
 * would have left a test green while the thing it described was broken.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadPage, parseHTML } = require('./harness.js');

function page() {
  return loadPage({ page: 'src/popup.html', scripts: [], settings: {} });
}

function fragment(html) {
  const p = page();
  const host = p.doc.createElement('div');
  parseHTML(html, p.doc, host);
  return { p, host };
}

test('text and elements read back in the order they were written', () => {
  const { host } = fragment('<p>Theme <b>Ocean</b> is on</p>');
  assert.equal(host.textContent, 'Theme Ocean is on');
});

test('text set before a child is added is still there', () => {
  /* The clock does exactly this: a label, then the element holding the time. */
  const { p, host } = fragment('<div></div>');
  const box = host.children[0];
  box.textContent = 'Focus: ';
  const span = p.doc.createElement('span');
  span.textContent = '12:00';
  box.appendChild(span);

  assert.equal(box.textContent, 'Focus: 12:00');
});

test('the letter s survives being parsed', () => {
  /* Whitespace runs were collapsed here once, by a pattern written without
   * its backslash - so it collapsed runs of the letter s instead, and every
   * label carrying one was quietly corrupted. */
  const { host } = fragment('<p>Sessions assess success</p>');
  assert.equal(host.textContent, 'Sessions assess success');
});

test('whitespace is kept as written, not as it would be laid out', () => {
  /* textContent in a browser hands back the source whitespace. Collapsing it
   * here would have every test comparing labels against text the DOM does not
   * hold. */
  const { host } = fragment('<p>Theme   <b>Ocean</b>\n  is on</p>');
  assert.equal(host.textContent, 'Theme   Ocean\n  is on');

  const { host: plain } = fragment('<p>a   b</p>');
  assert.equal(plain.textContent, 'a   b');
});

test('setting textContent empties the element', () => {
  const { p, host } = fragment('<div>old <b>text</b></div>');
  const box = host.children[0];
  box.textContent = 'new';
  assert.equal(box.textContent, 'new');
  assert.equal(box.children.length, 0, 'the children stayed');
  assert.equal(box.querySelectorAll('b').length, 0);
  assert.ok(p);
});

test('a removed child takes its text with it', () => {
  const { host } = fragment('<div>a <b>b</b> c</div>');
  const box = host.children[0];
  box.querySelectorAll('b')[0].remove();
  assert.equal(box.textContent, 'a  c');
});

/* ------------------------------------------------------------- selectors */

test('an element is found by id and by class as an attribute', () => {
  /* Both are held as properties rather than in the attribute bag. Asking the
   * bag returned no elements instead of throwing, which is the outcome the
   * matcher exists to avoid. */
  const { host } = fragment('<div id="status" class="tiny muted">hi</div>');
  assert.equal(host.querySelectorAll('[id]').length, 1);
  assert.equal(host.querySelectorAll('[id="status"]').length, 1);
  assert.equal(host.querySelectorAll('[id="other"]').length, 0);
  assert.equal(host.querySelectorAll('[class]').length, 1);
  assert.equal(host.querySelectorAll('div[id="status"]').length, 1);
});

test('a compound selector reads every part', () => {
  const { host } = fragment(
    '<div><button data-min="25">a</button><button>b</button><span data-min="5">c</span></div>');
  assert.equal(host.querySelectorAll('button[data-min]').length, 1);
  assert.equal(host.querySelectorAll('[data-min]').length, 2);
  assert.equal(host.querySelectorAll('button[data-min="25"]').length, 1);
  assert.equal(host.querySelectorAll('button[data-min="99"]').length, 0);
});

test('closest walks up to the nearest match, and stops', () => {
  const { host } = fragment(
    '<label class="switch-item"><span class="switch"><input id="x"></span></label>');
  const input = host.querySelectorAll('input')[0];
  assert.equal(input.closest('.switch-item').className, 'switch-item');
  assert.equal(input.closest('.switch').className, 'switch');
  assert.equal(input.closest('.nothing-like-this'), null);
});

test('a selector the matcher does not understand throws', () => {
  /* Rather than matching nothing, which reads as "the page does not have
   * that" and leaves the test green. */
  const { host } = fragment('<div><b>x</b></div>');
  assert.throws(() => host.querySelectorAll('div > b'), /unsupported selector/);
  assert.throws(() => host.querySelectorAll('b:first-child'), /unsupported selector/);
});

/* ----------------------------------------------------------- the parsing */

test('a void element does not swallow what follows it', () => {
  const { host } = fragment('<div><input id="a"><span id="b">after</span></div>');
  const box = host.children[0];
  assert.equal(box.children.length, 2, 'the input took the span inside it');
  assert.equal(box.children[1].textContent, 'after');
});

test('attributes become properties where a script would read them', () => {
  const { host } = fragment(
    '<input type="range" id="hue" min="-180" max="180" value="10" disabled>');
  const input = host.children[0];
  assert.equal(input.type, 'range');
  assert.equal(input.value, '10');
  assert.equal(input.min, '-180');
  assert.equal(input.disabled, true);
  assert.equal(input.checked, false, 'an unchecked box should read as false');
});

test('a checkbox marked checked starts checked', () => {
  const { host } = fragment('<input type="checkbox" id="on" checked>');
  assert.equal(host.children[0].checked, true);
});

test('script and style contents are text, but not markup', () => {
  /* A browser keeps both as text nodes - textContent includes a stylesheet
   * and a script body - while parsing neither as elements. Dropping them
   * would have textContent read shorter here than in the page. */
  const { host } = fragment(
    '<div><style>.a { color: red }</style><script>var x = "<b>no</b>";</script>ok</div>');
  const box = host.children[0];
  assert.equal(box.querySelectorAll('b').length, 0, 'markup inside a script was parsed');
  assert.equal(box.textContent, '.a { color: red }var x = "<b>no</b>";ok');
  assert.equal(box.querySelectorAll('style')[0].textContent, '.a { color: red }');
});

test('an entity inside a script is left exactly as written', () => {
  /* Raw text is not decoded: "&amp;" in a script is those five characters. */
  const { host } = fragment('<div><script>var s = "a &amp; b";</script></div>');
  assert.equal(host.children[0].textContent, 'var s = "a &amp; b";');
});

test('a comment is not read as markup', () => {
  const { host } = fragment('<div><!-- <b>hidden</b> -->kept</div>');
  assert.equal(host.children[0].querySelectorAll('b').length, 0);
  assert.equal(host.children[0].textContent, 'kept');
});

test('entities are decoded', () => {
  const { host } = fragment('<p>Loading&#8230; a &amp; b &lt;c&gt;</p>');
  assert.equal(host.textContent, 'Loading… a & b <c>');
});

test('every id in a page is reachable once it is built', () => {
  /* What makes the page tests worth anything: the DOM they drive is the one
   * in the file, so a control renamed in one place and not the other is a
   * failure rather than a button that does nothing. */
  const fs = require('node:fs');
  const path = require('node:path');
  ['src/popup.html', 'src/options.html'].forEach(file => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const ids = (html.match(/id="[^"]+"/g) || []).map(s => s.slice(4, -1));
    assert.ok(ids.length > 10, 'expected a page with controls in it: ' + file);

    const p = loadPage({ page: file, scripts: [], settings: {} });
    ids.forEach(id => {
      assert.ok(p.doc.getElementById(id), file + ' has no element with id ' + id);
    });
  });
});

test('a space between two elements is kept', () => {
  /* Dropped, "<b>Focus</b> <span>12:00</span>" ran together into one word
   * while a test asserting on the label saw nothing wrong. */
  const { host } = fragment('<div><b>Focus</b> <span>12:00</span></div>');
  assert.equal(host.children[0].textContent, 'Focus 12:00');
});

test('an attribute operator is refused rather than misread', () => {
  /* Left to fall through, [data-min^="2"] took the name as "data-min^", found
   * nothing under it, and returned no elements. */
  const { host } = fragment('<div><button data-min="25">a</button></div>');
  ['[data-min^="2"]', '[data-min$="5"]', '[data-min*="2"]',
   '[data-min~="25"]', '[data-min|="25"]'].forEach(sel => {
    assert.throws(() => host.querySelectorAll(sel), /unsupported attribute operator/,
      sel + ' did not throw');
  });
  /* The one that is implemented still works. */
  const { host: h2 } = fragment('<div class="theme-card wide">x</div>');
  assert.equal(h2.querySelectorAll('[class*="theme"]').length, 1);
});

test('storage hands back only the keys that were asked for', () => {
  /* Handing back everything meant a script could ask for one key, read
   * another off the answer, and get a value a browser would not have. */
  const p = loadPage({ page: 'src/popup.html', scripts: [],
                       settings: { themeId: 'concrete', enabled: true } });
  const seen = [];
  p.chrome.storage.local.get(['themeId'], s => seen.push(s));
  p.chrome.storage.local.get('enabled', s => seen.push(s));
  p.chrome.storage.local.get({ missing: 'fallback' }, s => seen.push(s));
  p.chrome.storage.local.get(null, s => seen.push(s));
  p.flush();

  assert.deepEqual(seen[0], { themeId: 'concrete' });
  assert.deepEqual(seen[1], { enabled: true });
  assert.deepEqual(seen[2], { missing: 'fallback' }, 'a default was not used');
  assert.equal(Object.keys(seen[3]).length, 2, 'null should hand back everything');
});

test('an array made inside the page is an Array there', () => {
  /* Passing this realm's intrinsics into the context shadowed the ones the
   * sandbox has, so a literal made inside carried the inner prototype while
   * the binding it was compared against was the outer one: instanceof
   * answered false in a test and true in a browser. */
  const vm = require('node:vm');
  const p = loadPage({ page: 'src/popup.html', scripts: [], settings: {} });
  assert.equal(vm.runInContext('[] instanceof Array', p.sandbox), true);
  assert.equal(vm.runInContext('({}) instanceof Object', p.sandbox), true);
  assert.equal(vm.runInContext('new Error("x") instanceof Error', p.sandbox), true);
  assert.equal(vm.runInContext('/x/ instanceof RegExp', p.sandbox), true);
});

test('a cancelled callback does not run', () => {
  /* As a no-op, clearTimeout let a cancelled callback run anyway, so a
   * debounce that clears its previous timer looked correct here whatever it
   * actually did. */
  const p = page();
  const ran = [];
  const first = p.sandbox.setTimeout(() => ran.push('first'));
  p.sandbox.setTimeout(() => ran.push('second'));
  p.sandbox.clearTimeout(first);
  p.flush();

  assert.deepEqual(ran, ['second'], 'a cancelled callback still ran');
});

test('cancelling one animation frame leaves the others', () => {
  const p = page();
  const ran = [];
  p.sandbox.requestAnimationFrame(() => ran.push('a'));
  const b = p.sandbox.requestAnimationFrame(() => ran.push('b'));
  p.sandbox.requestAnimationFrame(() => ran.push('c'));
  p.sandbox.cancelAnimationFrame(b);
  p.flush();

  assert.deepEqual(ran, ['a', 'c']);
});

test('a timer scheduled after a cancellation still gets a fresh id', () => {
  /* Ids taken from the length of a list were handed out twice once anything
   * had been removed, so cancelling one could cancel another. */
  const p = page();
  const ran = [];
  const first = p.sandbox.setTimeout(() => ran.push('first'));
  p.sandbox.clearTimeout(first);
  const second = p.sandbox.setTimeout(() => ran.push('second'));
  assert.notEqual(second, first, 'the same id was handed out twice');
  p.flush();
  assert.deepEqual(ran, ['second']);
});

test('an entity is decoded once, not read again', () => {
  /* Run as a sequence of replacements, "&amp;lt;" became "&lt;" and then "<":
   * text naming a tag turned into the tag. */
  const { host } = fragment('<p>&amp;lt; &amp;amp; &amp;#60;</p>');
  assert.equal(host.textContent, '&lt; &amp; &#60;');
});

test('an entity nobody knows is left alone', () => {
  const { host } = fragment('<p>&fake; &#0; a &amp; b</p>');
  assert.equal(host.textContent, '&fake; &#0; a & b');
});

test('a hex entity is decoded', () => {
  const { host } = fragment('<p>&#x1F34D; &#x3c;</p>');
  assert.equal(host.textContent, '\u{1F34D} <');
});

test('a script holding a comment ending does not end a comment', () => {
  /* Stripped in separate passes, what one left behind the next read as
   * markup. Skipped where they are met, neither can reach the other. */
  const { host } = fragment(
    '<div><script>var x = "-->";</script><!-- <b>hidden</b> --><i>kept</i></div>');
  const box = host.children[0];
  assert.equal(box.querySelectorAll('b').length, 0, 'a comment was read as markup');
  assert.equal(box.querySelectorAll('i').length, 1, 'what followed was lost');
  assert.ok(!/hidden/.test(box.textContent));
});

test('a comment naming a script tag does not open one', () => {
  const { host } = fragment('<div><!-- <script> --><b>after</b></div>');
  const box = host.children[0];
  assert.equal(box.querySelectorAll('b').length, 1);
  assert.equal(box.textContent, 'after');
});

test('a stylesheet holding a close tag for something else is still text', () => {
  const { host } = fragment(
    '<div><style>.a::after { content: "</div>"; }</style><b>after</b></div>');
  const box = host.children[0];
  assert.equal(box.querySelectorAll('b').length, 1, 'the stylesheet closed the div');
});

test('a doctype is skipped', () => {
  const { host } = fragment('<!DOCTYPE html><div>hi</div>');
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0].textContent, 'hi');
});

test('a stray angle bracket is text, not the start of a tag', () => {
  const { host } = fragment('<p>5 < 6 and 7 > 4</p>');
  assert.match(host.textContent, /5 < 6/);
});

test('the page body is the document body, not a body inside one', () => {
  /* Parsed straight into the body, the file's own <body> became a child of
   * it, so document.body was not the element the page declares and anything
   * written on that tag sat on a node no script would find. */
  const p = page();
  assert.equal(p.doc.body.querySelectorAll('body').length, 0,
    'there is a body inside the body');
  assert.equal(p.doc.body.querySelectorAll('html').length, 0,
    'the html element ended up inside the body');
  assert.ok(p.doc.body.querySelectorAll('#themes').length,
    'the controls are not in the document body');
});

test('what is written on the body tag lands on the document body', () => {
  const { loadPage: load } = require('./harness.js');
  const doc = load({ page: 'src/popup.html', scripts: [], settings: {} }).doc;
  /* Whatever popup.html puts on its body tag, the document body has it. */
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'popup.html'), 'utf8');
  const tag = /<body([^>]*)>/i.exec(html);
  const cls = tag && /class="([^"]*)"/.exec(tag[1]);
  if (cls) {
    cls[1].split(/\s+/).filter(Boolean).forEach(c => {
      assert.ok(doc.body.classList.contains(c),
        'the body class "' + c + '" is not on document.body');
    });
  }
  /* And the head is the document head. */
  assert.equal(doc.head.querySelectorAll('head').length, 0);
});

test('a fragment with no body of its own still lands in the body', () => {
  const { parseDocument } = require('./harness.js');
  const p = page();
  const doc = p.doc;
  doc.body.textContent = '';
  parseDocument('<div id="loose">hi</div>', doc);
  assert.ok(doc.getElementById('loose'), 'a bodyless fragment was dropped');
});

test('an event that is stopped goes no further', () => {
  /* As a no-op, a handler that stopped an event still reached every ancestor
   * listening for the same thing - so a delegated handler fired in a test
   * where the page would never have run it. */
  const { p, host } = fragment('<div id="outer"><button id="inner">x</button></div>');
  p.doc.body.appendChild(host);
  const seen = [];

  host.children[0].addEventListener('click', () => seen.push('outer'));
  const button = host.querySelectorAll('button')[0];
  /* Stopped at the button, so nothing above it hears about it. The handler
   * that stops it still runs - that is where the stop comes from. */
  button.addEventListener('click', e => {
    seen.push('inner');
    e.stopPropagation();
  });

  button.click();
  assert.deepEqual(seen, ['inner'], 'the event carried on past a stop');
});

test('an event nobody stops reaches the ancestor', () => {
  const { p, host } = fragment('<div id="outer"><button id="inner">x</button></div>');
  p.doc.body.appendChild(host);
  const seen = [];
  host.children[0].addEventListener('click', () => seen.push('outer'));
  host.querySelectorAll('button')[0].addEventListener('click', () => seen.push('inner'));

  host.querySelectorAll('button')[0].click();
  assert.deepEqual(seen, ['inner', 'outer']);
});

test('spaces around an attribute comparison do not hide the match', () => {
  const { host } = fragment('<div><button data-min="25">a</button></div>');
  assert.equal(host.querySelectorAll('[data-min = "25"]').length, 1);
  assert.equal(host.querySelectorAll('[data-min="25"]').length, 1);
  assert.equal(host.querySelectorAll('[data-min = "26"]').length, 0);
});

test('neither page relies on an event reaching the document or the window', () => {
  /* The stand-in walks from an element up through its parents and stops
   * there, so anything wired to the document or the window would be untested
   * without a test failing to say so. This is what keeps that limitation
   * honest: if a page starts using one, this fails and the harness has to
   * grow before the page can. */
  const fs = require('node:fs');
  const path = require('node:path');
  ['src/popup.js', 'src/options.js'].forEach(file => {
    const body = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(!/\bdocument\s*\.\s*addEventListener\s*\(/.test(body),
      file + ' now listens on the document, which the harness does not deliver');
    assert.ok(!/\bwindow\s*\.\s*addEventListener\s*\(/.test(body),
      file + ' now listens on the window, which the harness does not deliver');
  });
});
