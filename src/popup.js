/* Pineapple NextWork Theme Studio Mod - popup */
'use strict';

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const DIALS = ['hue', 'saturation', 'contrast', 'brightness'];

  let settings = null;

  /* Same reasoning as the content script: the popup re-reads on every change,
   * and two reads in flight can come back in either order. */
  let readSeq = 0;

  /* chrome.storage reports failure by setting runtime.lastError rather than
   * throwing, so it has to be read or the failure is silent. */
  function storageFailed(what) {
    if (!chrome.runtime.lastError) return false;
    console.warn('[nwt] ' + what + ': ' + chrome.runtime.lastError.message);
    return true;
  }

  function load(cb) {
    const mine = ++readSeq;
    chrome.storage.local.get(null, function (stored) {
      if (storageFailed('could not read settings')) return;
      if (mine !== readSeq) return;
      settings = NWT.migrate(Object.assign({}, NWT.DEFAULT_SETTINGS, stored || {}));
      /* migrate() only reports; persisting is the caller's job. Without this
       * the same migration reruns on every open and clears the dials again. */
      if (settings.migrated) {
        delete settings.migrated;
        chrome.storage.local.set({ schema: settings.schema, tuningOverrides: {} });
      }
      settings.options = Object.assign({}, NWT.DEFAULT_SETTINGS.options, settings.options);
      cb();
    });
  }
  function save(patch) {
    Object.assign(settings, patch);
    chrome.storage.local.set(patch, function () { storageFailed('could not save'); });
  }

  /* The popup wears the theme you are editing. */
  function dressUI(theme) {
    const p = NWT.buildPalette(theme);
    const r = document.documentElement.style;
    r.setProperty('--ui-canvas', p.canvas);
    r.setProperty('--ui-surface', p.surface);
    r.setProperty('--ui-surface-alt', p.surfaceAlt);
    r.setProperty('--ui-border', p.border);
    r.setProperty('--ui-text', p.textPrimary);
    r.setProperty('--ui-text-dim', p.textSecondary);
    r.setProperty('--ui-text-muted', p.textMuted);
    r.setProperty('--ui-accent', p.accent);
    r.setProperty('--ui-accent-text', p.accentText);
    /* The same colour the pill on the page turns when a session runs over.
     * It was a fixed value here and a palette colour there, so one state had
     * two colours depending on where you were looking at it. */
    r.setProperty('--ui-over', p.status.error[400]);
  }

  function allThemes() {
    const list = [];
    Object.keys(NWT.PRESETS).forEach(id => list.push({ id: id, theme: NWT.PRESETS[id], custom: false }));
    Object.keys(settings.customThemes || {}).forEach(id =>
      list.push({ id: id, theme: settings.customThemes[id], custom: true }));
    return list;
  }

  function renderThemes() {
    const host = $('themes');
    host.textContent = '';
    allThemes().forEach(function (entry) {
      const merged = NWT.getTheme(settings, entry.id);
      const p = NWT.buildPalette(merged);
      const btn = document.createElement('button');
      btn.className = 'theme';
      btn.setAttribute('aria-current', String(entry.id === settings.themeId));
      btn.title = entry.theme.note || (entry.custom ? 'Your theme' : '');

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = entry.theme.name + (entry.custom ? ' · yours' : '');
      btn.appendChild(name);

      const sw = document.createElement('div');
      sw.className = 'swatches';
      [p.canvas, p.surface, p.border, p.textSecondary, p.accent].forEach(function (c) {
        const i = document.createElement('i');
        i.style.background = c;
        sw.appendChild(i);
      });
      btn.appendChild(sw);

      btn.addEventListener('click', function () {
        save({ themeId: entry.id });
        renderAll();
      });
      host.appendChild(btn);
    });
  }

  function currentTuning() {
    return NWT.getTheme(settings).tuning;
  }

  function renderDials() {
    const t = currentTuning();
    DIALS.forEach(function (k) {
      $(k).value = t[k];
      $(k + '-out').textContent = NWT.formatDial(k, t[k]);
    });
    const theme = NWT.getTheme(settings);
    $('dial-note').textContent = theme.isPreset
      ? 'Dials are saved per theme'
      : 'Editing your theme';
  }

  function renderAll() {
    const theme = NWT.getTheme(settings);
    document.body.classList.toggle('off', !settings.enabled);
    $('enabled').checked = settings.enabled;
    $('sceneBackdrop').checked = !!settings.options.sceneBackdrop;
    /* A theme with no scenery would leave the switch doing nothing visible. */
    const hasScene = !!(self.NWT_SCENES || {})[theme.sceneKey || theme.id];
    $('sceneBackdrop').disabled = !hasScene;
    $('sceneBackdrop').closest('.switch-item').style.opacity = hasScene ? '' : '0.45';
    $('status').textContent = settings.enabled
      ? theme.name + ' · on'
      : 'Theme off · Alt+Shift+D';
    dressUI(theme);
    renderThemes();
    renderDials();
    renderFocus();
    renderCompanion();
    renderWindows();
    renderSplitPanel();
  }

  /* A range input fires on every pixel of travel. Writing storage on each one
   * put a change event on every open nextwork.ai tab, and each of those rebuilt
   * both stylesheets and re-walked the DOM. Dragging one slider drove a restyle
   * storm across every tab.
   *
   * The local preview still updates on every event, so dragging feels the same.
   * Only the write is held back. */
  const writeDials = NWT.debounce(function () {
    chrome.storage.local.set({ tuningOverrides: settings.tuningOverrides });
  }, 140);

  function onDial(k) {
    const value = Number($(k).value);
    const overrides = Object.assign({}, settings.tuningOverrides);
    const base = NWT.getTheme(settings).tuning;
    overrides[settings.themeId] = Object.assign({}, base, { [k]: value });

    /* Update in memory now so the UI is live, persist once the drag settles. */
    settings.tuningOverrides = overrides;
    const theme = NWT.getTheme(settings);
    dressUI(theme);
    renderDials();
    renderThemes();

    writeDials();
  }

  /* Somewhere other than where you already are. Picking from the full list
   * would land on the current theme now and then, which reads as the button
   * being broken rather than as a coincidence. */
  function randomThemeId() {
    const ids = allThemes().map(function (e) { return e.id; })
      .filter(function (id) { return id !== settings.themeId; });
    if (!ids.length) return settings.themeId;
    return ids[Math.floor(Math.random() * ids.length)];
  }

  /* ---- focus ---- */
  function focusState() {
    return Object.assign({}, NWT.DEFAULT_SETTINGS.focus, settings.focus);
  }

  function saveFocus(patch) {
    const focus = Object.assign({}, focusState(), patch);
    save({ focus: focus });
    renderFocus();
  }

  let focusTick = null;

  function renderFocus() {
    const f = focusState();
    const counting = f.targetMin > 0;
    const value = counting ? NWT.focusRemaining(f) : NWT.focusElapsed(f);
    const state = !f.running ? 'paused' : (counting && value < 0 ? 'over' : 'running');

    $('focus-clock').textContent = NWT.formatDuration(value);
    $('focus-panel').setAttribute('data-state', state);
    $('focus-state').textContent =
      state === 'over' ? 'over target' : state === 'running' ? 'running' : 'paused';
    $('focus-toggle').textContent = f.running ? 'Pause' : (NWT.focusElapsed(f) ? 'Resume' : 'Start');
    $('focusEnabled').checked = !!f.enabled;
    $('focus-locked').checked = !!f.locked;
    $('focus-chime').checked = !!f.chime;
    $('focus-size').value = String(Math.round((f.hudScale || 1) * 100));
    $('focus-size-out').textContent = $('focus-size').value + '%';

    [...$('focus-targets').querySelectorAll('button')].forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.min) === f.targetMin));
    });

    if (focusTick) { clearInterval(focusTick); focusTick = null; }
    if (f.running) focusTick = setInterval(renderFocus, 1000);
  }

  /* ---- the companion pane ---- */

  function companionState() {
    return Object.assign({}, NWT.DEFAULT_SETTINGS.companion, settings.companion);
  }

  function saveCompanion(patch) {
    const companion = Object.assign({}, companionState(), patch);
    save({ companion: companion });
    renderCompanion();
  }

  function renderCompanion() {
    const c = companionState();
    const tiles = Array.isArray(c.tiles) ? c.tiles : [];

    $('companionEnabled').checked = !!c.enabled;
    $('companion-empty').style.display = tiles.length ? 'none' : '';

    const host = $('companion-tiles');
    host.textContent = '';
    tiles.forEach(function (tile) {
      /* Two real buttons side by side rather than one inside the other. A
       * button nested in a button is invalid, and the browser gives the inner
       * one no keyboard activation of its own - so reaching the × with Tab and
       * pressing Enter used to fire the outer button and switch to the tile
       * instead of removing it. */
      const group = document.createElement('span');
      group.className = 'tile';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile-go';
      btn.title = tile.url;
      /* Which one is in the pane now, said the same way the session lengths
       * say which is chosen. */
      btn.setAttribute('aria-pressed', String(tile.url === c.url));
      btn.textContent = tile.label;
      if (tile.windowed) {
        btn.classList.add('windowed');
        btn.title = tile.url +
                    ' - opens in a window of its own.' +
                    ' Shift-click to try it in the pane again.';
      }
      /* Choosing one shows the pane: picking something to watch and then
       * having to turn the pane on as well is a step with no meaning.
       *
       * Unless it is one of the marked ones - a site that will not run inside
       * another page - in which case choosing it means opening its window,
       * because that is where it works. Shift undoes the mark, for a site
       * that was marked by mistake or has since changed. */
      btn.addEventListener('click', function (e) {
        if (tile.windowed && !e.shiftKey) {
          chrome.runtime.sendMessage({
            type: 'companion:window', url: NWT.companionSrc(tile.url) || tile.url,
            w: c.w, h: c.h
          }, function () { void chrome.runtime.lastError; });
          return;
        }
        const next = tiles.map(function (t) {
          return t.url === tile.url ? Object.assign({}, t, { windowed: false }) : t;
        });
        saveCompanion({ url: tile.url, enabled: true,
                        tiles: e.shiftKey ? next : tiles });
      });

      /* Its own control rather than a second click target on the tile: a row
       * of things you go to should not lose one when you miss. */
      const drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'drop';
      drop.title = 'Remove ' + tile.label;
      drop.setAttribute('aria-label', 'Remove ' + tile.label);
      drop.textContent = '×';
      drop.addEventListener('click', function () {
        saveCompanion({
          tiles: tiles.filter(function (t) { return t.url !== tile.url; }),
          url: c.url === tile.url ? '' : c.url
        });
      });

      group.appendChild(btn);
      group.appendChild(drop);
      host.appendChild(group);
    });

    renderAccess(c);
  }

  /* Whether the site in the pane has been allowed to be shown inside a page,
   * and the control that asks for it. Most sites refuse to be framed, and the
   * refusal is theirs - so the only honest options are to ask the browser for
   * permission to set that aside for this one frame, or to open the site in a
   * window of its own. Both are offered; neither happens quietly. */
  function renderAccess(c) {
    const row = $('companion-access');
    /* `pending` is set when the pane's own button sent you here, and names the
     * site you were looking at. It wins over whatever the pane is pointed at
     * now, because it is the question you actually asked. */
    const src = NWT.companionSrc(c.pending || c.url);

    if (!src || NWT.framesFreely(src)) { row.style.display = 'none'; return; }
    row.style.display = '';
    row.setAttribute('data-asked', c.pending ? '1' : '0');

    chrome.runtime.sendMessage({ type: 'companion:allowed', url: src }, function (r) {
      if (chrome.runtime.lastError) return;
      const allowed = !!(r && r.allowed);
      const host = (r && r.origin ? r.origin : src).replace(/^https:\/\//, '');
      /* Allowed but not active means the permission is held and no rule is
       * carrying it - which looks exactly like being blocked, from the page. */
      $('companion-access-note').textContent = !allowed
        ? host + ' refuses to be shown inside another page.'
        : r.active
          ? host + ' is allowed to open in the pane.'
          : host + ' is allowed, but the rule that carries it is missing. ' +
            'Take it back and allow it again.';
      const btn = $('companion-access-btn');
      btn.textContent = allowed ? 'Take it back' : 'Allow ' + host;
      btn.title = allowed
        ? 'Stop opening ' + host + ' in the pane, and remove its permission'
        : 'Ask the browser for permission to open ' + host + ' in the pane';
      /* Put the cursor on the answer, so pressing Enter is enough for someone
       * who arrived here from the pane with one question. */
      if (c.pending && !allowed) btn.focus();
    });
  }

  /* The prompt the browser shows has to follow a click, which is why this is
   * wired to a button rather than done for you when a link is added. */
  function toggleAccess() {
    const c = companionState();
    const asked = c.pending || c.url;
    const src = NWT.companionSrc(asked);
    if (!src) return;

    chrome.runtime.sendMessage({ type: 'companion:allowed', url: src }, function (r) {
      if (chrome.runtime.lastError) return;
      /* Granting is done on the options page, never from here.
       *
       * `permissions.request` has to come from an extension page in response
       * to a click, and a popup is one - but the browser closes the popup to
       * put its own prompt on screen, and closing the page cancels the request
       * that page made. Nothing is granted and nothing reports a failure. Every
       * click of this button did exactly that, for weeks, while the frame it
       * was meant to unblock stayed empty. */
      if (!(r && r.allowed)) {
        saveCompanion({ pending: src });
        chrome.runtime.openOptionsPage();
        window.close();
        return;
      }
      const next = 'companion:forget';
      chrome.runtime.sendMessage({ type: next, url: src }, function (done) {
        if (chrome.runtime.lastError) return;
        const granted = next === 'companion:allow' && !!(done && done.allowed);
        /* The pane caches what it was told, so it is told that this changed.
         * Without it, allowing a site would leave an open page sitting on its
         * refusal until something else happened to move. The question is
         * cleared at the same time: it has now been answered either way.
         *
         * Being granted also puts the site in the pane, because arriving here
         * from the pane's own button is not a request to change a setting - it
         * is a request to see the thing. */
        const patch = { grantedAt: Date.now(), pending: '' };
        if (granted && c.pending) { patch.url = c.pending; patch.enabled = true; }
        saveCompanion(patch);
        if (next === 'companion:allow' && !granted) {
          toastNote('The browser did not grant that. It can be opened in a window instead.');
        }
      });
    });
  }

  function addTile() {
    const field = $('companion-url');
    const raw = field.value.trim();
    const src = NWT.companionSrc(raw);

    if (!src) {
      field.setAttribute('aria-invalid', 'true');
      /* Worded without the scheme spelled out. The audit forbids a remote
       * address in shipped code and it is right to: an exception for prose
       * is an exception, and the sentence reads the same either way. */
      toastNote('That needs to be a full web address, starting with https.');
      return;
    }
    field.removeAttribute('aria-invalid');

    const c = companionState();
    const tiles = (Array.isArray(c.tiles) ? c.tiles : [])
      .filter(function (t) { return t.url !== raw; });
    tiles.push({ label: labelFor(raw), url: raw });

    field.value = '';
    saveCompanion({ tiles: tiles, url: raw, enabled: true });
  }

  /* A short name from the address, since typing one for every link is a
   * chore and the host is what a person recognises anyway. */
  function labelFor(raw) {
    try {
      const host = new URL(raw).hostname.replace(/^www\./, '');
      if (host === 'youtu.be' || /(^|\.)youtube\.com$/.test(host)) return 'YouTube';

      /* The name, not the first thing before a dot. Taking the first label
       * turned app.slack.com into "app" and mail.google.com into "mail",
       * which names the subdomain rather than the site. The part before the
       * public suffix is the one people recognise; two-part suffixes like
       * .co.uk are the reason that is not simply the second-to-last. */
      const parts = host.split('.');
      const twoPart = /^(co|com|org|net|gov|ac|edu)$/;
      const i = parts.length > 2 && twoPart.test(parts[parts.length - 2])
        ? parts.length - 3 : parts.length - 2;
      const name = parts[Math.max(0, i)] || host;
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch (e) {
      return 'Link';
    }
  }

/* ---- tabs ----
   * Three things live in this popup and they are not related to each other:
   * how the site looks, a timer, and what sits beside the page. In one column
   * you scrolled past two features to reach the third.
   *
   * Which tab is showing is not a setting - it is where you were a moment ago
   * - so it is kept beside the popup rather than written in with the themes. */
  function showTab(name) {
    ['theme', 'focus', 'split'].forEach(function (id) {
      $('tab-' + id).setAttribute('aria-selected', String(id === name));
      $('panel-' + id).hidden = id !== name;
    });
    try { localStorage.setItem('nwt-tab', name); } catch (e) { /* private mode */ }
  }

  /* ---- the split ---- */
  function splitState() {
    return Object.assign({}, NWT.DEFAULT_SETTINGS.split, settings.split);
  }

  function saveSplit(patch) {
    const next = Object.assign({}, splitState(), patch);
    save({ split: next });
    renderSplitPanel();
    return next;
  }

  function renderSplitPanel() {
    const sp = splitState();
    $('splitEnabled').checked = !!sp.enabled;
    /* Not while it is being typed into, or every keystroke is overwritten by
     * whatever was last saved. */
    if (document.activeElement !== $('split-url')) $('split-url').value = sp.url || '';
    const pct = Math.round(Math.max(0.18, Math.min(0.72, Number(sp.width) || 0.36)) * 100);
    $('split-width').value = String(pct);
    $('split-width-out').textContent = pct + '%';
  }

  function setSplitLink() {
    const field = $('split-url');
    const raw = field.value.trim();
    if (!NWT.companionSrc(raw)) {
      field.setAttribute('aria-invalid', 'true');
      toastNote('That needs to be a full web address, starting with https.', 'split-note');
      return;
    }
    field.removeAttribute('aria-invalid');
    /* Choosing something to show is the whole instruction; turning the split
     * on afterwards would be a second step with no meaning of its own. */
    saveSplit({ url: raw, enabled: true });
  }

/* ---- beside the page ----
   *
   * Real windows, not a frame. The pane above puts a site inside the page,
   * which only works for sites that publish something meant to be embedded.
   * These are for everything else - the applications that refuse to be
   * embedded at all, where the refusal is about being inside another page and
   * a window of their own is not. */
  function windowsState() {
    return Object.assign({}, NWT.DEFAULT_SETTINGS.windows, settings.windows);
  }

  function saveWindows(patch) {
    const next = Object.assign({}, windowsState(), patch);
    save({ windows: next });
    renderWindows();
    return next;
  }

  /* The screen this popup is on, which is the screen the page is on. Read here
   * rather than in the worker because reading it properly there needs a
   * permission this extension does not want. availWidth and availLeft, so a
   * taskbar counts as space taken rather than space to hide a window under. */
  function screenArea() {
    return { left: screen.availLeft | 0, top: screen.availTop | 0,
             width: screen.availWidth, height: screen.availHeight };
  }

  function arrange(state) {
    const w = state || windowsState();
    if (!w.enabled) return;
    const urls = (w.items || []).filter(it => it && it.on)
      .map(it => NWT.companionSrc(it.url) || it.url).slice(0, 4);
    chrome.runtime.sendMessage({
      type: 'windows:arrange', screen: screenArea(), split: w.split, urls: urls
    }, function () { void chrome.runtime.lastError; });
  }

  function renderWindows() {
    const w = windowsState();
    const items = Array.isArray(w.items) ? w.items : [];

    $('windowsEnabled').checked = !!w.enabled;
    $('windows-empty').style.display = items.length ? 'none' : '';
    $('windows-split').value = String(w.split);
    $('windows-split-out').textContent = w.split + '%';

    const host = $('windows-list');
    host.textContent = '';
    items.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'row between beside-item';

      const label = document.createElement('label');
      label.className = 'check tiny grow';
      label.title = item.url;
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !!item.on;
      /* Four is the ceiling: a quarter of a screen is usable, a sixth is not.
       * The ones already on stay clickable so you can swap. */
      const open = items.filter(it => it.on).length;
      box.disabled = !item.on && open >= 4;
      box.addEventListener('change', function () {
        const next = items.map(function (it) {
          return it.url === item.url ? Object.assign({}, it, { on: box.checked }) : it;
        });
        /* Turning one on implies wanting them arranged; nobody adds a window
         * and then goes looking for a second switch. */
        const state = saveWindows({ items: next, enabled: box.checked || w.enabled });
        if (box.checked) arrange(state);
        else chrome.runtime.sendMessage(
          { type: 'windows:close', url: NWT.companionSrc(item.url) || item.url },
          function () { void chrome.runtime.lastError; arrange(state); });
      });
      label.appendChild(box);
      const name = document.createElement('span');
      name.textContent = ' ' + item.label;
      label.appendChild(name);
      row.appendChild(label);

      const drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'drop';
      drop.title = 'Remove ' + item.label;
      drop.setAttribute('aria-label', 'Remove ' + item.label);
      drop.textContent = '×';
      drop.addEventListener('click', function () {
        saveWindows({ items: items.filter(it => it.url !== item.url) });
        chrome.runtime.sendMessage(
          { type: 'windows:close', url: NWT.companionSrc(item.url) || item.url },
          function () { void chrome.runtime.lastError; });
      });
      row.appendChild(drop);
      host.appendChild(row);
    });
  }

  function addWindowLink() {
    const field = $('windows-url');
    const raw = field.value.trim();
    if (!NWT.companionSrc(raw)) {
      field.setAttribute('aria-invalid', 'true');
      toastNote('That needs to be a full web address, starting with https.', 'windows-note');
      return;
    }
    field.removeAttribute('aria-invalid');
    const w = windowsState();
    const items = (Array.isArray(w.items) ? w.items : [])
      .filter(function (it) { return it.url !== raw; });
    items.push({ label: labelFor(raw), url: raw, on: true });
    field.value = '';
    const state = saveWindows({ items: items, enabled: true });
    arrange(state);
  }

  function toastNote(text, target) {
    const note = $(target || 'companion-note');
    const settled = note.textContent;
    note.textContent = text;
    setTimeout(function () { note.textContent = settled; }, 3200);
  }

  /* ---- wiring ---- */
  load(function () {
    renderAll();

    $('companionEnabled').addEventListener('change', function () {
      saveCompanion({ enabled: $('companionEnabled').checked });
    });
    $('companion-add').addEventListener('click', addTile);
    $('companion-access-btn').addEventListener('click', toggleAccess);

    $('windowsEnabled').addEventListener('change', function () {
      const on = $('windowsEnabled').checked;
      const state = saveWindows({ enabled: on });
      if (on) arrange(state);
      else chrome.runtime.sendMessage({ type: 'windows:restore' },
        function () { void chrome.runtime.lastError; load(renderAll); });
    });
    ['theme', 'focus', 'split'].forEach(function (name) {
      $('tab-' + name).addEventListener('click', function () { showTab(name); });
    });
    let opening = 'theme';
    try { opening = localStorage.getItem('nwt-tab') || 'theme'; } catch (e) { /* private mode */ }
    showTab(['theme', 'focus', 'split'].indexOf(opening) === -1 ? 'theme' : opening);

    $('splitEnabled').addEventListener('change', function () {
      saveSplit({ enabled: $('splitEnabled').checked });
    });
    $('split-set').addEventListener('click', setSplitLink);
    $('split-url').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') setSplitLink();
    });
    /* Held back like the other sliders: a range fires on every pixel, and each
     * write reaches every open tab. The divider on the page itself is what
     * this is for when you want to see it move. */
    const writeWidth = NWT.debounce(function () {
      saveSplit({ width: Number($('split-width').value) / 100 });
    }, 160);
    $('split-width').addEventListener('input', function () {
      $('split-width-out').textContent = $('split-width').value + '%';
      writeWidth();
    });

    $('windows-add').addEventListener('click', addWindowLink);
    $('windows-url').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addWindowLink();
    });
    /* Held back like the other sliders: a range fires on every pixel, and each
     * write here would move every window on the screen. */
    const writeSplit = NWT.debounce(function () {
      arrange(saveWindows({ split: Number($('windows-split').value) }));
    }, 200);
    $('windows-split').addEventListener('input', function () {
      $('windows-split-out').textContent = $('windows-split').value + '%';
      writeSplit();
    });
    $('companion-url').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addTile();
    });

    $('enabled').addEventListener('change', function () {
      save({ enabled: $('enabled').checked });
      renderAll();
    });

    /* ---- focus timer -------------------------------------------------
     * Every control writes timestamps to storage; the popup only ever reads
     * the clock. That way closing the popup, switching tabs or restarting the
     * browser cannot lose or double-count time. */
    $('focusEnabled').addEventListener('change', function () {
      saveFocus({ enabled: $('focusEnabled').checked });
    });

    $('focus-toggle').addEventListener('click', function () {
      const f = focusState();
      if (f.running) {
        /* bank what has elapsed, then stop the clock */
        saveFocus({ running: false, accumulatedMs: NWT.focusElapsed(f), startedAt: 0 });
      } else {
        saveFocus({ running: true, startedAt: Date.now(), enabled: true });
      }
    });

    /* Same reason the tuning dials are held back: a range input fires on every
     * pixel of travel, and each write reaches every open tab. The readout
     * updates on every event so the drag still feels live. */
    const writeSize = NWT.debounce(function () {
      saveFocus({ hudScale: Number($('focus-size').value) / 100 });
    }, 140);
    $('focus-size').addEventListener('input', function () {
      $('focus-size-out').textContent = $('focus-size').value + '%';
      writeSize();
    });

    $('random-theme').addEventListener('click', function () {
      save({ themeId: randomThemeId() });
      renderAll();
    });

    $('focus-chime').addEventListener('change', function () {
      saveFocus({ chime: $('focus-chime').checked });
    });

    $('focus-locked').addEventListener('change', function () {
      saveFocus({ locked: $('focus-locked').checked });
    });

    $('focus-reset').addEventListener('click', function () {
      /* `chimedFor` says this session has already been announced. Reset is one
       * of the two things that begins a new one, so it is cleared here. It is
       * deliberately not cleared by pause and resume: the clock has to move
       * `startedAt` forward to keep adding up, which made a resumed session
       * indistinguishable from a fresh one, and rang for the same end twice. */
      saveFocus({ running: false, startedAt: 0, accumulatedMs: 0, chimedFor: 0 });
    });

    $('focus-targets').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-min]');
      if (!btn) return;
      /* The other thing that begins a new session: a different length is a
       * different end to reach, and it has not been announced yet.
       *
       * Only when it actually differs. Clicking the length that is already
       * chosen changes nothing about the session, and clearing the marker
       * there re-announced an end that had already been announced - the same
       * fault the resume path was fixed for, through another door. */
      const chosen = Number(btn.dataset.min);
      const patch = { targetMin: chosen };
      if (chosen !== focusState().targetMin) patch.chimedFor = 0;
      saveFocus(patch);
    });

    $('sceneBackdrop').addEventListener('change', function () {
      const options = Object.assign({}, settings.options, { sceneBackdrop: $('sceneBackdrop').checked });
      save({ options: options });
      renderAll();
    });

    DIALS.forEach(function (k) {
      $(k).addEventListener('input', function () { onDial(k); });
    });

    $('reset-dials').addEventListener('click', function () {
      const overrides = Object.assign({}, settings.tuningOverrides);
      delete overrides[settings.themeId];
      save({ tuningOverrides: overrides });
      renderAll();
    });

    $('open-editor').addEventListener('click', function () {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    $('reload-tab').addEventListener('click', function () {
      chrome.tabs.reload();
      window.close();
    });
  });

  /* Keep in step if the shortcut or the editor changes things. */
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local') load(renderAll);
  });
})();
