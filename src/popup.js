/* Pineapple NextWork Theme Studio Mod - popup */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const DIALS = ['hue', 'saturation', 'contrast', 'brightness'];

  let settings = null;

  function load(cb) {
    chrome.storage.local.get(null, function (stored) {
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
    chrome.storage.local.set(patch);
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
  }

  function onDial(k) {
    const value = Number($(k).value);
    const overrides = Object.assign({}, settings.tuningOverrides);
    const base = NWT.getTheme(settings).tuning;
    overrides[settings.themeId] = Object.assign({}, base, { [k]: value });
    save({ tuningOverrides: overrides });
    const theme = NWT.getTheme(settings);
    dressUI(theme);
    renderDials();
    renderThemes();
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

    [...$('focus-targets').querySelectorAll('button')].forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.min) === f.targetMin));
    });

    if (focusTick) { clearInterval(focusTick); focusTick = null; }
    if (f.running) focusTick = setInterval(renderFocus, 1000);
  }

  /* ---- wiring ---- */
  load(function () {
    renderAll();

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
