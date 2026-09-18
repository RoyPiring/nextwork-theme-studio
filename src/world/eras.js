/* NextWorld · eras: how a plot becomes a country
 * A campground earns its next era by projects built. Each era brings the
 * civic buildings a place that size needs, the way a city builder does:
 * a town needs a town hall and a school; a city needs a hospital, a
 * library and a data centre; a capital gets its capitol. Civic buildings
 * are not projects: they arrive because the place has grown into them.
 * The land is a choice too, scenery only. */
'use strict';
(function () {
  const S = NW.State;
  /* the civic district: south of the house, either side of the trunk road */
  const H = S.HOME;
  const ERAS = [
    { n: 0, name: 'Campground', word: 'a campground', needs: 'the bare necessities: a fire, water, a board to plan on',
      civic: [['campfire', H[0] + 1.6, H[1] + 2.3], ['pump', H[0] - 2.4, H[1] + 2.6]] },
    { n: 5, name: 'Fort', word: 'a fort', needs: 'a cabin, a stockade, a windmill, water, a workshop',
      civic: [['workshop', H[0] - 6, H[1] + 4]] },
    { n: 15, name: 'Town', word: 'a town', needs: 'a town hall, a schoolhouse, a general store, a community hall; the main street paved',
      civic: [['townhall', H[0] - 4, H[1] + 4], ['school', H[0] + 3, H[1] + 4], ['store', H[0] - 5, H[1] + 8], ['community', H[0] + 3, H[1] + 8]] },
    { n: 35, name: 'City', word: 'a city', needs: 'a city hall, a hospital, a library, a data centre, a fire station, a park; every lane paved and lit',
      civic: [['cityhall', H[0] - 6, H[1] + 4], ['hospital', H[0] + 3, H[1] + 12], ['library', H[0] - 5, H[1] + 12], ['datacentre', H[0] - 9, H[1] + 8], ['firestation', H[0] + 7, H[1] + 8], ['park', H[0] - 2, H[1] + 11]] },
    { n: 60, name: 'Metropolis', word: 'a metropolis', needs: 'a university, a stadium, a station, a solar farm, a water tower',
      civic: [['university', H[0] - 10, H[1] + 16], ['stadium', H[0] - 1, H[1] + 16], ['station', H[0] + 6, H[1] + 16], ['solar', H[0] + 6, H[1] + 12], ['watertower', H[0] + 8, H[1] + 4.5]] },
    { n: 90, name: 'Capital', word: 'the capital', needs: 'the capitol, with its dome and its plaza',
      civic: [['capitol', H[0] - 4, H[1] + 20]] },
    { n: 130, name: 'Kingdom', word: 'a kingdom', needs: 'the river widens; a second city across it, with a palace',
      civic: [['palace', 46, 37], ['townhall2', 51, 41]] }
  ];
  /* what counts: every project built, yours and the catalogue's */
  const score = s => s.done.length + s.lists.reduce((a, l) => a + (l.done | 0), 0);
  const eraOf = s => { const n = score(s); let e = ERAS[0]; ERAS.forEach(x => { if (n >= x.n) e = x; }); return e; };
  const nextEra = s => ERAS.find(x => x.n > score(s)) || null;
  const civicOf = s => { const n = score(s), out = []; ERAS.forEach(e => { if (n >= e.n) e.civic.forEach(c => out.push({ kind: c[0], gx: c[1], gy: c[2], era: e.name })); }); /* later halls replace earlier ones on the same ground */ return out.filter(c => !(c.kind === 'townhall' && n >= 35)); };
  const level = s => ERAS.indexOf(eraOf(s));   /* 0..6, for paving, lamps, the river */
  /* the land: a choice, scenery only */
  const BIOMES = { hill: { name: 'Hill Country', grass: ['#7fb35a', '#b9b162'], stone: '#d9d2b8', tree: 'oak', water: '#3ea3e8', sand: '#d9c9a0' }, desert: { name: 'Desert', grass: ['#d8b97a', '#e2c58a'], stone: '#e9d7a8', tree: 'cactus', water: '#4fb3f0', sand: '#efe0b8' }, forest: { name: 'Forest', grass: ['#4f8f3f', '#6aa64f'], stone: '#a8a89a', tree: 'pine', water: '#2f7fb8', sand: '#c8b98a' }, coast: { name: 'Coast', grass: ['#8fc76a', '#a9d287'], stone: '#e9e2d0', tree: 'palm', water: '#3fbfe8', sand: '#f2e6c4' } };
  const biomeOf = s => BIOMES[s.biome] || BIOMES.hill;
  NW.Eras = { ERAS, BIOMES, score, eraOf, nextEra, civicOf, level, biomeOf };
})();
