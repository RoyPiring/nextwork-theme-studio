/* Pineapple NextWork Theme Studio Mod - full editor */
'use strict';

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const DIALS = ['hue', 'saturation', 'contrast', 'brightness'];
  const OPTION_CHECKS = ['softenShadows', 'themeScrollbars', 'accentLinks',
    'invertLogos', 'neutralizeGlows', 'patchStubborn', 'animateBackdrop', 'sceneBackdrop', 'rescuePanels'];

  let settings = null;

  /* ------------------------------------------------------------- storage */
  function load(cb) {
    chrome.storage.local.get(null, function (stored) {
      settings = Object.assign({}, NWT.cloneTheme(NWT.DEFAULT_SETTINGS), stored || {});
      settings.options = Object.assign({}, NWT.DEFAULT_SETTINGS.options, settings.options);
      settings.customThemes = settings.customThemes || {};
      settings.tuningOverrides = settings.tuningOverrides || {};
      cb();
    });
  }
  function persist(patch) {
    Object.assign(settings, patch);
    chrome.storage.local.set(patch);
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 2200);
  }

  /* ------------------------------------------------------------ forking */
  /* Presets stay read-only. The first time you touch a color on one, it
     becomes a theme of your own and the editor switches to it. */
  function ensureEditable() {
    const theme = NWT.getTheme(settings);
    if (!theme.isPreset) return settings.themeId;

    const id = 'custom-' + Date.now().toString(36);
    /* mode, backdrop and sceneKey have to come along. Without mode a light
     * theme forks to dark and every !light branch in buildCSS fires against a
     * light palette; without sceneKey the fork's new id names no scene, so the
     * scenery disappears. */
    const copy = {
      name: theme.name + ' (yours)',
      note: 'Forked from ' + theme.name,
      mode: theme.mode,
      backdrop: theme.backdrop,
      sceneKey: theme.sceneKey || settings.themeId,
      colors: NWT.cloneTheme(theme.colors),
      tuning: NWT.cloneTheme(theme.tuning),
      customCSS: theme.customCSS || ''
    };
    const customThemes = Object.assign({}, settings.customThemes);
    customThemes[id] = copy;
    persist({ customThemes: customThemes, themeId: id });
    toast('Forked "' + theme.name + '" into your own theme');
    return id;
  }

  function updateTheme(mutator) {
    const id = ensureEditable();
    const customThemes = Object.assign({}, settings.customThemes);
    const t = NWT.cloneTheme(customThemes[id]);
    mutator(t);
    customThemes[id] = t;
    persist({ customThemes: customThemes });
  }

  /* -------------------------------------------------------------- render */
  function dressUI(p) {
    const r = document.documentElement.style;
    const map = {
      '--ui-canvas': p.canvas, '--ui-surface': p.surface, '--ui-surface-alt': p.surfaceAlt,
      '--ui-border': p.border, '--ui-text': p.textPrimary, '--ui-text-dim': p.textSecondary,
      '--ui-text-muted': p.textMuted, '--ui-accent': p.accent, '--ui-accent-text': p.accentText,
      /* the mock preview reads its own set so it stays honest */
      '--pv-canvas': p.canvas, '--pv-surface': p.surface, '--pv-surface-alt': p.surfaceAlt,
      '--pv-border': p.border, '--pv-text': p.textPrimary, '--pv-text-secondary': p.textSecondary,
      '--pv-text-muted': p.textMuted, '--pv-accent': p.accent, '--pv-accent-text': p.accentText
    };
    /* Status colours come from the generated ramps, so the preview shows the
     * badges and alerts exactly as the site will render them. */
    const statusMap = { success: 'success', warning: 'warning', error: 'error', info: 'information' };
    Object.keys(statusMap).forEach(function (name) {
      const ramp = p.status[statusMap[name]];
      map['--pv-' + name + '-bg'] = ramp[50];
      map['--pv-' + name + '-border'] = ramp[200];
      map['--pv-' + name + '-fg'] = ramp[400];
    });
    Object.keys(map).forEach(k => r.setProperty(k, map[k]));
  }

  function themeCard(id, theme, isCustom) {
    const merged = NWT.getTheme(settings, id);
    const p = NWT.buildPalette(merged);
    const btn = document.createElement('button');
    btn.className = 'theme';
    btn.setAttribute('aria-current', String(id === settings.themeId));
    btn.title = theme.note || '';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = theme.name;
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
      persist({ themeId: id });
      renderAll();
    });
    return btn;
  }

  function renderSidebar() {
    const presets = $('presets');
    presets.textContent = '';
    Object.keys(NWT.PRESETS).forEach(function (id) {
      presets.appendChild(themeCard(id, NWT.PRESETS[id], false));
    });

    const customs = $('customs');
    customs.textContent = '';
    const ids = Object.keys(settings.customThemes);
    ids.forEach(function (id) {
      customs.appendChild(themeCard(id, settings.customThemes[id], true));
    });
    $('no-customs').hidden = ids.length > 0;

    const theme = NWT.getTheme(settings);
    $('delete-theme').disabled = theme.isPreset;
  }

  function renderColors(theme) {
    const host = $('colors');
    host.textContent = '';
    NWT.BASE_KEYS.forEach(function (entry) {
      const key = entry[0], label = entry[1], help = entry[2];
      const value = theme.colors[key];

      const row = document.createElement('div');
      row.className = 'color-row';

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.value = value;
      picker.setAttribute('aria-label', label);

      const text = document.createElement('div');
      text.className = 'color-label';
      const b = document.createElement('b'); b.textContent = label;
      const s = document.createElement('span'); s.textContent = help;
      text.appendChild(b); text.appendChild(s);

      const hex = document.createElement('input');
      hex.type = 'text';
      hex.className = 'hex';
      hex.value = value;
      hex.spellcheck = false;
      hex.setAttribute('aria-label', label + ' hex');

      function commit(v) {
        if (!/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v.trim())) return;
        const norm = NWT.color.rgbToHex(NWT.color.hexToRgb(v));
        updateTheme(function (t) { t.colors[key] = norm; });
        /* Not renderAll: that rebuilds these rows and removes the input the
         * pointer is inside. Mirror the value across and refresh the rest. */
        if (hex.value !== norm) hex.value = norm;
        if (picker.value !== norm) picker.value = norm;
        refreshPreview();
      }
      picker.addEventListener('input', function () { commit(picker.value); });
      hex.addEventListener('change', function () { commit(hex.value); });

      row.appendChild(picker);
      row.appendChild(text);
      row.appendChild(hex);
      host.appendChild(row);
    });
  }

  function renderDials(theme) {
    DIALS.forEach(function (k) {
      $(k).value = theme.tuning[k];
      $(k + '-out').textContent = NWT.formatDial(k, theme.tuning[k]);
    });
  }

  function renderRamp(p) {
    const host = $('ramp');
    host.textContent = '';
    Object.keys(p.ramp).forEach(function (stop) {
      const cell = document.createElement('div');
      const i = document.createElement('i');
      i.style.background = p.ramp[stop];
      i.title = '--color-gray-' + stop + ': ' + p.ramp[stop];
      const span = document.createElement('span');
      span.textContent = stop;
      cell.appendChild(i); cell.appendChild(span);
      host.appendChild(cell);
    });
  }

  function renderChecks(p) {
    const rows = [
      ['Text on canvas', p.textPrimary, p.canvas, 4.5],
      ['Text on surface', p.textPrimary, p.surface, 4.5],
      ['Secondary on surface', p.textSecondary, p.surface, 4.5],
      ['Muted on surface', p.textMuted, p.surface, 3],
      ['Border on canvas', p.border, p.canvas, 1.5],
      ['Accent on canvas', p.accent, p.canvas, 3],
      ['Accent text on accent', p.accentText, p.accent, 4.5]
    ];
    const host = $('checks');
    host.textContent = '';
    rows.forEach(function (r) {
      const ratio = NWT.color.contrastRatio(r[1], r[2]);
      const div = document.createElement('div');
      div.className = 'check-row';

      const label = document.createElement('span');
      label.textContent = r[0];

      const val = document.createElement('span');
      val.className = 'ratio';
      val.textContent = ratio.toFixed(2) + ':1';

      const verdict = document.createElement('span');
      const target = r[3];
      const ok = ratio >= target;
      const close = ratio >= target * 0.8;
      verdict.className = 'verdict ' + (ok ? 'pass' : close ? 'mid' : 'fail');
      verdict.textContent = ok ? 'pass' : close ? 'tight' : 'low';
      verdict.title = 'Target for this pairing: ' + target + ':1';

      div.appendChild(label); div.appendChild(val); div.appendChild(verdict);
      host.appendChild(div);
    });
  }

  function renderOptions() {
    const o = settings.options;
    $('dimImages').value = o.dimImages;
    $('dimImages-out').textContent = o.dimImages + '%';
    OPTION_CHECKS.forEach(function (k) { $(k).checked = !!o[k]; });
  }

  /* Everything that is safe to re-run while an input is being dragged.
   *
   * renderAll() rebuilds the nine colour rows, which removes the colour input
   * the pointer is currently inside, and dumps a freshly built stylesheet into
   * the page. Neither can happen on every `input` event. */
  function refreshPreview() {
    const theme = NWT.getTheme(settings);
    const p = NWT.buildPalette(theme);

    dressUI(p);
    document.documentElement.style.setProperty('--pv-backdrop', theme.backdrop || 'none');
    paintPreviewScene(theme);
    document.body.classList.toggle('is-light', theme.mode === 'light');
    renderSidebar();
    renderDials(theme);
    renderRamp(p);
    renderChecks(p);
    writeCssDump();
  }

  /* The generated stylesheet is 70 KB and rebuilding it is the most expensive
   * thing on this page, so it waits for the drag to stop like the dials do. */
  const writeCssDump = NWT.debounce(function () {
    const theme = NWT.getTheme(settings);
    const css = NWT.buildCSS(settings, theme);
    $('css-out').textContent = css;
    $('css-size').textContent = (css.length / 1024).toFixed(1) + ' KB';
  }, 180);

  /* A scene's hero is a wallpaper now rather than generated SVG, so asking for
   * hero.svg produced url("data:image/svg+xml,undefined") and the preview lost
   * its background entirely. */
  function paintPreviewScene(theme) {
    const scenes = (self.NWT_SCENES || {});
    const papers = (self.NWT_WALLPAPERS || {});
    const scene = settings.options.sceneBackdrop ? scenes[theme.sceneKey || theme.id] : null;
    const resolved = typeof scene === 'function'
      ? scene(NWT.buildPalette(theme), {
          toneOf: function (hex, t) { return NWT.toneOf(hex, NWT.buildPalette(theme).textPrimary, t); },
          mix: NWT.color.mix, rgba: NWT.color.rgba
        })
      : scene;
    const rs = document.documentElement.style;
    const hero = resolved && resolved.hero;
    const paper = hero && hero.wallpaper && papers[hero.wallpaper];
    rs.setProperty('--pv-scene-hero',
      paper ? 'url("' + paper.uri + '")' : (hero && hero.svg ? NWT.svgUrl(hero.svg) : 'none'));
    rs.setProperty('--pv-scene-hero-size', hero ? hero.size : 'auto');
    rs.setProperty('--pv-scene-hero-pos', hero ? hero.position : 'center');
    rs.setProperty('--pv-scene-near',
      resolved && resolved.near ? NWT.svgUrl(resolved.near.svg) : 'none');
  }

  function renderAll() {
    const theme = NWT.getTheme(settings);

    $('enabled').checked = settings.enabled;
    $('theme-name').value = theme.name;
    $('theme-name').disabled = false;
    $('theme-kind').textContent = theme.isPreset ? 'preset' : 'your theme';
    $('save-note').textContent = theme.isPreset
      ? 'Presets are read-only — editing a color makes you a copy'
      : 'Saved automatically';
    $('customCSS').value = theme.customCSS || '';

    renderColors(theme);
    renderOptions();
    refreshPreview();
  }

  /* ---------------------------------------------------------- file bits */
  function download(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* An imported theme is a file from someone else, and whatever it carries
   * ends up in the stylesheet injected into a site you are signed into. CSS is
   * not inert there: a url() in a custom rule is a live request, and attribute
   * selectors plus a background image are a well-known way to read a form field
   * out one character at a time. So the import is an allowlist, not a merge. */
  const COLOR_KEYS = ['canvas', 'surface', 'surfaceAlt', 'border',
                      'textPrimary', 'textSecondary', 'textMuted',
                      'accent', 'accentText'];
  const HEX = /^#[0-9a-fA-F]{6}$/;
  /* Both live in the engine, because the same question is asked again just
   * before the rules reach the page. A theme stored by an older version was
   * never read through here a second time. */
  const cssReachesOut = NWT.cssReachesOut;

  function cleanTheme(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('not a theme');
    const out = { colors: {} };
    if (typeof raw.name === 'string') out.name = raw.name.slice(0, 60);
    if (typeof raw.note === 'string') out.note = raw.note.slice(0, 200);
    out.mode = raw.mode === 'light' ? 'light' : 'dark';
    /* Only a scene this build actually has. An unknown value would leave the
     * theme with no scenery at all. */
    const scenes = (typeof self !== 'undefined' && self.NWT_SCENES) || {};
    if (typeof raw.sceneKey === 'string' && scenes[raw.sceneKey]) {
      out.sceneKey = raw.sceneKey;
    }

    const colors = raw.colors || {};
    COLOR_KEYS.forEach(function (k) {
      if (!HEX.test(colors[k] || '')) throw new Error('colour "' + k + '" is not a #rrggbb value');
      out.colors[k] = colors[k];
    });

    if (raw.tuning && typeof raw.tuning === 'object') {
      out.tuning = {};
      Object.keys(raw.tuning).forEach(function (k) {
        const v = Number(raw.tuning[k]);
        if (isFinite(v)) out.tuning[k] = Math.max(-100, Math.min(100, v));
      });
    }

    if (raw.customCSS) {
      const css = String(raw.customCSS);
      /* Checked as written and as the browser will read it.
       *
       * The decoded form alone would do for everything known: decoding text
       * that carries no escapes returns it unchanged. The file as typed is
       * still checked so that a fault in the decoder below cannot make this
       * weaker than it was before the decoder existed. No test can tell the
       * two apart, which is the point - both have to refuse. */
      if (cssReachesOut(css)) {
        throw new Error('custom CSS in this file can load an external resource');
      }
      out.customCSS = css.slice(0, 20000);
    }
    return out;
  }

  function importPayload(data) {
    /* Accepts a single exported theme or a whole settings backup. */
    if (data && data.kind === 'nextwork-theme' && data.theme) {
      let theme;
      try { theme = cleanTheme(data.theme); }
      catch (e) { toast('Cannot import: ' + e.message); return; }
      const id = 'custom-' + Date.now().toString(36);
      const customThemes = Object.assign({}, settings.customThemes);
      customThemes[id] = theme;
      persist({ customThemes: customThemes, themeId: id });
      toast('Imported "' + (theme.name || 'theme') + '"');
    } else if (data && data.kind === 'nextwork-theme-settings' && data.settings) {
      const restored = Object.assign({}, NWT.DEFAULT_SETTINGS, data.settings);
      const themes = {};
      try {
        Object.keys(restored.customThemes || {}).forEach(function (k) {
          themes[k] = cleanTheme(restored.customThemes[k]);
        });
      } catch (e) { toast('Cannot restore: ' + e.message); return; }
      restored.customThemes = themes;
      persist(restored);
      toast('Settings restored');
    } else {
      toast('That file is not a Theme Studio export');
      return;
    }
    renderAll();
  }

  /* ------------------------------------------------------------- wiring */
  load(function () {
    renderAll();

    $('enabled').addEventListener('change', function () {
      persist({ enabled: $('enabled').checked });
      toast($('enabled').checked ? 'Theme on' : 'Theme off');
    });

    $('theme-name').addEventListener('change', function () {
      const name = $('theme-name').value.trim() || 'Untitled';
      updateTheme(function (t) { t.name = name; });
      renderAll();
    });

    /* Same as the popup: the preview updates on every event, the write waits
     * until the drag settles. Without this every pixel of slider travel wrote
     * storage, and every write reached every open tab. */
    const writeDials = NWT.debounce(function () {
      chrome.storage.local.set({ tuningOverrides: settings.tuningOverrides });
    }, 140);
    DIALS.forEach(function (k) {
      $(k).addEventListener('input', function () {
        const value = Number($(k).value);
        const base = NWT.getTheme(settings).tuning;
        const overrides = Object.assign({}, settings.tuningOverrides);
        overrides[settings.themeId] = Object.assign({}, base, { [k]: value });
        settings.tuningOverrides = overrides;
        refreshPreview();
        writeDials();
      });
    });

    $('dimImages').addEventListener('input', function () {
      const options = Object.assign({}, settings.options, { dimImages: Number($('dimImages').value) });
      persist({ options: options });
      renderAll();
    });
    OPTION_CHECKS.forEach(function (k) {
      $(k).addEventListener('change', function () {
        const options = Object.assign({}, settings.options);
        options[k] = $(k).checked;
        persist({ options: options });
        renderAll();
      });
    });

    let cssTimer = null;
    $('customCSS').addEventListener('input', function () {
      clearTimeout(cssTimer);
      const value = $('customCSS').value;
      cssTimer = setTimeout(function () {
        updateTheme(function (t) { t.customCSS = value; });
        renderAll();
      }, 400);
    });

    $('new-theme').addEventListener('click', function () {
      const theme = NWT.getTheme(settings);
      const id = 'custom-' + Date.now().toString(36);
      const customThemes = Object.assign({}, settings.customThemes);
      customThemes[id] = {
        name: theme.name.replace(/ \(yours\)$/, '') + ' copy',
        note: 'Copy of ' + theme.name,
        mode: theme.mode,
        backdrop: theme.backdrop,
        sceneKey: theme.sceneKey || settings.themeId,
        colors: NWT.cloneTheme(theme.colors),
        tuning: NWT.cloneTheme(theme.tuning),
        customCSS: theme.customCSS || ''
      };
      persist({ customThemes: customThemes, themeId: id });
      renderAll();
      toast('New theme created');
    });

    $('delete-theme').addEventListener('click', function () {
      const theme = NWT.getTheme(settings);
      if (theme.isPreset) return;
      if (!confirm('Delete "' + theme.name + '"? This cannot be undone.')) return;
      const customThemes = Object.assign({}, settings.customThemes);
      delete customThemes[settings.themeId];
      const overrides = Object.assign({}, settings.tuningOverrides);
      delete overrides[settings.themeId];
      persist({ customThemes: customThemes, tuningOverrides: overrides, themeId: 'concrete' });
      renderAll();
      toast('Deleted');
    });

    $('export-theme').addEventListener('click', function () {
      const theme = NWT.getTheme(settings);
      const payload = {
        kind: 'nextwork-theme',
        version: 1,
        theme: {
          name: theme.name,
          note: theme.note || '',
          mode: theme.mode,
          sceneKey: theme.sceneKey,
          colors: theme.colors,
          tuning: theme.tuning,
          customCSS: theme.customCSS || ''
        }
      };
      download(theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.nwtheme.json',
        JSON.stringify(payload, null, 2));
    });

    $('import-theme').addEventListener('click', function () { $('file-input').click(); });
    $('file-input').addEventListener('change', function () {
      const file = $('file-input').files[0];
      if (!file) return;
      file.text().then(function (text) {
        try { importPayload(JSON.parse(text)); }
        catch (e) { toast('That file is not valid JSON'); }
      }, function () {
        toast('Could not read that file');
      });
      $('file-input').value = '';
    });

    $('reset-all').addEventListener('click', function () {
      if (!confirm('Reset every setting and delete all your themes?')) return;
      chrome.storage.local.clear(function () {
        chrome.storage.local.set(NWT.DEFAULT_SETTINGS, function () {
          load(function () { renderAll(); toast('Back to defaults'); });
        });
      });
    });

    $('copy-css').addEventListener('click', function () {
      /* Clipboard access can be refused, and a rejection with no handler is
       * invisible: the toast never appears and nothing says why. */
      const copy = navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText($('css-out').textContent)
        : Promise.reject(new Error('no clipboard'));
      copy.then(function () {
        toast('Stylesheet copied');
      }, function () {
        toast('Could not copy. Select the text and copy it by hand.');
      });
    });
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (!settings) return;              /* a change can land before load() returns */
    /* Only react to changes made elsewhere (the popup or the shortcut). */
    if (area === 'local' && changes.enabled) {
      settings.enabled = changes.enabled.newValue;
      $('enabled').checked = settings.enabled;
    }
  });
})();
