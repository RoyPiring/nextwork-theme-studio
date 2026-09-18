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
  /* the moment a threshold is met, in the words of the era reached */
  const LEVEL_UP = { campground: 'You have a fire and a place to sleep. Everything starts here.', fort: 'Five projects, and the walls are up. What you know now protects what you build next.', town: 'Fifteen projects. People have moved in to be near what you made.', city: 'Thirty-five. Streets, a hospital, a library. Your work is part of other people\u2019s days now.', metropolis: 'Sixty. Trams, crowds, cranes. The city runs on things you understood one at a time.', capital: 'Ninety projects. Others come here to learn how you did it.', kingdom: 'One hundred and twenty. Nothing here is borrowed. You built all of it.' };
  NW.Eras = { ERAS, LEVEL_UP, score, eraOf, nextEra, level };
})();
