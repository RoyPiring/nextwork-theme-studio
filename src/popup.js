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
      /* Choosing one shows the pane: picking something to watch and then
       * having to turn the pane on as well is a step with no meaning. */
      btn.addEventListener('click', function () {
        saveCompanion({ url: tile.url, enabled: true });
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
      $('companion-access-note').textContent = allowed
        ? host + ' is allowed to open in the pane.'
        : host + ' refuses to be shown inside another page.';
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
      const next = (r && r.allowed) ? 'companion:forget' : 'companion:allow';
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

  function toastNote(text) {
    const note = $('companion-note');
    note.textContent = text;
    setTimeout(function () {
      note.textContent = 'The pane floats on the project page. ' +
                         'Drag its bar to move it, its corner to resize.';
    }, 3200);
  }

  /* ---- wiring ---- */
  load(function () {
    renderAll();

    $('companionEnabled').addEventListener('change', function () {
      saveCompanion({ enabled: $('companionEnabled').checked });
    });
    $('companion-add').addEventListener('click', addTile);
    $('companion-access-btn').addEventListener('click', toggleAccess);
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
      saveFocus({ running: false, startedAt: 0, accumulatedMs: 0 });
    });

    $('focus-targets').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-min]');
      if (!btn) return;
      saveFocus({ targetMin: Number(btn.dataset.min) });
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
