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
    renderSplitPanel();
    renderSplitAccess();
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
  /* The three offered outright. Anything else is a custom length, which is
   * how the box below knows whether to show itself. */
  const PRESET_MINUTES = [15, 30, 60];
  /* Whether the custom box is open because it was asked for, rather than
   * because the length in force happens not to be one of the three. */
  let customOpen = false;

  /* A different length is a different end to reach, and it has not been
   * announced yet - but only when it actually differs. Setting the length
   * already in force changes nothing about the session, and clearing the
   * marker there re-announced an end that had already been announced. */
  function setLength(minutes) {
    const f = focusState();
    const patch = { targetMin: minutes, downMin: minutes };
    if (minutes !== f.targetMin) patch.chimedFor = 0;
    saveFocus(patch);
  }

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

    /* Which way it runs, said in words. "Open" meant counting up, which is
     * only obvious once you have pressed it and watched the clock go the
     * wrong way. */
    [...$('focus-way').querySelectorAll('button')].forEach(function (b) {
      b.setAttribute('aria-pressed', String((b.dataset.way === 'up') === !counting));
    });
    $('focus-targets').hidden = !counting;

    /* Four lengths rather than six and a spare: three that cover almost every
     * session, and one that admits the rest exists. */
    const preset = PRESET_MINUTES.indexOf(f.targetMin) !== -1;
    [...$('focus-targets').querySelectorAll('button')].forEach(function (b) {
      const m = Number(b.dataset.min);
      b.setAttribute('aria-pressed',
        String(m < 0 ? (counting && !preset) : m === f.targetMin));
    });

    /* The box stays open while it is being typed in, and otherwise appears
     * only when the length in force is not one of the three. */
    const showCustom = counting && (customOpen || !preset);
    $('focus-custom-row').hidden = !showCustom;
    if (!customOpen) {
      $('focus-custom-min').value =
        String(counting && f.targetMin ? f.targetMin : (f.downMin || 25));
    }

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

  /* Which floating panes are open. Two is the point of a list - one thing you
   * are watching and one you are talking in - and three is where a page has
   * more of the extension on it than of itself. */
  const MAX_PANES = 3;
  /* How far each new pane lands from the one before it, as a fraction of the
   * step the page turns it into. A tenth of that step was about ten pixels,
   * which is close enough to landing on top of it that the second pane read
   * as nothing having happened - which is the thing the stagger exists to
   * prevent. This is a window cascade: enough to see the one underneath. */
  const CASCADE = 0.12;

  function openPanes() {
    const c = companionState();
    return (Array.isArray(c.panes) ? c.panes : [])
      .filter(function (x) { return x && typeof x.url === 'string'; });
  }

  function togglePane(url) {
    const panes = openPanes();
    const already = panes.some(function (x) { return x.url === url; });
    if (already) {
      const rest = panes.filter(function (x) { return x.url !== url; });
      saveCompanion({ panes: rest, url: '', enabled: rest.length > 0 });
      return;
    }
    if (panes.length >= MAX_PANES) {
      toastNote('Three panes is as many as a page can hold and stay usable.');
      return;
    }
    /* Each one opens a little below and right of the last, so a second does
     * not land exactly on the first and look like nothing happened. */
    saveCompanion({
      enabled: true,
      panes: panes.concat([{ url: url, x: null, y: null, w: 380, h: 260,
                             offset: panes.length * CASCADE }])
    });
  }

  /* What is open, listed the way the panels beside the page are listed.
   *
   * There were two lists here once: a row of places you had saved and,
   * behind it, the panes those opened. Two lists for one feature, and the
   * only way to reach the second was to press something in the first. This
   * is the one that matters - what is on the page now - and adding a link
   * opens it rather than filing it away for later. */
  function renderCompanion() {
    const c = companionState();
    const panes = openPanes();

    $('companionEnabled').checked = !!c.enabled;
    $('companion-empty').style.display = panes.length ? 'none' : '';
    /* Three is the ceiling: past that a page has more of the extension on it
     * than of itself. */
    $('companion-add').disabled = panes.length >= MAX_PANES;

    const host = $('companion-panes');
    host.textContent = '';
    panes.forEach(function (pane, i) {
      const row = document.createElement('div');
      row.className = 'row between beside-item';

      const name = document.createElement('span');
      name.className = 'grow';
      name.title = pane.url;
      name.textContent = labelFor(pane.url) + (pane.collapsed ? ' \u00b7 folded' : '');
      row.appendChild(name);

      const fold = document.createElement('button');
      fold.type = 'button';
      fold.className = 'tiny ghost';
      fold.textContent = pane.collapsed ? 'Open' : 'Fold';
      fold.title = pane.collapsed
        ? 'Show this pane again'
        : 'Fold it down to its bar, keeping its place on the page';
      fold.addEventListener('click', function () {
        saveCompanion({ panes: panes.map(function (q, k) {
          return k === i ? Object.assign({}, q, { collapsed: !q.collapsed }) : q;
        }) });
      });
      row.appendChild(fold);

      const drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'drop';
      drop.title = 'Close this pane';
      drop.setAttribute('aria-label', 'Close ' + labelFor(pane.url));
      drop.textContent = '\u00d7';
      drop.addEventListener('click', function () {
        const rest = panes.filter(function (q, k) { return k !== i; });
        /* The address that came before the list goes with it, or reading it
         * back would put the pane straight up again. */
        saveCompanion({ panes: rest, url: '', enabled: rest.length > 0 && c.enabled });
      });
      row.appendChild(drop);
      host.appendChild(row);
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
    /* `pending` is set when a pane's own button sent you here, and names the
     * site you were looking at - it wins, because it is the question actually
     * asked. Otherwise the first thing open that a browser would refuse, since
     * that is the one with something to answer. */
    const needs = (Array.isArray(c.panes) ? c.panes : [])
      .concat(Array.isArray((settings.split || {}).panels) ? settings.split.panels : [])
      .map(function (x) { return x && NWT.companionSrc(x.url); })
      .filter(function (u) { return u && !NWT.framesFreely(u); })[0];
    const src = NWT.companionSrc(c.pending) || needs || null;

    if (!src || NWT.framesFreely(src)) { row.style.display = 'none'; return; }
    row.style.display = '';
    row.setAttribute('data-asked', c.pending ? '1' : '0');
    renderAllowed('allowed-list');

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
      btn.textContent = 'Allow ' + host;
      btn.title = 'Ask the browser for permission to open ' + host + ' here';
      btn.hidden = allowed;
      /* Put the cursor on the answer, so pressing Enter is enough for someone
       * who arrived here from the pane with one question. */
      if (c.pending && !allowed) btn.focus();
    });
  }

  /* What the browser says is allowed, listed in the section whose links it
   * applies to. Both sections have their own copy for that reason: one control
   * outside them both meant looking at a list of panels and finding the thing
   * that governs them somewhere else. */
  function renderAllowed(listId) {
    chrome.permissions.getAll(function (granted) {
      if (chrome.runtime.lastError) return;
      const origins = ((granted && granted.origins) || [])
        .filter(function (o) { return !/nextwork\.ai/.test(o); });
      const host = $(listId);
      host.textContent = '';
      origins.forEach(function (pattern) {
        const row = document.createElement('div');
        row.className = 'row between beside-item';
        const name = document.createElement('span');
        name.className = 'tiny grow';
        name.textContent = pattern.replace(/^https:\/\//, '').replace(/\/\*$/, '');
        row.appendChild(name);
        const drop = document.createElement('button');
        drop.type = 'button';
        drop.className = 'ghost tiny';
        drop.textContent = 'Take it back';
        drop.addEventListener('click', function () {
          chrome.permissions.remove({ origins: [pattern] }, function () {
            void chrome.runtime.lastError;
            saveCompanion({ grantedAt: Date.now() });
            renderAllowed(listId);
          });
        });
        row.appendChild(drop);
        host.appendChild(row);
      });
    });
  }

  /* One thing only: ask for a site. Taking one back is a control on its own
   * row in the list above, so this button never means two opposite things
   * depending on state you cannot see by looking at it.
   *
   * `permissions.request` has to follow a click inside an extension page. A
   * popup is one - but some browsers close the popup to put the prompt on
   * screen, and closing the page cancels the request that page made: nothing
   * is granted and nothing reports a failure. So the site is written down
   * first, asked for here where the controls are, and only if that comes back
   * refused is the options page opened with it already filled in. Being sent
   * somewhere else is the last resort, not the first thing that happens. */
  function askAllow() {
    const c = companionState();
    const needs = (Array.isArray(c.panes) ? c.panes : [])
      .concat(Array.isArray((settings.split || {}).panels) ? settings.split.panels : [])
      .map(function (x) { return x && NWT.companionSrc(x.url); })
      .filter(function (u) { return u && !NWT.framesFreely(u); })[0];
    const src = NWT.companionSrc(c.pending) || needs || null;
    if (!src) return;

    const origin = src.replace(/^(https:\/\/[^/]+).*$/, '$1') + '/*';
    saveCompanion({ pending: src });
    chrome.permissions.request({ origins: [origin] }, function (given) {
      if (given && !chrome.runtime.lastError) {
        saveCompanion({ grantedAt: Date.now(), pending: '' });
        renderAllowed('allowed-list');
        return;
      }
      /* Opened straight away rather than after a pause to read the note: the
       * page that opens says the same thing, and a delay is one more moment
       * where nothing appears to be happening. */
      toastNote('The browser would not ask here. Opening the page where it can.');
      chrome.runtime.openOptionsPage();
    });
  }

  /* Adding one opens it. Filing a link away and then having to find it again
   * in a second list is two steps where the instruction was one. */
  function addPane() {
    const field = $('companion-url');
    const raw = field.value.trim();

    if (!NWT.companionSrc(raw)) {
      field.setAttribute('aria-invalid', 'true');
      /* Worded without the scheme spelled out. The audit forbids a remote
       * address in shipped code and it is right to: an exception for prose
       * is an exception, and the sentence reads the same either way. */
      toastNote('That needs to be a full web address, starting with https.');
      return;
    }
    const panes = openPanes();
    if (panes.some(function (x) { return x.url === raw; })) {
      toastNote('That one is already open.');
      return;
    }
    if (panes.length >= MAX_PANES) {
      toastNote('Three panes is as many as a page can hold and stay usable.');
      return;
    }
    field.removeAttribute('aria-invalid');
    field.value = '';
    togglePane(raw);
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

  /* The two halves of this tab, remembered the same way the tabs above are:
   * where you were a moment ago, not something to write in with the themes. */
  function showSub(name) {
    ['page', 'float'].forEach(function (id) {
      $('sub-' + id).setAttribute('aria-selected', String(id === name));
      $('pane-' + id).hidden = id !== name;
    });
    try { localStorage.setItem('nwt-sub', name); } catch (e) { /* private mode */ }
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

  function splitPanels() {
    const sp = splitState();
    return (Array.isArray(sp.panels) ? sp.panels : [])
      .filter(function (x) { return x && typeof x.url === 'string'; });
  }

  function renderSplitPanel() {
    const sp = splitState();
    const panels = splitPanels();

    $('splitEnabled').checked = !!sp.enabled;
    $('split-empty').style.display = panels.length ? 'none' : '';
    const pct = Math.round(Math.max(0.18, Math.min(0.72, Number(sp.width) || 0.36)) * 100);
    $('split-width').value = String(pct);
    $('split-width-out').textContent = pct + '%';
    /* Which edge it is on now, said the same way the session lengths say
     * which one is chosen - two buttons with neither of them marked is a pair
     * of things to press rather than a setting you can read. */
    const side = sp.side === 'top' ? 'top' : 'right';
    [...$('split-side').querySelectorAll('button')].forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-side') === side));
    });
    /* Three is the ceiling: a third of a column is a usable panel and a
     * quarter is a letterbox. */
    $('split-set').disabled = panels.length >= 3;

    const host = $('split-panels');
    host.textContent = '';
    panels.forEach(function (panel, i) {
      const row = document.createElement('div');
      row.className = 'row between beside-item';

      const name = document.createElement('span');
      name.className = 'grow';
      name.title = panel.url;
      name.textContent = labelFor(panel.url) + (panel.collapsed ? ' · folded' : '');
      row.appendChild(name);

      const fold = document.createElement('button');
      fold.type = 'button';
      fold.className = 'tiny ghost';
      fold.textContent = panel.collapsed ? 'Open' : 'Fold';
      fold.title = panel.collapsed
        ? 'Show this panel again'
        : 'Fold it down to its bar, keeping its place in the column';
      fold.addEventListener('click', function () {
        saveSplit({ panels: panels.map(function (q, k) {
          return k === i ? Object.assign({}, q, { collapsed: !q.collapsed }) : q;
        }) });
      });
      row.appendChild(fold);

      const drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'drop';
      drop.title = 'Remove this panel';
      drop.setAttribute('aria-label', 'Remove ' + labelFor(panel.url));
      drop.textContent = '\u00d7';
      drop.addEventListener('click', function () {
        /* The sizes belonged to a column with one more panel in it, so they go
         * with it and the rest share the space out evenly again. */
        const rest = panels.filter(function (q, k) { return k !== i; })
          .map(function (q) { const r = Object.assign({}, q); delete r.size; return r; });
        saveSplit({ panels: rest, enabled: rest.length > 0 && sp.enabled });
      });
      row.appendChild(drop);
      host.appendChild(row);
    });
  }

  /* The same block, for the split's own list. */
  function renderSplitAccess() {
    const row = $('split-access');
    const panels = splitPanels()
      .map(function (x) { return x && NWT.companionSrc(x.url); })
      .filter(function (u) { return u && !NWT.framesFreely(u); });
    const src = panels[0];
    if (!src) { row.style.display = 'none'; return; }
    row.style.display = '';

    chrome.runtime.sendMessage({ type: 'companion:allowed', url: src }, function (r) {
      if (chrome.runtime.lastError) return;
      const allowed = !!(r && r.allowed);
      const host = (r && r.origin ? r.origin : src).replace(/^https:\/\//, '');
      $('split-access-note').textContent = !allowed
        ? host + ' refuses to be shown inside another page.'
        : r.active
          ? host + ' is allowed to open in a panel.'
          : host + ' is allowed, but the rule that carries it is missing. ' +
            'Take it back and allow it again.';
      const btn = $('split-access-btn');
      btn.textContent = 'Allow ' + host;
      btn.title = 'Ask the browser for permission to open ' + host + ' here';
      btn.hidden = allowed;
      renderAllowed('split-allowed-list');
    });
  }

  function askAllowFor(src) {
    if (!src) return;
    const origin = src.replace(/^(https:\/\/[^/]+).*$/, '$1') + '/*';
    saveCompanion({ pending: src });
    chrome.permissions.request({ origins: [origin] }, function (given) {
      if (given && !chrome.runtime.lastError) {
        saveCompanion({ grantedAt: Date.now(), pending: '' });
        renderAllowed('allowed-list');
        renderAllowed('split-allowed-list');
        return;
      }
      toastNote('The browser would not ask here. Opening the page where it can.');
      chrome.runtime.openOptionsPage();
    });
  }

  function setSplitLink() {
    const field = $('split-url');
    const raw = field.value.trim();
    if (!NWT.companionSrc(raw)) {
      field.setAttribute('aria-invalid', 'true');
      toastNote('That needs to be a full web address, starting with https.', 'split-note');
      return;
    }
    const panels = splitPanels();
    if (panels.length >= 3) {
      toastNote('Three panels is the most a column can hold and stay usable.', 'split-note');
      return;
    }
    field.removeAttribute('aria-invalid');
    field.value = '';
    /* Adding one is the whole instruction; turning the split on afterwards
     * would be a second step with no meaning of its own. The sizes are dropped
     * so the column shares itself out evenly with the new one included. */
    saveSplit({
      enabled: true,
      panels: panels.map(function (q) {
        const r = Object.assign({}, q); delete r.size; return r;
      }).concat([{ url: raw, collapsed: false }])
    });
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
    $('companion-add').addEventListener('click', addPane);
    $('companion-access-btn').addEventListener('click', askAllow);

    ['theme', 'focus', 'split'].forEach(function (name) {
      $('tab-' + name).addEventListener('click', function () { showTab(name); });
    });
    ['page', 'float'].forEach(function (name) {
      $('sub-' + name).addEventListener('click', function () { showSub(name); });
    });
    let sub = 'page';
    try { sub = localStorage.getItem('nwt-sub') || 'page'; } catch (e) { /* private mode */ }
    showSub(sub === 'float' ? 'float' : 'page');

    [...$('split-side').querySelectorAll('button')].forEach(function (b) {
      b.addEventListener('click', function () {
        saveSplit({ side: b.getAttribute('data-side') });
      });
    });
    let opening = 'theme';
    try { opening = localStorage.getItem('nwt-tab') || 'theme'; } catch (e) { /* private mode */ }
    showTab(['theme', 'focus', 'split'].indexOf(opening) === -1 ? 'theme' : opening);

    $('splitEnabled').addEventListener('change', function () {
      saveSplit({ enabled: $('splitEnabled').checked });
    });
    $('split-set').addEventListener('click', setSplitLink);
    $('split-access-btn').addEventListener('click', function () {
      const panels = splitPanels()
        .map(function (x) { return x && NWT.companionSrc(x.url); })
        .filter(function (u) { return u && !NWT.framesFreely(u); });
      askAllowFor(panels[0]);
    });
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
      const chosen = Number(btn.dataset.min);
      /* Custom is a request to be asked, not a length. */
      if (chosen < 0) {
        customOpen = true;
        renderFocus();
        $('focus-custom-min').focus();
        return;
      }
      customOpen = false;
      setLength(chosen);
    });

    $('focus-custom-set').addEventListener('click', function () {
      const wanted = Math.round(Number($('focus-custom-min').value) || 0);
      if (!(wanted > 0)) {
        $('focus-custom-min').setAttribute('aria-invalid', 'true');
        return;
      }
      $('focus-custom-min').removeAttribute('aria-invalid');
      customOpen = false;
      setLength(Math.min(600, wanted));
    });

    /* Counting up has no length, so choosing it puts the one in force away
     * rather than losing it: coming back finds the session you had. */
    $('focus-way').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-way]');
      if (!btn) return;
      const f = focusState();
      customOpen = false;
      if (btn.dataset.way === 'up') {
        if (!f.targetMin) return;
        saveFocus({ downMin: f.targetMin, targetMin: 0, chimedFor: 0 });
        return;
      }
      setLength(f.downMin || 25);
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
