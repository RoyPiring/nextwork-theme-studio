/* NextWorld · plans: the site plan for every era
 * Seven settlement plans on the 68×68 grid, drawn up the way a planner
 * would: the founding fire at (30,34) stays the centre through every era;
 * each plan lays its own roads, water, zones, civic buildings, lot rows
 * and landscape, and the whole plan changes when the place crosses a
 * threshold. Coordinates are tiles, x east, y south. */
'use strict';
(function () {
  const R = (x0, y0, x1, y1, paved) => ({ from: [x0, y0], to: [x1, y1], paved: !!paved });
  const row = (y, x0, x1, road) => ({ y, x0, x1, step: 3, road });
  const C = (kind, x, y) => ({ kind, at: [x, y] });
  /* the west-bank grid the city, metropolis, capital and kingdom share */
  const GRID_ROWS = [22, 28, 38, 44, 50], GRID_COLS = [7, 14, 21, 27, 34, 41];
  const grid = (rows, cols, x1, y1, paved) => rows.map(y => R(7, y, x1, y, paved)).concat(cols.map(x => R(x, 22, x, y1, paved)));
  const metroRoads = (y1) => [R(7, 33, 44, 33, true), R(45, 33, 46, 33, true), R(47, 33, 57, 33, true)]
    .concat([22, 28, 38, 44, 50, 56].concat(y1 > 56 ? [62] : []).map(y => R(7, y, 42, y, true)))
    .concat([7, 14, 21, 26, 27, 34, 35, 41, 42].map(x => R(x, 22, x, y1, true)));
  const capitalRoads = () => [R(7, 33, 44, 33, true), R(45, 33, 46, 33, true), R(47, 33, 57, 33, true), R(7, 22, 42, 22, true), R(7, 28, 42, 28, true), R(7, 38, 27, 38, true), R(34, 38, 42, 38, true), R(7, 44, 27, 44, true), R(34, 44, 42, 44, true), R(7, 50, 42, 50, true), R(7, 56, 42, 56, true), R(7, 62, 42, 62, true), R(7, 22, 7, 62, true), R(14, 22, 14, 62, true), R(21, 22, 21, 62, true), R(26, 22, 26, 50, true), R(27, 22, 27, 50, true), R(27, 56, 27, 62, true), R(34, 22, 34, 50, true), R(35, 22, 35, 50, true), R(34, 56, 34, 62, true), R(41, 22, 41, 62, true), R(42, 22, 42, 62, true)];
  const cityLots = [row(32, 28, 28, 'south'), row(32, 33, 33, 'south'), row(29, 28, 33, 'north'), row(32, 22, 26, 'south'), row(32, 35, 40, 'south'), row(29, 22, 26, 'north'), row(34, 22, 26, 'north'), row(37, 22, 26, 'south'), row(27, 22, 26, 'south'), row(27, 28, 33, 'south'), row(27, 35, 40, 'south'), row(39, 35, 40, 'north'), row(23, 22, 26, 'north'), row(23, 28, 33, 'north'), row(23, 35, 40, 'north'), row(43, 22, 26, 'south'), row(43, 28, 33, 'south'), row(43, 35, 40, 'south'), row(45, 22, 26, 'north'), row(45, 28, 33, 'north'), row(45, 35, 40, 'north'), row(49, 22, 26, 'south'), row(49, 28, 33, 'south'), row(49, 35, 40, 'south'), row(32, 15, 20, 'south'), row(29, 15, 20, 'north'), row(34, 15, 20, 'north'), row(37, 15, 20, 'south'), row(27, 15, 20, 'south'), row(23, 15, 20, 'north'), row(39, 15, 20, 'north'), row(43, 15, 20, 'south'), row(45, 15, 20, 'north'), row(49, 15, 20, 'south')];
  const metroLots = [row(32, 28, 28, 'south'), row(32, 33, 33, 'south'), row(29, 28, 33, 'north'), row(32, 22, 25, 'south'), row(32, 36, 40, 'south'), row(29, 22, 25, 'north'), row(34, 22, 25, 'north'), row(37, 22, 25, 'south'), row(27, 22, 25, 'south'), row(27, 28, 33, 'south'), row(27, 36, 40, 'south'), row(39, 39, 40, 'north'), row(39, 25, 25, 'north'), row(23, 22, 25, 'north'), row(23, 28, 33, 'north'), row(23, 36, 40, 'north'), row(43, 22, 25, 'south'), row(43, 28, 33, 'south'), row(43, 36, 40, 'south'), row(45, 22, 25, 'north'), row(45, 28, 33, 'north'), row(49, 22, 25, 'south'), row(49, 28, 33, 'south'), row(49, 36, 40, 'south'), row(51, 22, 25, 'north'), row(51, 28, 33, 'north'), row(51, 36, 40, 'north'), row(55, 22, 25, 'south'), row(55, 28, 33, 'south'), row(55, 36, 40, 'south'), row(57, 22, 25, 'north'), row(57, 28, 33, 'north'), row(57, 36, 40, 'north'), row(21, 22, 25, 'south'), row(21, 36, 40, 'south'), row(21, 15, 20, 'south'), row(21, 8, 13, 'south'), row(27, 15, 20, 'south'), row(29, 15, 20, 'north'), row(32, 15, 20, 'south'), row(34, 15, 20, 'north'), row(37, 15, 20, 'south'), row(39, 15, 20, 'north'), row(43, 15, 20, 'south'), row(45, 15, 20, 'north'), row(49, 15, 20, 'south'), row(51, 15, 20, 'north'), row(55, 15, 20, 'south'), row(57, 15, 20, 'north'), row(27, 8, 13, 'south'), row(51, 8, 13, 'north'), row(55, 8, 13, 'south')];
  const capitalLots = [row(32, 28, 28, 'south'), row(32, 33, 33, 'south'), row(29, 28, 33, 'north'), row(32, 22, 25, 'south'), row(32, 36, 40, 'south'), row(29, 22, 25, 'north'), row(34, 22, 25, 'north'), row(37, 22, 25, 'south'), row(37, 36, 36, 'south'), row(27, 22, 25, 'south'), row(27, 28, 33, 'south'), row(27, 36, 40, 'south'), row(39, 39, 40, 'north'), row(39, 25, 25, 'north'), row(23, 22, 25, 'north'), row(23, 28, 33, 'north'), row(23, 36, 40, 'north'), row(43, 22, 25, 'south'), row(43, 36, 40, 'south'), row(45, 22, 25, 'north'), row(49, 22, 25, 'south'), row(49, 36, 40, 'south'), row(55, 22, 25, 'south'), row(55, 36, 40, 'south'), row(57, 22, 26, 'north'), row(57, 28, 33, 'north'), row(57, 35, 40, 'north'), row(61, 22, 26, 'south'), row(61, 28, 33, 'south'), row(61, 35, 40, 'south'), row(21, 22, 25, 'south'), row(21, 36, 40, 'south'), row(21, 15, 20, 'south'), row(21, 8, 13, 'south'), row(27, 15, 20, 'south'), row(29, 15, 20, 'north'), row(32, 15, 20, 'south'), row(34, 15, 20, 'north'), row(37, 15, 20, 'south'), row(39, 15, 20, 'north'), row(43, 15, 20, 'south'), row(45, 15, 20, 'north'), row(49, 15, 20, 'south'), row(51, 15, 20, 'north'), row(55, 15, 20, 'south'), row(57, 15, 20, 'north'), row(61, 15, 20, 'south'), row(27, 8, 13, 'south'), row(51, 8, 13, 'north'), row(55, 8, 13, 'south'), row(61, 8, 13, 'south')];
  const metroCivic = [C('cityhall', 28, 39.2), C('hospital', 36.3, 34.4), C('library', 38.6, 39.3), C('firestation', 36.3, 39.3), C('datacentre', 43.2, 34.3), C('school', 36, 29), C('store', 38.6, 29), C('community', 22.5, 45.3), C('park', 22, 39), C('gasworks', 36, 45.2), C('greenhouse', 8, 40), C('greenhouse', 11, 40), C('workshop', 12, 57), C('watertower', 43.2, 30.3)];
  const metroBuilds = [C('station', 30, 20), { kind: 'rail', from: [0, 19], to: [40, 19] }, C('university', 15, 23.05), C('verticalfarm', 8, 23), C('greenhouse', 11, 23), C('greenhouse', 8, 29), C('greenhouse', 11, 29), C('waterworks', 17, 57), C('stadium', 36, 51), C('solar', 8, 57), C('watertower', 15, 57)];
  /* the capital: the capitol at the foot of the mall, then the monuments up the mall toward the plaza, then the halls either side */
  /* the capital takes the south of the plot: three more streets, and the kingdom the far east bank beyond the lists, so the place
   * keeps its spacing as it grows instead of packing the same ground tighter */
  const SOUTH_ROADS = [68, 74, 80].map(y => R(7, y, 42, y, true)).concat([7, 14, 21, 27, 34, 41, 42].map(x => R(x, 62, x, 80, true)));
  const SOUTH_LOTS = [].concat.apply([], [[67, 'south'], [69, 'north'], [73, 'south'], [75, 'north'], [79, 'south']].map(([y, side]) => [row(y, 8, 13, side), row(y, 15, 20, side), row(y, 22, 26, side), row(y, 28, 33, side), row(y, 35, 40, side)]));
  const FAR_EAST_ROADS = [22, 28, 34, 40, 46, 52].map(y => R(68, y, 92, y, true)).concat([68, 76, 84, 92].map(x => R(x, 22, x, 52, true))).concat([R(58, 34, 68, 34, true)]);
  const FAR_EAST_LOTS = [].concat.apply([], [[23, 'north'], [27, 'south'], [29, 'north'], [33, 'south'], [35, 'north'], [39, 'south'], [41, 'north'], [45, 'south'], [47, 'north'], [51, 'south']].map(([y, side]) => [row(y, 69, 75, side), row(y, 77, 83, side), row(y, 85, 91, side)]));
  const capitalBuilds = [C('capitol', 28, 52), C('arch', 30, 38), C('obelisk', 30, 40.5), C('pool', 29, 42.5), C('memorial', 30, 48.4), C('cityhall', 28, 57.2), C('library', 24.4, 51.4), C('park', 16, 51.2), C('hydroponic', 8, 35), C('hydroponic', 10, 35), C('hydroponic', 12, 35), C('reservoir', 36, 57.3), C('windturbine', 8, 82), C('windturbine', 12, 82), C('windturbine', 16, 82)];
  const capitalCivic = [C('station', 30, 20), { kind: 'rail', from: [0, 19], to: [40, 19] }, C('hospital', 36.3, 34.4), C('library', 38.6, 39.3), C('firestation', 36.3, 39.3), C('datacentre', 43.2, 34.3), C('school', 36, 29), C('store', 38.6, 29), C('community', 22.5, 45.3), C('park', 22, 39), C('stadium', 36, 51), C('university', 15, 23.05), C('verticalfarm', 8, 23), C('greenhouse', 11, 23), C('greenhouse', 8, 29), C('greenhouse', 11, 29), C('waterworks', 17, 57), C('solar', 8, 57), C('workshop', 12, 57), C('watertower', 15, 57), C('gasworks', 36, 45.2), C('watertower', 43.2, 30.3)];
  const FARMS = [[8, 23, 6, 3], [8, 29, 5, 4], [8, 34, 6, 4], [8, 39, 6, 5]];
  const water = (width, bridges, channelled, promenade, lake) => ({ creekX: 45, width, bridges: bridges || [], channelled: !!channelled, promenade: promenade || null, lake: lake || null });

  const PLANS = [
    { id: 'campground', name: 'Campground', word: 'a campground', threshold: 0,
      story: 'A lone tent on the rise above the creek: a fire in front of the door, a notice board beside it, and one trodden footpath along the ridge toward the water.',
      home: [30, 31], clearing: { cx: 30, cy: 34, rx: 8, ry: 5 }, water: water(1),
      roads: [R(27, 33, 39, 33)], zones: [], civic: [C('campfire', 30, 34), C('board', 32, 34)],
      builds: [C('pump', 27, 34), C('foodcache', 33, 36), C('woodshed', 25, 35), C('lantern', 31, 36), C('shelter', 33, 31)], capacity: 8,
      lots: [row(32, 36, 36, 'south'), row(35, 36, 36, 'north')],
      landscape: { fields: [], treeline: 'dense', lamps: 'none' } },
    { id: 'fort', name: 'Fort', word: 'a fort', threshold: 5,
      story: 'A palisade goes up round the camp on the same ground: the cabin faces the fire across the main lane, a working yard of mill, tank and workshop lines the north wall, and the lane runs out through the gates east to the creek and west to the first two fields.',
      home: [30, 31], clearing: { cx: 30, cy: 34, rx: 15, ry: 9 }, water: water(1),
      roads: [R(17, 33, 44, 33), R(23, 29, 38, 29), R(23, 37, 38, 37), R(23, 29, 23, 37), R(38, 29, 38, 37)], zones: [],
      civic: [C('campfire', 30, 34), C('pump', 32, 35)],
      builds: [{ kind: 'stockade', rect: [22, 27, 18, 13] }, C('windmill', 25, 27.5), C('tank', 28, 27.5), C('workshop', 34, 27.4), C('watchtower', 39, 30), C('well', 31, 27.5)], capacity: 4,
      lots: [row(32, 33, 37, 'south'), row(32, 24, 28, 'south'), row(34, 34, 37, 'north'), row(34, 24, 28, 'north'), row(30, 24, 27, 'north'), row(30, 33, 37, 'north'), row(36, 24, 27, 'south'), row(36, 34, 37, 'south'), row(38, 24, 37, 'north')],
      landscape: { fields: [[16, 28, 5, 4], [16, 35, 5, 4]], treeline: 'dense', lamps: 'none' } },
    { id: 'town', name: 'Town', word: 'a town', threshold: 15,
      story: 'The palisade comes down. A paved main street runs from the west farms to the creek landing; the fire ground is laid out as a square with a well; the town hall closes its south side; school, store and hall take the east block; side streets make a small grid; a ranch corner sits south-west.',
      home: [30, 31], clearing: { cx: 30, cy: 34, rx: 25, ry: 12 }, water: water(1),
      roads: [R(6, 33, 44, 33, true), R(14, 28, 41, 28), R(14, 38, 41, 38), R(14, 28, 14, 38), R(20, 28, 20, 38), R(28, 33, 28, 38, true), R(34, 28, 34, 38, true), R(41, 28, 41, 38)],
      zones: [{ kind: 'square', rect: [29, 34, 5, 4] }],
      civic: [C('pump', 29, 34)],
      builds: [C('townhall', 30, 39), C('school', 35, 34), C('store', 38, 34), C('community', 35, 36.6), C('windmill', 13, 32), C('tank', 42, 32), C('workshop', 42, 34), C('barn', 21, 39), C('coop', 24, 39), { kind: 'paddock', rect: [21, 41, 7, 3] }], capacity: 6,
      lots: [row(32, 33, 40, 'south'), row(32, 21, 28, 'south'), row(34, 21, 27, 'north'), row(29, 21, 27, 'north'), row(29, 35, 40, 'north'), row(37, 21, 27, 'south'), row(39, 33, 39, 'north'), row(27, 21, 39, 'south'), row(32, 15, 19, 'south'), row(34, 15, 19, 'north'), row(29, 15, 19, 'north'), row(37, 15, 19, 'south'), row(27, 15, 19, 'south'), row(39, 15, 19, 'north')],
      landscape: { fields: [[6, 29, 7, 4], [6, 35, 7, 4]], treeline: 'thin', lamps: 'main' } },
    { id: 'city', name: 'City', word: 'a city', threshold: 35,
      story: 'The creek is channelled to two tiles and bridged at main street. The square is paved as a plaza with the long city hall across its south side; six streets each way lay out districts from the farm blocks to the river; hospital, library and fire station take the east block, a park anchors the west, the ranch moves out to the farm blocks.',
      home: [30, 31], clearing: { cx: 30, cy: 34, rx: 28, ry: 18 }, water: water(2, [{ y: 33, x0: 45, x1: 46 }], true),
      roads: [R(7, 33, 44, 33, true), R(45, 33, 46, 33, true), R(47, 33, 57, 33, true)].concat(grid(GRID_ROWS, GRID_COLS, 41, 50, true)),
      zones: [{ kind: 'plaza', rect: [28, 34, 6, 4] }],
      civic: [C('windmill', 13, 32), C('tank', 42, 32), C('workshop', 42, 30), C('barn', 8, 45), C('coop', 11, 45), { kind: 'paddock', rect: [8, 47, 6, 3] }],
      builds: [C('cityhall', 28, 39.2), C('hospital', 35.2, 34.4), C('library', 38.9, 34.3), C('firestation', 35.3, 39.3), C('school', 35, 29), C('store', 38, 29), C('community', 25.5, 39.3), C('datacentre', 42.3, 34.3), C('park', 22, 39), C('greenhouse', 8, 40), C('greenhouse', 11, 40), C('gasworks', 36, 45.2), C('watertower', 43.2, 36.3)], capacity: 10,
      lots: cityLots.filter(r => !(r.y === 43 && r.x0 === 28) && !(r.y === 39 && r.x0 === 35) && !(r.y === 43 && r.x0 === 22) && !(r.y === 45 && r.x0 === 35)), landscape: { fields: [[8, 23, 6, 5], [8, 29, 5, 4], [8, 34, 6, 4]], treeline: 'thin', lamps: 'main' } },
    { id: 'metropolis', name: 'Metropolis', word: 'a metropolis', threshold: 60,
      story: 'Two-tile avenues are cut either side of the plaza, a riverside street and a paved promenade run the length of the channel, a rail line comes in from the west to a station north of the home, a university fills the north-west block and a stadium the south-east. The fields are gone: a vertical farm and greenhouses take their blocks. Water works, solar and the water tower go to the south edge, and every street is lit.',
      home: [30, 31], clearing: { cx: 30, cy: 34, rx: 30, ry: 26 }, water: water(2, [{ y: 33, x0: 45, x1: 46 }], true, { x0: 43, x1: 44, y0: 20, y1: 58 }),
      roads: metroRoads(56), zones: [{ kind: 'plaza', rect: [28, 34, 6, 4] }], civic: metroCivic, builds: metroBuilds, capacity: 16, lots: metroLots.filter(r => !(r.y === 43 && r.x0 === 28) && !(r.y === 43 && r.x0 === 22) && !(r.y === 27 && r.x0 === 15) && !(r.y === 51 && r.x0 === 36) && !(r.y === 55 && r.x0 === 36) && !(r.y === 45 && r.x0 === 22) && !(r.y === 57 && r.x0 === 15) && !(r.y === 45 && r.x0 === 36) && !(r.y === 39 && r.x0 === 25) && !(r.y === 39 && r.x0 === 39)),
      landscape: { fields: [], treeline: 'thin', lamps: 'all' } },
    { id: 'capital', name: 'Capital', word: 'the capital', threshold: 90,
      story: 'The plaza becomes the capitol lawn and a mall runs south on the axis of the home to the capitol: a triumphal arch at its head, the obelisk ringed with flags, a reflecting pool, and a memorial before the capitol steps. The cross streets stop at the mall; the old city hall is rebuilt on the capitol’s east flank with a library and park on the west; the grid takes one more street south; the whole west bank is lit.',
      home: [30, 31], clearing: { cx: 30, cy: 46, rx: 32, ry: 42 }, water: water(2, [{ y: 33, x0: 45, x1: 46 }], true, { x0: 43, x1: 44, y0: 20, y1: 62 }),
      roads: capitalRoads().concat(SOUTH_ROADS), zones: [{ kind: 'park', rect: [28, 34, 6, 16] }], civic: capitalCivic, builds: capitalBuilds, capacity: 20, lots: capitalLots.filter(r => !(r.y === 43 && r.x0 === 22) && !(r.y === 27 && r.x0 === 15) && !(r.y === 51 && r.x0 === 36) && !(r.y === 55 && r.x0 === 36) && !(r.y === 57 && r.x0 === 28) && !(r.y === 61 && r.x0 === 28) && !(r.y === 57 && r.x0 === 35) && !(r.y === 61 && r.x0 === 35) && !(r.y === 39 && r.x0 === 25) && !(r.y === 37 && r.x0 === 36) && !(r.y === 45 && r.x0 === 22) && !(r.y === 57 && r.x0 === 15) && !(r.y === 45 && r.x0 === 36) && !(r.y === 51 && r.x0 === 15) && !(r.y === 55 && r.x0 === 15) && !(r.y === 39 && r.x0 === 39)).concat(SOUTH_LOTS),
      landscape: { fields: [], treeline: 'thin', lamps: 'all' } },
    { id: 'kingdom', name: 'Kingdom', word: 'a kingdom', threshold: 120,
      story: 'The capital holds on the west bank; the river is crossed a second time at the capitol street; the creek opens into a lake in the north; and the future rises on the east bank: the Skypad on its column facing the bridge, a hoverport by the royal square, districts that float, and the hover cars circling over it all.',
      home: [30, 31], clearing: { cx: 48, cy: 46, rx: 50, ry: 42 }, water: water(2, [{ y: 33, x0: 45, x1: 46 }, { y: 50, x0: 45, x1: 46 }], true, { x0: 43, x1: 44, y0: 20, y1: 62 }, { rect: [42, 8, 8, 6] }),
      roads: capitalRoads().concat(SOUTH_ROADS, FAR_EAST_ROADS, [R(43, 50, 44, 50, true), R(45, 50, 46, 50, true), R(47, 50, 57, 50, true)]),
      zones: [{ kind: 'park', rect: [28, 34, 6, 16] }, { kind: 'square', rect: [52, 34, 4, 3] }],
      civic: capitalBuilds.concat(capitalCivic), builds: [C('skypad', 50, 30), C('hoverport', 48.4, 35.4), C('fusion', 36, 63.5), C('skyfarm', 62, 30), C('skyfarm', 62, 44), C('skyisland', 54, 28), C('skyisland', 50, 38), C('skyisland', 56, 44), C('skyisland', 66, 14), C('skyisland', 78, 16), C('skyisland', 72, 58)], capacity: 30, lots: capitalLots.filter(r => !(r.y === 43 && r.x0 === 22) && !(r.y === 27 && r.x0 === 15) && !(r.y === 51 && r.x0 === 36) && !(r.y === 55 && r.x0 === 36) && !(r.y === 57 && r.x0 === 28) && !(r.y === 61 && r.x0 === 28) && !(r.y === 57 && r.x0 === 35) && !(r.y === 61 && r.x0 === 35) && !(r.y === 39 && r.x0 === 25) && !(r.y === 37 && r.x0 === 36) && !(r.y === 45 && r.x0 === 22) && !(r.y === 57 && r.x0 === 15) && !(r.y === 45 && r.x0 === 36) && !(r.y === 51 && r.x0 === 15) && !(r.y === 55 && r.x0 === 15) && !(r.y === 39 && r.x0 === 39)).concat(SOUTH_LOTS.filter(r => !(r.y === 63 || (r.y === 67 && r.x0 === 35))), FAR_EAST_LOTS),
      landscape: { fields: [], treeline: 'thin', lamps: 'all' } }
  ];
  /* every plan's roads and lots as tile sets, worked out once */
  const key = (x, y) => x + ',' + y;
  PLANS.forEach(p => {
    p.builds = p.builds || []; p.capacity = p.capacity || 2;
    const set = new Set(), paved = new Set(); p.roads.forEach(r => { let [x, y] = r.from; const put = () => { set.add(key(x, y)); if (r.paved) paved.add(key(x, y)); }; put(); while (x !== r.to[0]) { x += x < r.to[0] ? 1 : -1; put(); } while (y !== r.to[1]) { y += y < r.to[1] ? 1 : -1; put(); } });
    p.roadSet = set; p.pavedSet = paved; p.lotList = []; p.lots.forEach(r => { for (let x = r.x0; x <= r.x1; x += r.step) { const q = [x, r.y]; q.side = r.road; q.dx = set.has(key(x - 1, r.y)) ? 0.3 : set.has(key(x + 1, r.y)) ? -0.3 : 0; p.lotList.push(q); } });   /* each lot knows which side its street is on, and leans away from a cross street */
  });
  NW.PLANS = PLANS;
})();
