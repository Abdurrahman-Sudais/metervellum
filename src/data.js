// Fictional multi-site portfolio for the portfolio-report prototype. Locations, bills and amounts are invented.
// Dates are day numbers in 2026 (1 = 1 Jan). Bills run on irregular cycles, as real ones do.

export const doy = (m, d) => Math.round((Date.UTC(2026, m - 1, d) - Date.UTC(2026, 0, 1)) / 864e5) + 1;
export const fmt = (n) => new Date(Date.UTC(2026, 0, n)).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', timeZone: 'UTC'});
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const REPORT_MONTH = 10; // October
export const UNIT = {electricity: 'kWh', water: 'm³'};

export const locations = [
  {id: 'L1', name: 'Harbour Mall store', type: 'Retail', area: 1200, city: 'Lagos'},
  {id: 'L2', name: 'Lekki Phase 1 store', type: 'Retail', area: 900, city: 'Lagos'},
  {id: 'L3', name: 'Marina Hotel', type: 'Hotel', area: 5200, city: 'Lagos'},
  {id: 'L4', name: 'Garden Terrace restaurant', type: 'Restaurant', area: 380, city: 'Abuja'},
  {id: 'L5', name: 'Hillside School', type: 'School', area: 3000, city: 'Ibadan'},
  {id: 'L6', name: 'Unity House offices', type: 'Commercial property', area: 2400, city: 'Abuja'},
];

/** Tariffs as entered by the team. Forecasts use only confirmed tariffs. Rates in $/unit, fixed $/month. */
export const tariffs = {
  'L1-electricity': {rate: 0.18, fixed: 40, confirmed: true},
  'L2-electricity': {rate: 0.18, fixed: 40, confirmed: true},
  'L3-electricity': {rate: 0.165, fixed: 120, confirmed: true},
  'L3-water': {rate: 1.9, fixed: 25, confirmed: true},
  'L4-electricity': {rate: 0.18, fixed: 35, confirmed: true},
  'L4-water': {rate: 1.9, fixed: 15, confirmed: false},
  'L5-electricity': {rate: 0.15, fixed: 60, confirmed: false},
  'L6-electricity': {rate: 0.17, fixed: 80, confirmed: true},
};

// Cycle end dates for each account (start = previous end + 1, unless a bill says otherwise).
const ENDS = {
  a: [doy(4, 28), doy(5, 29), doy(6, 30), doy(7, 29), doy(8, 31), doy(9, 29), doy(10, 30)],
  b: [doy(4, 24), doy(5, 26), doy(6, 23), doy(7, 27), doy(8, 25), doy(9, 24), doy(10, 27)],
  c: [doy(4, 30), doy(5, 31), doy(6, 30), doy(7, 31), doy(8, 31), doy(9, 30), doy(10, 31)],
};

const mkBills = (loc, utility, cycle, perDay, tweak = () => ({})) => {
  const ends = ENDS[cycle];
  let prevEnd = ends[0] - 30;
  return ends.map((end, i) => {
    const start = prevEnd + 1;
    const days = end - start + 1;
    const seasonal = 1 + 0.06 * Math.sin((i + 2) / 1.6);
    const base = {id: `${loc}-${utility[0].toUpperCase()}${i + 1}`, loc, utility, start, end, read: 'actual', usage: Math.round(perDay * seasonal * days), conf: 0.97, extraLines: []};
    const b = {...base, ...tweak(i, base)};
    prevEnd = b.end;
    const t = tariffs[`${loc}-${utility}`];
    const rate = b.rateBilled ?? t.rate;
    b.lines = [{label: utility === 'water' ? 'Water supply' : 'Energy charge', amount: +(b.usage * rate).toFixed(2)}, {label: 'Service charge', amount: t.fixed}, ...b.extraLines];
    return b;
  });
};

export const bills = [
  // Harbour Mall: October usage jumps — a stuck HVAC schedule (the kind of thing to check on site).
  ...mkBills('L1', 'electricity', 'a', 410, (i) => (i === 6 ? {usage: Math.round(410 * 1.48 * 31)} : {})),
  // Lekki store: a one-off meter replacement fee appears in September and again in October.
  ...mkBills('L2', 'electricity', 'b', 300, (i) => (i >= 5 ? {extraLines: [{label: 'Meter replacement fee', amount: 85}]} : {})),
  // Marina Hotel electricity: the August bill starts three days before July's ended (overlapping days billed twice).
  ...mkBills('L3', 'electricity', 'c', 2600, (i, b) => (i === 4 ? {start: b.start - 3, usage: Math.round(2600 * 34)} : {})),
  // Marina Hotel water: a leak in October.
  ...mkBills('L3', 'water', 'c', 95, (i) => (i === 6 ? {usage: Math.round(95 * 1.62 * 31)} : {})),
  // Garden Terrace: October billed at a higher rate than the confirmed tariff.
  ...mkBills('L4', 'electricity', 'b', 520, (i) => (i === 6 ? {rateBilled: 0.205} : {})),
  ...mkBills('L4', 'water', 'b', 9),
  // Hillside School: a genuine August holiday dip — no flag expected.
  ...mkBills('L5', 'electricity', 'a', 700, (i) => (i === 3 || i === 4 ? {usage: Math.round(700 * (i === 4 ? 0.55 : 0.8) * 30)} : {})),
  // Unity House: two estimated reads in a row, and October's reading was hard to extract.
  ...mkBills('L6', 'electricity', 'c', 950, (i) => (i === 5 ? {read: 'estimated'} : i === 6 ? {read: 'estimated', conf: 0.62} : {})),
];

export const roles = [
  {id: 'facilities', label: 'Facilities Manager', can: ['review', 'verify', 'report']},
  {id: 'finance', label: 'Finance Analyst', can: ['tariff', 'verify', 'report', 'export']},
  {id: 'site', label: 'Site Manager', can: ['note']},
  {id: 'viewer', label: 'Viewer', can: []},
];
export const people = {facilities: 'Grace Eze', finance: 'Musa Bello', site: 'Tolu Ade', viewer: 'Guest'};
