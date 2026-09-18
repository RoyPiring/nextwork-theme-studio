/* NextWorld · eras: how a plot becomes a country
 * The plans in plans.js are the eras. A place earns the next plan by the
 * projects built on it, and the whole plan changes: roads re-laid, the
 * water channelled, the civic buildings the place now needs. The land
 * itself is a choice, scenery only. */
'use strict';
(function () {
  const S = NW.State;
  const ERAS = NW.PLANS.map(p => ({ n: p.threshold, name: p.name, word: p.word, needs: p.story, plan: p }));
  const score = S.score;
  const eraOf = s => { const n = score(s); let e = ERAS[0]; ERAS.forEach(x => { if (n >= x.n) e = x; }); return e; };
  const nextEra = s => ERAS.find(x => x.n > score(s)) || null;
  const level = s => ERAS.indexOf(eraOf(s));
  const BIOMES = { hill: { name: 'Hill Country', grass: ['#7fb35a', '#b9b162'], stone: '#d9d2b8', tree: 'oak', water: '#3ea3e8', sand: '#d9c9a0' }, desert: { name: 'Desert', grass: ['#d8b97a', '#e2c58a'], stone: '#e9d7a8', tree: 'cactus', water: '#4fb3f0', sand: '#efe0b8' }, forest: { name: 'Forest', grass: ['#4f8f3f', '#6aa64f'], stone: '#a8a89a', tree: 'pine', water: '#2f7fb8', sand: '#c8b98a' }, coast: { name: 'Coast', grass: ['#8fc76a', '#a9d287'], stone: '#e9e2d0', tree: 'palm', water: '#3fbfe8', sand: '#f2e6c4' } };
  const biomeOf = s => BIOMES[s.biome] || BIOMES.hill;
  NW.Eras = { ERAS, BIOMES, score, eraOf, nextEra, level, biomeOf };
})();
