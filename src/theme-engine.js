/* ============================================================================
 * Pineapple NextWork Theme Studio Mod - theme engine
 * Shared by the content script, the popup and the options page.
 * No modules (MV3 content scripts), so everything hangs off window.NWT.
 * ==========================================================================*/
'use strict';

(function (root) {
  'use strict';

  /* ---------------------------------------------------------------- color */
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  function hexToRgb(hex) {
    let h = String(hex || '#000').trim().replace(/^#/, '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) h = '000000';
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const hx = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  const rgbToHex = ({ r, g, b }) => '#' + hx(r) + hx(g) + hx(b);

  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb({ h, s, l }) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = t => {
      t = (t + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255 };
  }

  const hexToHsl = h => rgbToHsl(hexToRgb(h));
  const hslToHex = o => rgbToHex(hslToRgb(o));

  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex({
      r: A.r + (B.r - A.r) * t,
      g: A.g + (B.g - A.g) * t,
      b: A.b + (B.b - A.b) * t
    });
  }
  function rgba(hex, a) {
    const c = hexToRgb(hex);
    return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + a + ')';
  }
  function lighten(hex, amount) {
    const c = hexToHsl(hex);
    c.l = clamp(c.l + amount, 0, 100);
    return hslToHex(c);
  }

  /* Relative luminance / contrast ratio - drives the editor's a11y readout. */
  function luminance(hex) {
    const c = hexToRgb(hex);
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function contrastRatio(a, b) {
    const L1 = luminance(a), L2 = luminance(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }


  /* Take a designer's hue and solve for the lightness that lands just inside
   * the contrast floor against body text. Picking these by eye left most of
   * the usable range unused - the scenery was legible-safe but invisible. */
  function toneOf(hex, textHex, target) {
    const base = hexToHsl(hex);
    const textIsLight = luminance(textHex) > 0.4;
    let lo = 0, hi = 100, mid, r;
    for (let i = 0; i < 30; i++) {
      mid = (lo + hi) / 2;
      r = contrastRatio(hslToHex({ h: base.h, s: base.s, l: mid }), textHex);
      /* On a dark theme more lightness means less contrast, and vice versa. */
      if (textIsLight ? r > target : r < target) lo = mid; else hi = mid;
    }
    return hslToHex({ h: base.h, s: base.s, l: (lo + hi) / 2 });
  }

  /* ------------------------------------------------------------- defaults */
  /* A theme is 9 semantic colors + 4 global dials + optional custom CSS.
   * Everything NextWork renders is derived from these - same idea as a
   * VS Code theme file, just smaller. */
  const BASE_KEYS = [
    ['canvas', 'Canvas', 'Page background, the furthest-back surface'],
    ['surface', 'Surface', 'Cards, panels, the main content blocks'],
    ['surfaceAlt', 'Surface raised', 'Hover states, popovers, inputs, elevated bits'],
    ['border', 'Border', 'Hairlines, dividers, input outlines'],
    ['textPrimary', 'Text', 'Headings and body copy'],
    ['textSecondary', 'Text secondary', 'Sub-labels and metadata'],
    ['textMuted', 'Text muted', 'Placeholders, disabled states, timestamps'],
    ['accent', 'Accent', 'Links, focus rings, primary buttons'],
    ['accentText', 'Accent text', 'Text sitting on top of the accent color']
  ];

  /* Each preset is a finished palette. The dials are relative, so a theme
   * keeps its own hue relationships (Japandi's rosy oatmeal over cocoa,
   * wabi-sabi's olive cast) instead of being flattened to a single hue. */
  const PRESETS = {
    concrete: {
      name: 'Concrete',
      note: 'Neutral cool gray. The default.',
      colors: {
        canvas: '#1d1e1f', surface: '#242627', surfaceAlt: '#2c2e30', border: '#3c3e40',
        textPrimary: '#e8e9e9', textSecondary: '#afb3b5', textMuted: '#7e8488',
        accent: '#7aa7d9', accentText: '#12151a'
      }
    },
    graphite: {
      name: 'Graphite',
      note: 'Darker, flatter, almost no hue at all.',
      colors: {
        canvas: '#131414', surface: '#1a1b1c', surfaceAlt: '#222324', border: '#383a3b',
        textPrimary: '#e8e9ea', textSecondary: '#abaeb0', textMuted: '#7a7f81',
        accent: '#8fb8c9', accentText: '#0e1113'
      }
    },
    slate: {
      name: 'Slate',
      note: 'Cool blue-gray with more color in the neutrals.',
      colors: {
        canvas: '#1b1e22', surface: '#22252b', surfaceAlt: '#2a2f36', border: '#3b424c',
        textPrimary: '#e6e8ec', textSecondary: '#a9b0bc', textMuted: '#748092',
        accent: '#6ea8fe', accentText: '#0b1220'
      }
    },
    carbon: {
      name: 'Carbon',
      note: 'Near-black, heavy contrast. Good on OLED.',
      colors: {
        canvas: '#030303', surface: '#0b0b0c', surfaceAlt: '#131414', border: '#2f3132',
        textPrimary: '#f5f6f6', textSecondary: '#b2b4b5', textMuted: '#7d8082',
        accent: '#9ec5e8', accentText: '#0a0c0d'
      }
    },
    fog: {
      name: 'Fog',
      note: 'Dimmed rather than dark, for a bright room.',
      colors: {
        canvas: '#2e3031', surface: '#37393b', surfaceAlt: '#404346', border: '#515557',
        textPrimary: '#e5e7e7', textSecondary: '#b1b5b7', textMuted: '#878c90',
        accent: '#86b3de', accentText: '#15181a'
      }
    },
    espresso: {
      name: 'Espresso',
      note: 'The original warm brown, kept for comparison.',
      colors: {
        canvas: '#1c1917', surface: '#24211f', surfaceAlt: '#2e2a27', border: '#3e3834',
        textPrimary: '#e9e7e6', textSecondary: '#b2aaa5', textMuted: '#847870',
        accent: '#d3bf90', accentText: '#1b1918'
      }
    },

    /* ---- drawn from the reference images ------------------------------ */

    tokyoNight: {
      name: 'Tokyo Night',
      note: 'Neon on indigo. Surfaces are desaturated so the neon stays the only loud thing.',
      colors: {
        canvas: '#16161e', surface: '#1d1d28', surfaceAlt: '#262636', border: '#363652',
        textPrimary: '#e0e2f2', textSecondary: '#a3a6c9', textMuted: '#74779b',
        accent: '#f2768e', accentText: '#1a1220'
      }
    },
    wabiSabi: {
      name: 'Wabi-Sabi',
      note: 'Sumi ink ground, bone-paper text, aged brass for actions. The quietest one.',
      colors: {
        canvas: '#1b1a16', surface: '#22211c', surfaceAlt: '#2b2922', border: '#413f34',
        textPrimary: '#ded8c8', textSecondary: '#aea695', textMuted: '#847a69',
        accent: '#a98d5a', accentText: '#191713'
      }
    },
    darkJapandi: {
      name: 'Dark Japandi',
      note: 'Walnut panelling and oatmeal boucle. Clay accent, nothing louder than the room.',
      colors: {
        canvas: '#191412', surface: '#201a17', surfaceAlt: '#2a221d', border: '#42362e',
        textPrimary: '#e6ddd8', textSecondary: '#b0a29c', textMuted: '#857670',
        accent: '#c98f63', accentText: '#1a1310'
      }
    },
    zenLobby: {
      name: 'Zen Lobby',
      note: 'Dark stone lit by hidden warm light. The most dramatic of the warm set.',
      colors: {
        canvas: '#17120f', surface: '#1e1814', surfaceAlt: '#27201a', border: '#41352c',
        textPrimary: '#ece0d2', textSecondary: '#b5a493', textMuted: '#8a7a6a',
        accent: '#e0a86a', accentText: '#1c1410'
      }
    },
    concreteBlossom: {
      name: 'Concrete & Blossom',
      note: 'Poured concrete with a warm clay call to action. Your gray, with a pulse.',
      colors: {
        canvas: '#1c1c1a', surface: '#232320', surfaceAlt: '#2b2b28', border: '#41403b',
        textPrimary: '#e7e6e2', textSecondary: '#adaca6', textMuted: '#84837c',
        accent: '#bb8f6a', accentText: '#1a1512'
      }
    }
,
    /* ---- retro ---------------------------------------------------------
     * Both are dark. The scenery does the period work (a capital ship and a
     * planet limb; real tetrominoes falling into a stack), so the palettes
     * stay readable rather than leaning on nostalgia colours that would wreck
     * body-text contrast. */

    galactica: {
      name: 'Galactica',
      note: 'Cold hull grey and amber CRT. Deep-space quiet, not neon.',
      colors: {
        canvas: '#0d1014', surface: '#141922', surfaceAlt: '#1c2230', border: '#2f394a',
        textPrimary: '#dfe6ef', textSecondary: '#a2aebd', textMuted: '#75818f',
        accent: '#e8a13a', accentText: '#12161c'
      }
    },
    tetris: {
      name: 'Tetris',
      note: 'Arcade cabinet in a dark room - violet well, cyan accent.',
      colors: {
        canvas: '#12101c', surface: '#1a1728', surfaceAlt: '#221e33', border: '#3a3454',
        textPrimary: '#e7e3f5', textSecondary: '#aca5c6', textMuted: '#7e769a',
        accent: '#45c8dc', accentText: '#0d0b14'
      }
    },

    /* ---- light mode, with a layered backdrop ---------------------------
     * Every colour in a backdrop is deliberately pale. NextWork's article
     * text sits straight on the page ground, so the backdrop shows through
     * behind body copy - each literal below is contrast-checked against
     * textPrimary, and the audit fails the build if any drops under 7:1. */

    hawaiiOcean: {
      name: 'Hawaii Ocean',
      note: 'Sand, turquoise, deep water and palm green. The full beach gradient.',
      mode: 'light',
      colors: {
        canvas: '#eef6f8', surface: '#ffffff', surfaceAlt: '#e4f0f3', border: '#a8cad4',
        textPrimary: '#0f3039', textSecondary: '#3a5f6a', textMuted: '#628792',
        accent: '#0a6d8c', accentText: '#ffffff'
      },
      backdrop: [
        'radial-gradient(1100px 620px at 12% 108%, #f7ead6 0%, rgba(247,234,214,0) 62%)',
        'radial-gradient(900px 540px at 88% 96%, #d3efe8 0%, rgba(211,239,232,0) 64%)',
        'radial-gradient(1000px 660px at 78% 6%, #d8ecf6 0%, rgba(216,236,246,0) 66%)',
        'radial-gradient(820px 540px at 8% 4%, #dcefe3 0%, rgba(220,239,227,0) 62%)',
        'linear-gradient(180deg, #edf6f8 0%, #f4faf8 55%, #faf4ea 100%)'
      ].join(', ')
    },
    palmForest: {
      name: 'Palm Forest',
      note: 'Deep green canopy light. The quietest of the light set.',
      mode: 'light',
      colors: {
        canvas: '#f0f5ee', surface: '#ffffff', surfaceAlt: '#e7efe3', border: '#b6c9ab',
        textPrimary: '#152a1d', textSecondary: '#3d5a46', textMuted: '#6b8473',
        accent: '#2c7048', accentText: '#ffffff'
      },
      backdrop: [
        'radial-gradient(900px 560px at 82% 4%, #dcecdc 0%, rgba(220,236,220,0) 64%)',
        'radial-gradient(1000px 600px at 10% 100%, #e3efd9 0%, rgba(227,239,217,0) 62%)',
        'radial-gradient(760px 520px at 92% 88%, #d9ebe4 0%, rgba(217,235,228,0) 60%)',
        'linear-gradient(180deg, #f2f7ef 0%, #f6faf3 60%, #eef5ea 100%)'
      ].join(', ')
    },
    hawaiiMorning: {
      name: 'Hawaii Morning',
      note: 'Sunrise over the water - peach, gold and a band of aqua.',
      mode: 'light',
      colors: {
        canvas: '#fdf4ec', surface: '#ffffff', surfaceAlt: '#fbe9dd', border: '#e2bea0',
        textPrimary: '#3a2317', textSecondary: '#68493a', textMuted: '#8f6f5c',
        accent: '#c05622', accentText: '#ffffff'
      },
      backdrop: [
        'radial-gradient(1000px 560px at 20% 2%, #ffe7d2 0%, rgba(255,231,210,0) 62%)',
        'radial-gradient(900px 520px at 84% 10%, #fdf0d5 0%, rgba(253,240,213,0) 62%)',
        'radial-gradient(1100px 620px at 70% 104%, #d9eef0 0%, rgba(217,238,240,0) 64%)',
        'linear-gradient(180deg, #fdf3ea 0%, #fdf7f0 58%, #f1f7f6 100%)'
      ].join(', ')
    },
    mountFuji: {
      name: 'Mount Fuji',
      note: 'Cold dawn air, snow, and a faint pink on the ridge.',
      mode: 'light',
      colors: {
        canvas: '#f2f5fa', surface: '#ffffff', surfaceAlt: '#e9eef7', border: '#b6c5dd',
        textPrimary: '#1a2640', textSecondary: '#45526d', textMuted: '#727f99',
        accent: '#3a5a9f', accentText: '#ffffff'
      },
      backdrop: [
        'radial-gradient(1100px 600px at 50% 0%, #dde7f6 0%, rgba(221,231,246,0) 62%)',
        'radial-gradient(820px 480px at 18% 96%, #f3e4ea 0%, rgba(243,228,234,0) 60%)',
        'radial-gradient(900px 560px at 88% 92%, #e3eaf5 0%, rgba(227,234,245,0) 62%)',
        'linear-gradient(180deg, #eef3fb 0%, #f7f9fc 55%, #f4f1f4 100%)'
      ].join(', ')
    },
    cherryBlossom: {
      name: 'Cherry Blossom',
      note: 'Sakura against cream, with a little leaf green underneath.',
      mode: 'light',
      colors: {
        canvas: '#fdf4f6', surface: '#ffffff', surfaceAlt: '#fbe9ee', border: '#e7bac8',
        textPrimary: '#3a2029', textSecondary: '#68414f', textMuted: '#946d7b',
        accent: '#b23a63', accentText: '#ffffff'
      },
      backdrop: [
        'radial-gradient(980px 560px at 16% 4%, #fbe0e8 0%, rgba(251,224,232,0) 62%)',
        'radial-gradient(880px 520px at 86% 12%, #fdeee2 0%, rgba(253,238,226,0) 62%)',
        'radial-gradient(1000px 600px at 74% 102%, #e6f0e2 0%, rgba(230,240,226,0) 62%)',
        'linear-gradient(180deg, #fdf4f7 0%, #fdf8f4 58%, #f5f8f2 100%)'
      ].join(', ')
    }
  };

  /* Dials are RELATIVE: hue is an offset in degrees, saturation a percentage
   * of the theme's own. 0 / 100 leaves a theme exactly as designed. */
  const DEFAULT_TUNING = { hue: 0, saturation: 100, contrast: 0, brightness: 0 };
  const SCHEMA = 2;

  /* NextWork's status colors, taken from their own 500 stop. Their scales run
   * light -> dark, which is backwards on a dark page, so we rebuild each one
   * from the canvas up instead of overriding 12 stops by hand. */
  const SEMANTIC_FAMILIES = {
    error: '#e5462d',
    warning: '#f86d17',
    success: '#11cca6',
    information: '#308ded',
    plum: '#875bf7',
    green: '#16b364',
    'orange-dark': '#ff4405'
  };

  const DEFAULT_SETTINGS = {
    enabled: true,
    themeId: 'concrete',
    /* User-made themes live here, keyed by id. */
    customThemes: {},
    /* Per-theme dial positions, so presets stay pristine. */
    tuningOverrides: {},
    schema: 2,
    /* Focus timer. Time is stored as timestamps, never as a running counter, so
     * it stays correct across popup closes, page loads and browser restarts:
     * elapsed = accumulatedMs + (running ? now - startedAt : 0). */
    focus: {
      enabled: false,      /* show the on-page timer */
      running: false,
      startedAt: 0,        /* epoch ms of the current run */
      accumulatedMs: 0,    /* time banked from previous runs */
      targetMin: 25,       /* 0 counts up; anything else counts down */
      /* Where the pill was last dropped, as a fraction of the viewport, so it
       * lands in the same relative place on a different window size. null
       * means "wherever the stylesheet puts it". */
      hudX: null,
      hudY: null,
      /* How big the on-page pill is drawn, as a multiplier on the sizes the
       * stylesheet works out. 1 is the size it has always been. */
      hudScale: 1,
      locked: false        /* locked: cannot be dragged, and clicks pass through */
    },
    options: {
      dimImages: 0,          /* 0-40 % - knocks the glare off bright screenshots */
      softenShadows: true,   /* light-mode drop shadows look like smudges on dark */
      themeScrollbars: true,
      accentLinks: true,
      invertLogos: true,     /* their wordmark is dark ink, invisible on dark */
      neutralizeGlows: true, /* the hero bloom is a hardcoded cream gradient */
      patchStubborn: true,   /* arbitrary bg-[#FDEEE2]-style classes */
      animateBackdrop: true, /* slow drift on themes that have a backdrop */
      sceneBackdrop: true,   /* hand-drawn scenery behind the page */
      rescuePanels: true     /* repaint panels that escape the token layer */
    }
  };

  /* Focus timer maths, shared by the popup, the badge and the on-page HUD so
   * they can never disagree about what time it is. */
  function focusElapsed(focus, now) {
    const f = Object.assign({}, DEFAULT_SETTINGS.focus, focus);
    return f.accumulatedMs + (f.running ? Math.max(0, (now || Date.now()) - f.startedAt) : 0);
  }

  function focusRemaining(focus, now) {
    const f = Object.assign({}, DEFAULT_SETTINGS.focus, focus);
    if (!f.targetMin) return null;                 /* counting up */
    return f.targetMin * 60000 - focusElapsed(f, now);
  }

  /* mm:ss, or h:mm:ss once it runs past an hour. */
  function formatDuration(ms) {
    const sign = ms < 0 ? '-' : '';
    let t = Math.floor(Math.abs(ms) / 1000);
    const h = Math.floor(t / 3600); t -= h * 3600;
    const m = Math.floor(t / 60); const sec = t - m * 60;
    const pad = n => (n < 10 ? '0' : '') + n;
    return sign + (h ? h + ':' + pad(m) : m) + ':' + pad(sec);
  }

  /* One place that knows how a dial reads, so both UIs agree. */
  function formatDial(key, value) {
    if (key === 'saturation') return value + '%';
    const sign = value > 0 ? '+' : '';
    return sign + value + (key === 'hue' ? '\u00b0' : '');
  }

  function cloneTheme(t) { return JSON.parse(JSON.stringify(t)); }

  /* Dial semantics changed in schema 2 (absolute -> relative). Old dial
   * positions mean something different now, so drop them rather than
   * silently desaturating every theme. */
  /* Run fn once the calls stop coming.
   *
   * Both dial handlers need this. A range input fires on every pixel of
   * travel, and each storage write reaches every open nextwork.ai tab, where
   * it rebuilds stylesheets and re-walks the DOM. `flush` runs a pending call
   * immediately, which is what a test uses instead of waiting. */
  function debounce(fn, ms) {
    let timer = null;
    let pending = false;
    function schedule() {
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(run, ms);
    }
    function run() {
      if (!pending) return;
      pending = false;
      clearTimeout(timer);
      fn();
    }
    schedule.flush = run;
    schedule.pending = function () { return pending; };
    return schedule;
  }

  function migrate(settings) {
    const s = settings || {};
    if (s.schema !== SCHEMA) {
      s.tuningOverrides = {};
      s.schema = SCHEMA;
      s.migrated = true;        /* caller has to persist, or this repeats */
    }
    return s;
  }

  function getTheme(settings, id) {
    const key = id || settings.themeId;
    const src = (settings.customThemes && settings.customThemes[key]) || PRESETS[key] || PRESETS.concrete;
    const out = cloneTheme(src);
    out.id = key;
    out.isPreset = !!(PRESETS[key] && !(settings.customThemes || {})[key]);
    out.mode = out.mode === 'light' ? 'light' : 'dark';
    /* A fork gets a new id, so remember which scene it came from. */
    out.sceneKey = out.sceneKey || key;
    out.colors = Object.assign({}, PRESETS.concrete.colors, out.colors);
    /* Dials are remembered per theme, so nudging a preset does not fork it. */
    const saved = (settings.tuningOverrides || {})[key];
    out.tuning = Object.assign({}, DEFAULT_TUNING, out.tuning, saved || {});
    return out;
  }

  /* --------------------------------------------------------------- palette */
  /* Apply the global dials to one neutral. */
  function tuneNeutral(hex, tuning, role) {
    const c = hexToHsl(hex);
    /* Rotate rather than replace, so a theme's internal hue relationships
     * survive the dial. */
    c.h = c.h + tuning.hue;
    /* Scale the theme's own saturation. The small additive term above 100%
     * lets the tint dial still bite on a theme that is pure gray (Carbon). */
    const mult = tuning.saturation / 100;
    const boost = Math.max(0, mult - 1) * 3;
    c.s = clamp(c.s * mult + boost, 0, 100);
    c.l = clamp(c.l + tuning.brightness, 0, 100);
    /* Contrast pushes surfaces down and text up, pivoting around the canvas. */
    const k = tuning.contrast;
    if (role === 'surface') c.l = clamp(c.l - k * 0.25, 0, 100);
    if (role === 'text') c.l = clamp(c.l + k * 0.45, 0, 100);
    return hslToHex(c);
  }

  /* A colour is a #rrggbb value and nothing else.
   *
   * Every one of these is written into the stylesheet, and the accent pair
   * reaches it as typed rather than through the tuner - so a value carrying a
   * semicolon ends the declaration and whatever follows it becomes a rule of
   * its own, which is a way to put a url() on the page without touching the
   * custom CSS the checks were looking at.
   *
   * The editor refuses anything but a hex value on import, but storage
   * outlives the version that wrote it: a theme accepted before that check
   * existed is still selected and still built on every visit. So it is asked
   * again here, where the palette is made, and anything else falls back to the
   * default theme's colour rather than reaching the page. */
  const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

  function isColor(value) {
    return HEX_COLOR.test(String(value == null ? '' : value).trim());
  }

  /* The colours a palette is built from.
   *
   * A theme that cannot supply all nine gets a whole palette instead of having
   * the missing ones filled in. Key by key from one fixed theme mixed palettes
   * that were never designed together: a light theme whose textPrimary had
   * been saved as something unusable took a near-white value from the dark
   * default and put it on a light canvas, which is unreadable, on every visit,
   * with nothing to show for it. Even between two themes of the same mode
   * there is no contrast guarantee across a mixture.
   *
   * So it is all or nothing, and the replacement is of the theme's own mode -
   * a set that was drawn together and clears the floor as a set. */
  const DEFAULT_COLORS = { dark: 'concrete', light: 'hawaiiMorning' };

  function usableColors(theme) {
    const given = theme.colors || {};
    if (BASE_KEYS.every(function (entry) { return isColor(given[entry[0]]); })) {
      return given;
    }
    const wanted = DEFAULT_COLORS[theme.mode === 'light' ? 'light' : 'dark'];
    const source = PRESETS[wanted] || PRESETS[DEFAULT_SETTINGS.themeId];
    console.warn('[nwt] theme "' + (theme.name || 'unnamed') +
                 '" has a colour that is not a #rrggbb value, so the ' +
                 (theme.mode === 'light' ? 'light' : 'dark') +
                 ' default palette is being used instead');
    return source.colors;
  }

  function buildPalette(theme) {
    const t = theme.tuning;
    const c = usableColors(theme);
    const S = h => tuneNeutral(h, t, 'surface');
    const T = h => tuneNeutral(h, t, 'text');

    const p = {
      canvas: S(c.canvas),
      surface: S(c.surface),
      surfaceAlt: S(c.surfaceAlt),
      border: S(c.border),
      textPrimary: T(c.textPrimary),
      textSecondary: T(c.textSecondary),
      textMuted: T(c.textMuted),
      /* Accent keeps its own hue - the tint dial is for neutrals only. */
      accent: c.accent,
      accentText: c.accentText
    };

    /* NextWork's neutral ramp runs 25 (lightest) -> 950 (darkest) and every
     * utility resolves through it, so a dark theme is really just that ramp
     * turned around: low numbers become surfaces, high numbers become text. */
    p.ramp = {
      25: p.canvas,
      50: p.surface,
      100: p.surfaceAlt,
      200: p.border,
      300: mix(p.border, p.textMuted, 0.45),
      400: p.textMuted,
      500: mix(p.textMuted, p.textSecondary, 0.5),
      600: p.textSecondary,
      700: mix(p.textSecondary, p.textPrimary, 0.45),
      800: mix(p.textSecondary, p.textPrimary, 0.75),
      900: p.textPrimary,
      /* One step past the primary text, whichever way the mode runs. */
      950: lighten(p.textPrimary, theme.mode === 'light' ? -4 : 4)
    };

    /* Nudge a foreground away from its background until it clears `target`.
     * Direction follows the background, so this works on dark and light
     * canvases alike. */
    function ensureContrast(fg, bg, target) {
      const step = luminance(bg) > 0.18 ? -2 : 2;
      let out = fg, guard = 0;
      while (contrastRatio(out, bg) < target && guard++ < 60) out = lighten(out, step);
      return out;
    }

    /* Same trick for each status color: tints become dark washes over the
     * canvas, and the dark end becomes readable light text. */
    p.status = {};
    Object.keys(SEMANTIC_FAMILIES).forEach(function (family) {
      const base = SEMANTIC_FAMILIES[family];
      p.status[family] = {
        /* Filled panels (a saved answer, an alert) use the low stops. On a dark
         * ground a 20%+ wash reads as a coloured slab bolted onto the page, so
         * the fills stay quiet and the border and text carry the signal. */
        25: mix(p.canvas, base, 0.05),
        50: mix(p.canvas, base, 0.08),
        100: mix(p.canvas, base, 0.13),
        200: mix(p.canvas, base, 0.26),
        300: mix(base, p.textPrimary, 0.35),
        400: mix(base, p.textPrimary, 0.20),
        500: base,
        600: mix(base, p.textPrimary, 0.15),
        700: mix(base, p.textPrimary, 0.30),
        800: mix(base, p.textPrimary, 0.45),
        900: mix(base, p.textPrimary, 0.58),
        950: mix(base, p.textPrimary, 0.68)
      };
      /* 300 and 400 are the badge and alert text stops; 50 is what they sit on. */
      const ramp = p.status[family];
      ramp[400] = ensureContrast(ramp[400], ramp[50], 4.5);
      ramp[300] = ensureContrast(ramp[300], ramp[50], 4.5);
    });

    /* --- the callout panel ------------------------------------------------
     * NextWork puts some sections on `leather`, a dark navy block, and that is
     * fine on a dark theme where it reads as one more surface. On a light
     * theme it was left alone, so a near-black slab sat in the middle of a
     * pale page, and the heading inside it went dark with the rest of the page
     * and disappeared into its own background.
     *
     * So the callout gets its own colour, tinted with the theme's accent so it
     * belongs to the palette rather than fighting it, and its own text colour
     * that is measured against it rather than against the page. */
    const lightTheme = theme.mode === 'light';
    p.callout = lightTheme
      ? mix(p.surface, p.accent, 0.14)
      : mix(p.surfaceAlt, p.accent, 0.11);
    p.calloutBorder = lightTheme
      ? mix(p.callout, p.accent, 0.30)
      : mix(p.callout, p.textMuted, 0.28);
    /* Skeletons are the loading state, and they were being aliased to
     * surfaceAlt, which on a light theme is barely a step away from the
     * canvas. At about 1.07:1 they are invisible, so a page that is loading
     * normally looks like a page that has failed. This is not text, so it does
     * not want a text ratio; it wants to be clearly a shape. */
    p.skeleton = (function () {
      let c = p.surfaceAlt;
      for (let i = 0; i < 24 && contrastRatio(c, p.canvas) < 1.45; i++) {
        c = mix(c, p.textMuted, 0.12);
      }
      return c;
    })();
    /* Panels sit on top of the wallpaper, so a flat opaque fill reads as a slab
     * pasted over the picture. These are translucent with a blur behind them
     * instead, which lets the scene through as a soft wash and keeps the panel
     * part of the page rather than on top of it.
     *
     * 0.72 is chosen against the worst point of every wallpaper: composited
     * there, body text still measures 7.5:1. The floor sits near 0.60, so this
     * keeps a margin. The blur only helps, by flattening whatever shows
     * through, which the measurement does not credit. */
    p.panelAlpha = 0.72;
    p.panelFill = rgba(p.surface, p.panelAlpha);

    /* A panel also needs an edge, and on a light theme that is the only thing
     * doing the work. Measured against the colour each wallpaper fades into,
     * a translucent near-white panel on a near-white sky separates by about
     * 1.06 - which is to say not at all. Raising the opacity does not help,
     * because an opaque near-white panel on a near-white sky is still
     * near-white. What tells a reader where the panel starts is its border.
     *
     * Solved rather than picked, so it holds on every palette. */
    p.panelEdge = (function () {
      let c = mix(p.border, p.textMuted, 0.3);
      for (let i = 0; i < 24 && contrastRatio(c, p.surface) < 1.5; i++) {
        c = mix(c, p.textPrimary, 0.12);
      }
      return c;
    })();
    p.panelShadow = rgba(lightTheme ? mix(p.textPrimary, '#000000', 0.4) : '#000000',
                         lightTheme ? 0.10 : 0.30);
    /* Placeholder text is content: it is the only thing telling a reader what
     * a field is for, and a composer that says nothing is a composer nobody
     * types into. The site's own placeholder stops were chosen against a dark
     * page and land near 2.5:1 on a light one, and even our muted tone drifts
     * under the floor on the cooler palettes. It should still read as quieter
     * than body text, which at 4.5 against 13-and-up it comfortably does.
     *
     * Disabled keeps its dimming and is deliberately not routed through here:
     * a control that is switched off is supposed to look switched off. */
    p.placeholder = ensureContrast(p.textMuted, p.surface, 4.5);
    p.calloutText = ensureContrast(p.textPrimary, p.callout, 7);
    p.calloutTextSecondary = ensureContrast(p.textSecondary, p.callout, 4.5);
    return p;
  }


  /* ---------------------------------------------------------------- scope */
  /* Our stylesheet is injected at document_start, so it sits BEFORE the site's
   * own sheets. Their rules that are NOT inside an @layer therefore win every
   * specificity tie on document order - including `body { background:#f8f5f1 }`,
   * which is exactly why the page stayed cream while the text went light.
   * Adding an `html` ancestor breaks those ties our way, and costs one selector
   * step instead of a wall of !important. */
  function splitSelectors(sel) {
    const out = [];
    let depth = 0, buf = '';
    for (let i = 0; i < sel.length; i++) {
      const ch = sel[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(buf.trim()); buf = ''; }
      else buf += ch;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  /* Whether a piece of CSS can ask for something over the network.
   *
   * The extension never talks to anything, and custom CSS is the one place a
   * theme could break that: a url() in a rule is a live request from a page
   * you are signed into, and an attribute selector plus a background image is
   * a known way to read a form field out one character at a time. url(), src(),
   * image(), cross-fade() and image-set() all fetch, and @import pulls in a
   * whole stylesheet.
   *
   * A denylist, and only as good as its list, because the alternative is a CSS
   * parser. Dropping a rule that asks for nothing costs far less than making a
   * request that should never happen, so anything new that can fetch belongs
   * here.
   */
  const CSS_REACHES_OUT =
    /url\s*\(|src\s*\(|@import|expression\s*\(|image\s*\(|image-set\s*\(|cross-fade\s*\(/i;

  /* CSS with its escapes resolved.
   *
   * A name may be written with escapes, and the browser resolves them before
   * deciding what it is looking at: \75 is "u", so "\75 rl(...)" is a url()
   * the moment it is parsed, while reading as nothing in particular to a
   * pattern. Line endings go first, as they do in a browser, because an escape
   * swallows one whitespace character and a file saved on Windows carries two
   * bytes where the browser sees one. */
  function withoutCssEscapes(css) {
    return String(css)
      .replace(/\r\n?|\f/g, '\n')
      /* One pass, so an escaped backslash is spent as one rather than having
       * its second half read as opening an escape. */
      .replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\n]?|([\s\S]))/g, function (_, hex, ch) {
        if (ch !== undefined) return ch;
        const code = parseInt(hex, 16);
        if (!code || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '';
        if (code <= 0xffff) return String.fromCharCode(code);
        const above = code - 0x10000;
        return String.fromCharCode(0xd800 + (above >> 10), 0xdc00 + (above & 0x3ff));
      });
  }

  /* Read as written and as the browser will read it. The file as typed is
   * still checked so a fault in the decoder cannot make this weaker than it
   * would be without one. */
  function cssReachesOut(css) {
    return CSS_REACHES_OUT.test(css) || CSS_REACHES_OUT.test(withoutCssEscapes(css));
  }

  function scopeCSS(css, prefix, rootSel) {
    /* The delimiter is a lookbehind rather than a captured character on
     * purpose. Consuming it meant that after an at-rule prelude was matched
     * and skipped, its opening brace was gone, so the selector inside it never
     * matched and never got the prefix - which quietly cost every rule in a
     * one-line @media block the specificity tie it was relying on. */
    /* Keyframe bodies are lifted out before scoping and spliced back after.
     * `from`, `to` and `50%` are keyframe selectors, not element selectors, so
     * prefixing one produces `html from`. That is invalid, the browser throws
     * away the whole block, and the animation silently does nothing. Every
     * parallax band in every theme sat perfectly still because of this. */
    const frames = [];
    const MARK = String.fromCharCode(0);
    css = css.replace(/@(-\w+-)?keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
      function (block) { return MARK + (frames.push(block) - 1) + MARK; });

    css = css.replace(/(?<=[\n{}]|^)([ \t]*)([^\n{}][^{}\n]*)\{/g,
      function (m, ws, sel) {
        const s = sel.trim();
        /* Leave at-rule preludes and the token block alone - the doubled root
         * selector already outranks any single :root / :host the site sets. */
        if (!s || s.charAt(0) === '@' || s.indexOf(rootSel) === 0) return m;
        return ws + splitSelectors(s).map(function (x) { return prefix + x; }).join(', ') + ' {';
      });

    return css.replace(new RegExp(MARK + '(\\d+)' + MARK, 'g'),
                       function (_, i) { return frames[Number(i)]; });
  }

  /* Inline an SVG as a background-image. Encoded rather than base64 so the
   * markup stays greppable in the generated stylesheet. */
  function svgUrl(markup) {
    return 'url("data:image/svg+xml,' + encodeURIComponent(markup) + '")';
  }

  /* ------------------------------------------------------------------- css */
  /* opts.shadow builds the variant that gets adopted into the site's shadow
   * roots. Inside a shadow tree there is no <html>, so the document variant's
   * `html ` prefix would match nothing at all - and the site re-declares its
   * whole token set on :host in every root, which is why those components
   * stayed light while the page around them went dark. */
  function buildCSS(settings, themeOverride, opts) {
    const shadow = !!(opts && opts.shadow);
    /* `:host:host` parses but still loses to the site's own :host block.
     * `:host(:not(#id))` is the valid way to buy ID-level specificity, which
     * clears everything they declare inside a shadow root. */
    const HOST = ':host(:not(#nwt-never))';
    const rootSel = shadow ? HOST : ':root:root';
    const prefix = shadow ? HOST + ' ' : 'html ';
    const theme = themeOverride || getTheme(settings);
    const light = theme.mode === 'light';
    const p = buildPalette(theme);
    const o = Object.assign({}, DEFAULT_SETTINGS.options, settings.options);
    const r = p.ramp;
    const L = [];

    /* Scenery is resolved up front: several fix-ups below behave
     * differently once there is artwork behind the page. */
    const scenes = (typeof root !== 'undefined' && root.NWT_SCENES) || {};
    const sceneDef = (!shadow && o.sceneBackdrop) ? scenes[theme.sceneKey || theme.id] : null;
    const scene = typeof sceneDef === 'function'
      ? sceneDef(p, { toneOf: function (hex, target) { return toneOf(hex, p.textPrimary, target); }, mix: mix, rgba: rgba })
      : sceneDef;
    const hasWallpaper = !!(scene || theme.backdrop) && !shadow;

    L.push('/* Pineapple NextWork Theme Studio Mod - generated stylesheet */');
    L.push(rootSel + ' {');
    L.push('  color-scheme: ' + (light ? 'light' : 'dark') + ';');
    L.push('  background-color: ' + p.canvas + ';');

    /* Our own handles, used by the fix-up rules further down. */
    L.push('  --nwt-canvas: ' + p.canvas + ';');
    L.push('  --nwt-surface: ' + p.surface + ';');
    L.push('  --nwt-surface-alt: ' + p.surfaceAlt + ';');
    L.push('  --nwt-border: ' + p.border + ';');
    L.push('  --nwt-text: ' + p.textPrimary + ';');
    L.push('  --nwt-text-secondary: ' + p.textSecondary + ';');
    L.push('  --nwt-text-muted: ' + p.textMuted + ';');
    L.push('  --nwt-placeholder: ' + p.placeholder + ';');
    L.push('  --nwt-accent: ' + p.accent + ';');
    L.push('  --nwt-accent-text: ' + p.accentText + ';');

    /* --- NextWork's own named surfaces ----------------------------------
     * `leather` is their dark section background; `paper` and `warm-white`
     * are the light ones. All three become dark surfaces here, and the
     * matching text-* utilities get repointed below. */
    L.push('  --color-paper: ' + p.canvas + ';');
    L.push('  --color-warm-white: ' + p.surface + ';');
    L.push('  --color-leather: ' + p.callout + ';');
    L.push('  --color-glass-sand: ' + rgba(p.surface, 0.72) + ';');
    L.push('  --color-glass-surface: ' + rgba(p.surfaceAlt, 0.8) + ';');
    L.push('  --color-glass-border: ' + p.border + ';');
    L.push('  --gradient-glass-shell: linear-gradient(to bottom right, ' +
      rgba(p.textPrimary, 0.07) + ', transparent 40%, rgba(0, 0, 0, 0.18));');
    L.push('  --gradient-avatar-bg: linear-gradient(to bottom, ' + p.surfaceAlt + ', ' + p.surface + ');');

    /* The neutral ramp, reversed. --color-gray-* is aliased to brand on the
     * site, but we set both so nothing depends on that alias surviving. */
    Object.keys(r).forEach(function (stop) {
      L.push('  --color-brand-' + stop + ': ' + r[stop] + ';');
      L.push('  --color-gray-' + stop + ': ' + r[stop] + ';');
    });
    L.push('  --color-brand-solid: ' + p.accent + ';');
    L.push('  --color-brand: ' + p.accent + ';');
    /* `sand` is another warm neutral they use for light panels and hairlines.
     * The darker gold end (600+) is a real accent, so leave it be. */
    L.push('  --color-sand-300: ' + p.surface + ';');
    L.push('  --color-sand-400: ' + p.surfaceAlt + ';');
    L.push('  --color-sand-500: ' + p.border + ';');

    /* Status ramps. */
    Object.keys(p.status).forEach(function (family) {
      const ramp = p.status[family];
      Object.keys(ramp).forEach(function (stop) {
        L.push('  --color-' + family + '-' + stop + ': ' + ramp[stop] + ';');
      });
    });

    /* --- their semantic layer -------------------------------------------
     * These are hardcoded hexes rather than aliases of the ramp, so the
     * override above never reaches them. This is what actually themes the
     * signed-in app: cards, tables, skeletons, badges, alerts. */
    const subtleBorder = mix(p.canvas, p.border, 0.7);
    const midGray = mix(p.border, p.textMuted, 0.5);
    const sem = {
      /* backgrounds */
      'bg-primary': p.surface,
      'bg-primary_alt': p.canvas,
      'bg-primary-hover': p.surfaceAlt,
      'bg-primary_hover': p.surfaceAlt,
      'bg-primary-solid': p.surfaceAlt,
      'bg-secondary': p.surfaceAlt,
      'bg-secondary_alt': p.surfaceAlt,
      'bg-secondary_hover': mix(p.surfaceAlt, p.border, 0.5),
      'bg-secondary_subtle': p.surfaceAlt,
      'bg-secondary-solid': p.border,
      'bg-tertiary': p.border,
      'bg-quaternary': midGray,
      'bg-active': p.surfaceAlt,
      'bg-overlay': p.surfaceAlt,
      'bg-disabled': p.surfaceAlt,
      'bg-disabled_subtle': p.surface,
      'bg-code-inline': p.canvas,
      'bg-brand-primary': p.canvas,
      'bg-brand-primary_alt': p.surfaceAlt,
      'bg-brand-secondary': p.surfaceAlt,
      'bg-brand-section': p.surfaceAlt,
      'bg-brand-section_subtle': p.border,
      /* their primary button: keep it a raised neutral so white text holds up */
      'bg-brand-solid': p.border,
      'bg-brand-solid_hover': mix(p.border, p.textMuted, 0.4),
      'bg-error-primary': p.status.error[50],
      'bg-error-secondary': p.status.error[100],
      'bg-success-primary': p.status.success[50],
      'bg-success-secondary': p.status.success[100],
      'bg-warning-primary': p.status.warning[50],
      'bg-warning-secondary': p.status.warning[100],
      /* text */
      'text-primary': p.textPrimary,
      'text-primary_on-brand': p.textPrimary,
      'text-secondary': p.textSecondary,
      'text-secondary_hover': p.textPrimary,
      'text-secondary_on-brand': p.textSecondary,
      'text-tertiary': mix(p.textSecondary, p.textMuted, 0.5),
      'text-tertiary_hover': p.textSecondary,
      'text-tertiary_on-brand': p.textMuted,
      'text-quaternary': p.textMuted,
      'text-quaternary_on-brand': p.textMuted,
      'text-disabled': midGray,
      'text-placeholder': p.placeholder,
      'text-placeholder_subtle': p.placeholder,
      'text-brand-primary': p.textPrimary,
      'text-brand-secondary': p.textPrimary,
      'text-brand-secondary_hover': p.textPrimary,
      'text-brand-tertiary': p.textSecondary,
      'text-brand-tertiary_alt': p.textSecondary,
      'text-code-inline': p.textPrimary,
      'text-error-primary': p.status.error[400],
      'text-error-primary_hover': p.status.error[300],
      'text-success-primary': p.status.success[400],
      'text-warning-primary': p.status.warning[400],
      'tooltip-supporting-text': p.textSecondary,
      /* foreground (icons) */
      'fg-primary': p.textPrimary,
      'fg-secondary': p.textSecondary,
      'fg-secondary_hover': p.textPrimary,
      'fg-tertiary': mix(p.textSecondary, p.textMuted, 0.5),
      'fg-quaternary': p.textMuted,
      'fg-quaternary_hover': p.textSecondary,
      'fg-disabled': midGray,
      'fg-disabled_subtle': p.border,
      'fg-brand-primary': p.textPrimary,
      'fg-brand-primary_alt': p.textPrimary,
      'fg-brand-secondary_alt': p.textSecondary,
      'fg-brand-secondary_hover': p.textPrimary,
      'fg-error-primary': p.status.error[400],
      'fg-error-secondary': p.status.error[300],
      'fg-success-primary': p.status.success[400],
      'fg-success-secondary': p.status.success[300],
      'fg-warning-primary': p.status.warning[400],
      /* borders */
      'border-primary': p.border,
      'border-secondary': subtleBorder,
      'border-secondary_alt': subtleBorder,
      'border-tertiary': subtleBorder,
      'border-brand': midGray,
      'border-brand_alt': p.border,
      'border-disabled': p.border,
      'border-disabled_subtle': subtleBorder,
      'border-error': p.status.error[400],
      'border-error_subtle': p.status.error[200],
      /* misc named surfaces */
      'skeleton': p.skeleton,
      'graysecondary-200': p.border,
      'graywarm-50': p.surface,
      'graywarm-200': p.border,
      'graywarm-500': p.textMuted,
      'graywarm-700': p.textSecondary
    };
    Object.keys(sem).forEach(function (k) {
      L.push('  --color-' + k + ': ' + sem[k] + ';');
    });

    /* Tailwind v4 also emits a namespaced alias for every theme key, and the
     * utilities reference THOSE: `.border-primary` resolves
     * var(--border-color-primary), not var(--color-border-primary). Miss this
     * family and borders, rings and panels keep their light-mode values while
     * everything around them goes dark. */
    const ns = {};
    Object.keys(sem).forEach(function (k) {
      if (k.indexOf('bg-') === 0) ns['background-color-' + k.slice(3)] = sem[k];
      else if (k.indexOf('text-') === 0) ns['text-color-' + k.slice(5)] = sem[k];
      else if (k.indexOf('border-') === 0) {
        ns['border-color-' + k.slice(7)] = sem[k];
        ns['ring-color-' + k.slice(7)] = sem[k];
      }
    });
    /* Names that do not follow the prefix convention. */
    ns['text-color-tooltip-supporting-text'] = p.textSecondary;
    ns['outline-color-brand'] = p.accent;
    ns['outline-color-error'] = p.status.error[400];
    ns['ring-color-brand'] = p.accent;
    ns['ring-color-secondary_alt'] = subtleBorder;
    ns['ring-color-disabled_subtle'] = subtleBorder;
    ns['background-color-border-brand'] = midGray;
    /* Solid status fills stay vivid - they are the real signal colour. */
    ns['background-color-error-solid'] = p.status.error[500];
    ns['background-color-success-solid'] = p.status.success[500];
    ns['background-color-warning-solid'] = p.status.warning[500];
    Object.keys(ns).forEach(function (k) {
      L.push('  --' + k + ': ' + ns[k] + ';');
    });

    /* utility-* scales power badges and charts; same reversal as the ramp. */
    ['utility-gray', 'utility-brand'].forEach(function (name) {
      Object.keys(r).forEach(function (stop) {
        L.push('  --color-' + name + '-' + stop + ': ' + r[stop] + ';');
      });
    });
    ['error', 'success', 'warning', 'green'].forEach(function (family) {
      const ramp = p.status[family];
      Object.keys(ramp).forEach(function (stop) {
        L.push('  --color-utility-' + family + '-' + stop + ': ' + ramp[stop] + ';');
      });
    });
    L.push('}');

    /* A family of semantic utilities carries literal hex values rather than
     * referencing a token, so no amount of variable overriding reaches them.
     * These are the ones that paint panels, hovers and inline code. */
    L.push('.bg-skeleton, .bg-secondary-alt, .bg-secondary-hover, .bg-primary-hover, .bg-disabled-subtle { background-color: var(--nwt-surface-alt); }');
    L.push('.bg-primary-alt, .bg-code-inline { background-color: var(--nwt-canvas); }');
    L.push('.text-code-inline { color: var(--nwt-text-secondary); }');
    L.push('.border-disabled-subtle { border-color: var(--nwt-border); }');

    /* --- surfaces that are hardcoded white -------------------------------
     * --color-white is deliberately NOT remapped: `text-white` is used all
     * over their dark cards and would vanish. Patch backgrounds only. */
    L.push('.bg-white, .bg-warm-white { background-color: var(--nwt-surface); }');
    L.push('.bg-paper { background-color: var(--nwt-canvas); }');

    /* --- the callout panel ------------------------------------------------
     * Text inside a callout has to be measured against the callout, not
     * against the page. Redeclaring the tokens on the panel itself is enough:
     * they inherit, so every rule already written in terms of them follows,
     * including the prose headings that were disappearing into the panel. */
    const CALLOUT = '.bg-leather, [class*="bg-leather"]';
    L.push(CALLOUT + ' { background-color: ' + p.callout + '; color: ' + p.calloutText + ';' +
           ' border-color: ' + p.calloutBorder + '; }');
    L.push(CALLOUT + ' {' +
           ' --nwt-text: ' + p.calloutText + ';' +
           ' --nwt-text-secondary: ' + p.calloutTextSecondary + ';' +
           ' --nwt-surface: ' + mix(p.callout, p.textPrimary, 0.07) + ';' +
           ' --nwt-surface-alt: ' + mix(p.callout, p.textPrimary, 0.12) + ';' +
           ' --nwt-border: ' + p.calloutBorder + ';' +
           ' --color-text-primary: ' + p.calloutText + ';' +
           ' --color-text-secondary: ' + p.calloutTextSecondary + ';' +
           ' --color-text-tertiary: ' + p.calloutTextSecondary + ';' +
           ' --tw-prose-headings: ' + p.calloutText + ';' +
           ' --tw-prose-body: ' + p.calloutTextSecondary + ';' +
           ' --tw-prose-bold: ' + p.calloutText + ';' +
           ' }');
    L.push(CALLOUT + ' h1, ' + CALLOUT + ' h2, ' + CALLOUT + ' h3, ' + CALLOUT + ' h4,' +
           CALLOUT + ' strong, ' + CALLOUT + ' b { color: ' + p.calloutText + '; }');
    L.push(CALLOUT + ' p, ' + CALLOUT + ' li, ' + CALLOUT + ' span { color: ' + p.calloutTextSecondary + '; }');

    L.push('input, textarea, select { background-color: var(--nwt-surface-alt); color: var(--nwt-text); border-color: var(--nwt-border); }');
    L.push('::placeholder { color: var(--nwt-placeholder); }');

    /* --- foreground fix-ups ----------------------------------------------
     * These tokens mean "background" above, so their text-* utilities have to
     * be repointed by hand or they land dark-on-dark. */
    if (!light) {
      L.push('.text-leather, [class*="text-leather/"], .text-black { color: var(--nwt-text); }');
      L.push('.text-paper, [class*="text-paper/"], .text-warm-white { color: var(--nwt-text); }');
      /* Pale brand tones are only ever light text on their dark cards. */
      L.push('.text-brand-25, .text-brand-50, .text-brand-100, .text-gray-25, .text-gray-50, .text-gray-100 { color: var(--nwt-text); }');
      L.push('.text-brand-200, .text-brand-300, .text-gray-200, .text-gray-300 { color: var(--nwt-text-secondary); }');
    }

    /* --- code blocks ------------------------------------------------------
     * highlight.js arrives with its own light stylesheet, so the token layer
     * never touches it. Remap the ground and the token colours off the same
     * palette, using the status ramps that are already contrast-checked. */
    /* The body sits one step above the page and the label strip one above that,
     * so the block still reads as a single component the way it does in light
     * mode. Plain-text blocks carry no tokens at all, so the base colour has to
     * be full-strength body text rather than a dimmed secondary. */
    L.push('pre, pre.hljs, .hljs { background: var(--nwt-surface); color: var(--nwt-text); }');
    L.push('div:has(> pre.hljs) > *:first-child { background-color: var(--nwt-surface-alt); color: var(--nwt-text-secondary); }');
    L.push('code { color: var(--nwt-text); }');
    /* Four hues plus neutrals - enough to parse code, not a rainbow. Keywords
     * borrow the theme accent so the block belongs to the palette. */
    L.push('.hljs-comment, .hljs-quote, .hljs-meta { color: ' + p.textMuted + '; font-style: italic; }');
    L.push('.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section { color: var(--nwt-accent); }');
    L.push('.hljs-string, .hljs-addition, .hljs-regexp { color: ' + p.status.success[400] + '; }');
    L.push('.hljs-number, .hljs-symbol, .hljs-bullet { color: ' + p.status.warning[400] + '; }');
    L.push('.hljs-title, .hljs-name, .hljs-built_in, .hljs-class { color: ' + p.status.information[400] + '; }');
    L.push('.hljs-attr, .hljs-attribute, .hljs-variable, .hljs-template-variable { color: var(--nwt-text-secondary); }');
    L.push('.hljs-deletion { color: ' + p.status.error[400] + '; }');
    L.push('.hljs-emphasis { font-style: italic; }');
    L.push('.hljs-strong { font-weight: 700; }');

    /* --- Tailwind Typography -----------------------------------------------
     * The article body is a `.prose` container carrying its own family of
     * eighteen --tw-prose-* variables, declared on the .prose class itself.
     * They have nothing to do with NextWork's tokens, so every override so far
     * missed them - and --tw-prose-headings is near-black, which is why the
     * headings stayed dark on a dark page while classed text went light. */
    const prose = {
      'body': p.textSecondary,
      'headings': p.textPrimary,
      'lead': p.textSecondary,
      'links': p.accent,
      'bold': p.textPrimary,
      'counters': p.textMuted,
      'bullets': mix(p.border, p.textMuted, 0.4),
      'hr': p.border,
      'quotes': p.textPrimary,
      'quote-borders': p.border,
      'captions': p.textMuted,
      'kbd': p.textPrimary,
      'kbd-shadows': rgba(p.canvas, 0.4),
      'code': p.textPrimary,
      'pre-code': p.textSecondary,
      'pre-bg': p.surface,
      'th-borders': p.border,
      'td-borders': mix(p.canvas, p.border, 0.7)
    };
    const proseKeys = Object.keys(prose);
    L.push('.prose { ' + proseKeys.map(function (k) {
      return '--tw-prose-' + k + ': ' + prose[k] + ';';
    }).join(' ') + ' }');
    /* mapped for prose-invert too, in case a subtree opts into it */
    L.push('.prose { ' + proseKeys.map(function (k) {
      return '--tw-prose-invert-' + k + ': ' + prose[k] + ';';
    }).join(' ') + ' }');

    /* --- gradient stops that start from white ------------------------------
     * Tailwind gradient utilities bake the colour into --tw-gradient-from/to,
     * so a panel using `from-white` paints a white sheet that no token can
     * reach. */
    L.push('[class*="from-white"] { --tw-gradient-from: var(--nwt-surface) !important; }');
    L.push('[class*="via-white"] { --tw-gradient-via: var(--nwt-surface) !important; }');
    L.push('[class*="to-white"] { --tw-gradient-to: var(--nwt-surface) !important; }');
    L.push('[class*="from-paper"] { --tw-gradient-from: var(--nwt-canvas) !important; }');
    L.push('[class*="to-paper"] { --tw-gradient-to: var(--nwt-canvas) !important; }');
    /* --- floating panels --------------------------------------------------
     * Tooltips, menus, dropdowns and dialogs are rendered on demand and often
     * portalled out of the component that owns them, so they miss whichever
     * token pass would otherwise have caught them - a white bubble with our
     * light body text on it is unreadable. Catch the whole class by role. */
    L.push('[popover], dialog, [role="tooltip"], [role="dialog"], [role="menu"], ' +
           '[role="listbox"], [role="alertdialog"], [data-rac][data-trigger], ' +
           '[class*="tooltip"]:not(a):not(button), [class*="popover"], [class*="dropdown"] ' +
           '{ background-color: var(--nwt-surface-alt); color: var(--nwt-text); ' +
           'border-color: var(--nwt-border); }');
    /* Their own text utilities inside a bubble must not stay dark-on-dark. */
    L.push('[popover] .text-primary, dialog .text-primary, [role="tooltip"] .text-primary, ' +
           '[role="dialog"] .text-primary { color: var(--nwt-text); }');

    /* Slide-over panels (the assistant drawer) arrive as a fixed white sheet
     * with a gradient fade. Theme the sheet and neutralise a fade that ends in
     * a light literal, or it shows as a white band over the page. */
    L.push('[class*="fixed"][class*="inset-y"], [class*="fixed"][class*="right-0"][class*="h-full"], ' +
           '[class*="translate-x"][class*="fixed"] { background-color: var(--nwt-surface); }');

    /* --- borders, rings, selection --------------------------------------- */
    L.push('.border-glass-border, .border-white, .divide-gray-200 > * + * { border-color: var(--nwt-border); }');
    L.push('.outline-brand { outline-color: var(--nwt-accent); }');
    L.push('*:focus-visible { outline-color: var(--nwt-accent); }');
    L.push('::selection { background: ' + rgba(p.accent, 0.32) + '; color: var(--nwt-text); }');

    if (o.accentLinks) {
      L.push('a:not([class*="bg-"]):not([class*="text-"]) { color: var(--nwt-accent); }');
    }
    if (o.softenShadows) {
      L.push('[class*="shadow-"] { --tw-shadow-color: rgba(0, 0, 0, 0.45); }');
    }
    if (o.themeScrollbars) {
      /* On the root, not on every element: scrollbar-color inherits, so the
       * old universal selector bought nothing and put * into every recalc.
       * rootSel rather than a literal html, because there is no html inside a
       * shadow tree. */
      L.push(rootSel + ' { scrollbar-color: ' + p.border + ' ' + p.canvas + '; }');
      L.push('::-webkit-scrollbar { width: 12px; height: 12px; }');
      L.push('::-webkit-scrollbar-track { background: ' + p.canvas + '; }');
      L.push('::-webkit-scrollbar-thumb { background: ' + p.border + '; border-radius: 8px; border: 3px solid ' + p.canvas + '; }');
      L.push('::-webkit-scrollbar-thumb:hover { background: ' + mix(p.border, p.textMuted, 0.5) + '; }');
    }
    if (o.invertLogos && !light) {
      /* Their mark is dark ink on transparent, so it has to be flipped to stay
       * visible. Plain invert() rotates the hue as well as the value - their
       * warm near-black came back as pale blue - so drive it to black first and
       * then invert, which lands on neutral white whatever the source colour.
       * 88% keeps it level with body text instead of brighter than it.
       * Anything already named *-white is skipped. */
      L.push('img[src*="logo"]:not([src*="white"]) { filter: brightness(0) invert(1); opacity: 0.88; }');
      /* The giant footer wordmark is a watermark, shipped at 6% opacity. The
       * same 6% reads far heavier as light-on-dark than dark-on-light, so it
       * came back as a billboard. Halve it to keep it a whisper. */
      L.push('img[src*="wordmark"]:not([src*="white"]) { filter: brightness(0) invert(1); opacity: 0.03; }');
    }
    if (o.neutralizeGlows && !light) {
      /* The hero bloom is an inline cream radial-gradient, so it needs both an
       * attribute selector and a filter. :empty keeps this off real content. */
      L.push('[style*="gradient"]:empty { filter: grayscale(0.9) brightness(0.5); }');
      /* Scroll fades (bottom of the Steps list, the docs hero) are class-based
       * linear-gradients ending in a literal cream, so no token reaches them -
       * they show up as a pale slab floating over the dark page. Re-point them
       * at whatever they are supposed to be blending into: the canvas normally,
       * but nothing at all when a wallpaper is showing, or the fade paints an
       * opaque block over the artwork and the panel reads as a stuck-on card. */
      /* These fades exist to blend a scrolling list into a cream page. On a
       * themed page they can only ever paint a slab that does not match what
       * is behind it - the box that kept coming back at the bottom of the
       * Steps list. Remove them rather than try to match the ground. */
      L.push('.docs-hero-gradient:empty, [class*="pointer-events-none"][class*="sticky"]:empty, [class*="pointer-events-none"][class*="inset-x-0"]:empty { background-image: none !important; }');
    }
    if (o.patchStubborn && !light) {
      /* Arbitrary-value utilities like bg-[#FDEEE2] bypass the token layer.
       * Matching on "#F" only catches the very light ones. */
      /* Arbitrary-value utilities (bg-[#FDEEE2] and friends) bypass the token
       * layer completely. Some ship with Tailwind's ! suffix, hence the
       * !important. Foreground arbitrary colours are left alone - they read
       * fine on a dark ground and are often deliberate accents. */
      L.push('[class*="bg-[#"] { background-color: var(--nwt-surface-alt) !important; }');
      /* The Secret Mission card is drawn by an inline data-URI SVG filled with
       * a cream hex, so it is invisible to both tokens and class overrides -
       * the panel stayed light while the text on it went light too. Matching
       * the encoded fill (%23F...) keeps this off dark illustrations. */
      L.push('[style*="data:image/svg"][style*="%23F"], [style*="data:image/svg"][style*="%23f"] { background-image: none !important; background-color: var(--nwt-surface); }');
      L.push('[class*="fill-[#"] { fill: var(--nwt-surface-alt); }');
      /* Some of these ship with Tailwind's ! prefix, so match it. */
      L.push('[class*="border-sand"], [class*="border-[#"] { border-color: var(--nwt-border) !important; }');
    }
    if (o.dimImages > 0) {
      const b = (100 - o.dimImages) / 100;
      L.push('img, video, [style*="background-image"] { filter: brightness(' + b.toFixed(2) + '); }');
      L.push('img:hover, video:hover { filter: none; }');
    }

    /* --- focus HUD --------------------------------------------------------
     * Styled here rather than in the content script so it wears the current
     * theme like everything else. */
    /* Sits above the step list in the right rail and matches its width, so it
     * reads as part of the page furniture rather than something stuck on. The
     * rail is a 280px column at the right edge and its rows measure 232px with
     * 24px of inset, so the timer matches the rows rather than the column. */
    /* 76px clears the account avatar, which sits in the same corner. Width is
     * content-driven with a floor and a ceiling rather than fixed, so a long
     * time never pushes the label outside the box. */
    /* Sized in vw with clamps rather than fixed px, so it shrinks as the page
     * text grows instead of expanding into it. Draggable, hence pointer-events
     * and the grab cursor; the content script stores wherever it is put. */
    L.push('#nwt-focus { position: fixed; top: 76px; right: 24px;' +
           ' box-sizing: border-box; z-index: 2147483000;' +
           ' display: flex; align-items: baseline; justify-content: flex-start;' +
           ' gap: calc(clamp(7px, 0.7vw, 12px) * var(--nwt-hud-scale, 1));' +
           ' padding: calc(clamp(6px, 0.6vw, 10px) * var(--nwt-hud-scale, 1))' +
           ' calc(clamp(10px, 1vw, 16px) * var(--nwt-hud-scale, 1));' +
           ' min-width: calc(92px * var(--nwt-hud-scale, 1));' +
           ' border-radius: calc(clamp(9px, 0.8vw, 12px) * var(--nwt-hud-scale, 1));' +
           ' touch-action: none;' +
           ' pointer-events: auto; cursor: grab; user-select: none;' +
           /* Written out rather than as the font shorthand, because the size
            * is a calc() and the shorthand is fussier to read at a glance. */
           ' font-family: ui-monospace, "Cascadia Code", Consolas, monospace;' +
           ' font-weight: 700; line-height: 1;' +
           ' font-size: calc(clamp(14px, 1.15vw, 21px) * var(--nwt-hud-scale, 1));' +
           ' font-variant-numeric: tabular-nums; letter-spacing: -0.01em;' +
           ' background: ' + rgba(p.surfaceAlt, 0.92) + '; color: var(--nwt-text);' +
           ' border: 1px solid var(--nwt-border);' +
           ' box-shadow: 0 6px 24px rgba(0,0,0,.28); backdrop-filter: blur(6px);' +
           ' transition: opacity 120ms ease; }');
    L.push('#nwt-focus:hover { opacity: 1; }');
    /* Locked means it stays put AND stops intercepting the pointer, so it can
     * never be in the way of something underneath it. */
    L.push('#nwt-focus[data-locked="1"] { cursor: default; pointer-events: none; }');
    L.push('#nwt-focus[data-dragging="1"] { cursor: grabbing; opacity: .9;' +
           ' box-shadow: 0 10px 34px rgba(0,0,0,.42); }');
    L.push('#nwt-focus .nwt-focus-label {' +
           ' font-size: calc(clamp(8px, 0.55vw, 10px) * var(--nwt-hud-scale, 1));' +
           ' font-weight: 600; letter-spacing: .1em; text-transform: uppercase;' +
           ' color: var(--nwt-text-muted); }');
    /* No right rail to align with on a narrow window, so tuck it back down. */
    L.push('#nwt-focus .nwt-focus-time { flex: none; }');
    L.push('@media (max-width: 900px) { #nwt-focus { top: auto; bottom: 18px; right: 18px;' +
           ' border-radius: 999px; } }');
    L.push('#nwt-focus[data-state="running"] { border-color: ' + rgba(p.accent, 0.55) + '; }');
    L.push('#nwt-focus[data-state="running"] .nwt-focus-time { color: var(--nwt-accent); }');
    L.push('#nwt-focus[data-state="over"] { border-color: ' + p.status.warning[400] + '; }');
    L.push('#nwt-focus[data-state="over"] .nwt-focus-time { color: ' + p.status.warning[400] + '; }');
    L.push('#nwt-focus[data-state="paused"] { opacity: .72; }');

    /* Root surface last, so nothing above accidentally wins it. */
    /* scopeCSS turns this into `html body`. Meaningless inside a shadow root. */
    if (!shadow) {
      L.push('body { background-color: var(--nwt-canvas); color: var(--nwt-text); }');
    }

    /* --- scenery ----------------------------------------------------------
     * Hand-drawn SVG layers, encoded inline so nothing has to be fetched (the
     * site's CSP blocks external stylesheets and images from this context).
     * The hero sits on the root background; the two parallax bands ride on
     * root pseudo-elements pinned to the viewport, which keeps the motion on
     * the compositor instead of repainting the page every frame. */


    if ((theme.backdrop || scene) && !shadow) {
      const imgs = [], sizes = [], positions = [], repeats = [];
      let heroPaper = null;
      if (scene && scene.hero) {
        /* A hero is normally generated SVG. It can instead name a painted
         * wallpaper, which arrives already encoded as a data URI. */
        const papers = (typeof root !== 'undefined' && root.NWT_WALLPAPERS) || {};
        const paper = scene.hero.wallpaper && papers[scene.hero.wallpaper];
        heroPaper = paper || null;
        if (scene.hero.wallpaper && !paper) {
          /* Named a wallpaper that is not loaded. Skipping beats emitting
           * url(undefined), but say so: silently dropping the background is
           * indistinguishable from a stale build, and that cost real time. */
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[nwt] wallpaper "' + scene.hero.wallpaper +
                         '" not found - is src/wallpapers.js loaded before ' +
                         'theme-engine.js? Background layer skipped.');
          }
        } else {
          imgs.push(paper ? 'url("' + paper.uri + '")' : svgUrl(scene.hero.svg));
          sizes.push(scene.hero.size);
          positions.push(scene.hero.position);
          repeats.push('no-repeat');
        }
      }
      /* A wash is already a comma-separated list, so expand it layer by layer
       * or the size/position lists fall out of step and CSS cycles them. */
      if (theme.backdrop) {
        splitSelectors(theme.backdrop).forEach(function (layer) {
          imgs.push(layer); sizes.push('cover'); positions.push('center');
          repeats.push('no-repeat');
        });
      }
      /* An image wallpaper is sized to the full viewport width and pinned to
       * the bottom, so the things worth seeing - which on this artwork are out
       * at the left and right edges - survive any window shape. `cover` would
       * instead scale to height on a narrow window and crop inward from the
       * sides, taking the edges off first.
       *
       * The cost is bare space above the image on a tall window. Filling that
       * with the theme canvas draws a lighter band and a hard horizontal edge
       * across the top of the scene, so it gets filled with the image's own
       * sky colour instead, measured at generation time. The join disappears. */
      if (heroPaper && heroPaper.sky) {
        imgs.push('linear-gradient(' + heroPaper.sky + ', ' + heroPaper.sky + ')');
        sizes.push('cover'); positions.push('center'); repeats.push('no-repeat');
      }

      /* Grain and an edge falloff sit in FRONT of everything else. Perfectly
       * smooth vectors are what read as clip-art; a little noise and a soft
       * frame are what read as a photograph. */
      const atmos = (typeof root !== 'undefined' && root.NWT_ATMOS) || null;
      if (scene && atmos) {
        /* Light, not heavy. A vignette darkens the corners, and the corner is
         * exactly where the character in every one of these pictures stands,
         * so at 0.34 it was quietly dimming the one thing worth seeing. */
        imgs.unshift(svgUrl(atmos.vignette(light ? '#5b5348' : '#000000', light ? 0.05 : 0.14)));
        sizes.unshift('cover'); positions.unshift('center'); repeats.unshift('no-repeat');
        imgs.unshift(svgUrl(atmos.grainTile(light ? 0.030 : 0.045)));
        sizes.unshift('220px 220px'); positions.unshift('center'); repeats.unshift('repeat');
      }
      L.push(rootSel + ' { background-image: ' + imgs.join(', ') + ';' +
             ' background-repeat: ' + repeats.join(', ') + ';' +
             ' background-size: ' + sizes.join(', ') + ';' +
             ' background-position: ' + positions.join(', ') + ';' +
             ' background-attachment: fixed; }');

      /* The scenery rides on root pseudo-elements at z-index -1, which paint
       * BELOW body's background box. So the page ground has to be transparent
       * or the whole scene is hidden behind it - the root keeps painting the
       * canvas colour, so nothing is lost. */
      L.push('body { background-color: transparent; }');
      /* The page ground goes transparent so the scenery behind it shows. But
       * NextWork also paints .bg-paper on sticky headers and modal panels, and
       * a see-through modal lets the page bleed through it - which is what the
       * Your Work overlay was doing. Anything positioned is a panel, not the
       * ground, so it keeps its surface. */
      L.push('.bg-paper:not([class*="fixed"]):not([class*="sticky"]):not([class*="absolute"]), .bg-brand-primary:not([class*="fixed"]):not([class*="sticky"]):not([class*="absolute"]) { background-color: transparent; }');
      /* and the panels that ARE positioned get a real surface to sit on */
      L.push('.bg-paper[class*="fixed"], .bg-paper[class*="sticky"], .bg-paper[class*="absolute"] { background-color: var(--nwt-surface); }');

      if (o.animateBackdrop && !scene && theme.backdrop) {
        /* No scenery: drift the wash itself so the page still breathes. */
        L.push('@keyframes nwt-drift { from { background-position: 0% 0%; } to { background-position: 100% 100%; } }');
        L.push(rootSel + ' { background-size: 112% 112%; animation: nwt-drift 120s ease-in-out infinite alternate; }');
        L.push('@media (prefers-reduced-motion: reduce) { ' + rootSel + ' { animation: none; background-size: cover; } }');
      }
    }

    if (scene) {
      L.push(rootSel + '::before, ' + rootSel + '::after {' +
             ' content: ""; position: fixed; left: 0; top: 0; height: 100vh;' +
             ' pointer-events: none; z-index: -1; background-repeat: repeat-x;' +
             ' will-change: transform; }');
      ['far', 'near'].forEach(function (which) {
        const layer = scene[which];
        if (!layer) return;
        const pseudo = which === 'far' ? '::before' : '::after';
        const name = 'nwt-pan-' + which;
        /* Dissolve the top of every band. A band that just stops has a straight
         * horizontal edge, and on a page of text that edge reads as a rule -
         * which is exactly the "cutting through" artefact. */
        /* The mask has to fade the edge that meets the page, and that depends
         * on where the band is anchored. A fixed 'to top' fade is right for a
         * band sitting on the floor and catastrophic for one hanging from the
         * ceiling - it erases exactly the part meant to be seen, which is why
         * the forest canopy had vanished. */
        /* A sparse motif layer covers the whole viewport, so the band fade
         * would erase most of it. It gets a light falloff at the very top
         * instead, just enough that shapes do not pop in at the edge. */
        if (layer.sparse) {
          const soft = 'linear-gradient(to bottom, rgba(0,0,0,0) 0%,' +
                       ' rgba(0,0,0,1) 14%, rgba(0,0,0,1) 100%)';
          L.push(rootSel + pseudo + ' {' +
                 ' width: calc(100vw + ' + layer.tile + 'px);' +
                 ' background-image: ' + svgUrl(layer.svg) + ';' +
                 ' background-size: ' + layer.tile + 'px ' + layer.height + ';' +
                 ' background-position: left top;' +
                 ' background-repeat: repeat-x;' +
                 ' -webkit-mask-image: ' + soft + '; mask-image: ' + soft + ';' +
                 (o.animateBackdrop
                   ? ' animation: ' + name + ' ' + layer.seconds + 's linear infinite;'
                   : '') +
                 ' }');
          if (o.animateBackdrop) {
            L.push('@keyframes ' + name + ' { from { transform: translate3d(0,0,0); }' +
                   ' to { transform: translate3d(-' + layer.tile + 'px,0,0); } }');
          }
          return;
        }
        const anchor = layer.y || 'bottom';
        const pct = /^(\d+)%$/.exec(anchor);
        const atBottom = anchor === 'bottom' || (pct && +pct[1] >= 55);
        const atTop = anchor === 'top' || (pct && +pct[1] <= 25);
        const fade = atBottom
          ? 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 96%)'
          : atTop
            ? 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 96%)'
            : 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)';
        L.push(rootSel + pseudo + ' {' +
               /* One tile wider than the viewport, so panning a full tile never
                * exposes the trailing edge. */
               ' width: calc(100vw + ' + layer.tile + 'px);' +
               ' background-image: ' + svgUrl(layer.svg) + ';' +
               ' background-size: ' + layer.tile + 'px ' + layer.height + ';' +
               ' background-position: left ' + (layer.y || 'bottom') + ';' +
               ' -webkit-mask-image: ' + fade + '; mask-image: ' + fade + ';' +
               /* depth of field: the far plane is genuinely out of focus */
               (layer.blur ? ' filter: blur(' + layer.blur + 'px);' : '') +
               (o.animateBackdrop
                 ? ' animation: ' + name + ' ' + layer.seconds + 's linear infinite;'
                 : '') +
               ' }');
        if (o.animateBackdrop) {
          /* Travel exactly one tile, so the band wraps with no visible seam. */
          L.push('@keyframes ' + name + ' { from { transform: translate3d(0,0,0); }' +
                 ' to { transform: translate3d(-' + layer.tile + 'px,0,0); } }');
        }
      });
      L.push('@media (prefers-reduced-motion: reduce) { ' + rootSel + '::before, ' + rootSel +
             '::after { animation: none; } }');
    }

    /* Scope the generated rules so document order cannot beat us. The user's
     * own CSS is appended afterwards, unscoped, so they keep full control. */
    let css = scopeCSS(L.join('\n'), prefix, rootSel);

    /* Checked here, not only where a theme is imported.
     *
     * The editor refuses a file that can reach the network, but storage
     * outlives the version that wrote it: a theme imported before that check
     * existed is still there, still selected, and still injected on every
     * visit, without anyone opening the editor again. This is the last point
     * before the rules reach the page, so it is the one that has to hold. */
    const custom = theme.customCSS ? String(theme.customCSS).trim() : '';
    if (custom && cssReachesOut(custom)) {
      /* Said out loud. The list of things that can fetch has grown, so custom
       * CSS an older version accepted can stop applying after an upgrade, and
       * dropping it in silence leaves someone looking at a theme quietly
       * missing a piece, with nothing to search for. */
      console.warn('[nwt] the custom CSS in theme "' + (theme.name || 'unnamed') +
                   '" can load something over the network, so it is not being ' +
                   'applied. Remove the url(), src(), image(), image-set(), ' +
                   'cross-fade() or @import in it to use it again.');
    } else if (custom) {
      css += '\n/* --- custom CSS --- */\n' + custom;
    }

    return css;
  }

  root.NWT = {
    BASE_KEYS, PRESETS, DEFAULT_SETTINGS, DEFAULT_TUNING, SCHEMA,
    getTheme, cloneTheme, migrate, buildPalette, buildCSS, formatDial, svgUrl,
    focusElapsed, focusRemaining, formatDuration,
    cssReachesOut, withoutCssEscapes,
    toneOf,
    debounce,
    color: { hexToRgb, rgbToHex, hexToHsl, hslToHex, mix, rgba, lighten, contrastRatio, clamp }
  };
})(typeof self !== 'undefined' ? self : this);
