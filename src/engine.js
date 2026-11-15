// Portfolio-report rules: bills are normalised to usage per day and to calendar months, checked for unusual
// usage, repeated charges, billing-period overlaps, rate mismatches and runs of estimated reads; forecasts use
// confirmed tariffs only; facilities staff review every flag before the monthly report is published.
import {MONTHS, UNIT, doy, fmt} from './data.js';

export const can = (roles, roleId, perm) => !!roles.find((r) => r.id === roleId)?.can.includes(perm);
export const days = (b) => b.end - b.start + 1;
export const perDay = (b) => b.usage / days(b);
const STANDARD = new Set(['Energy charge', 'Water supply', 'Service charge']);
const total = (b) => b.lines.reduce((s, l) => s + l.amount, 0);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const monthRange = (m) => [doy(m, 1), doy(m + 1, 1) - 1];
const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0) + 1);

/** Apply verified corrections to the extracted bills. */
export const effective = (bills, verified = {}) => bills.map((b) => (verified[b.id]?.usage != null ? {...b, usage: verified[b.id].usage, conf: 1} : b));

export function accounts(bills) {
  const by = {};
  for (const b of bills) (by[`${b.loc}-${b.utility}`] ||= []).push(b);
  for (const k of Object.keys(by)) by[k].sort((a, b) => a.start - b.start);
  return by;
}

/** Usage allocated to a calendar month by spreading each bill evenly over its days. */
export function monthly(acct, m) {
  const [m0, m1] = monthRange(m);
  return acct.reduce((s, b) => s + perDay(b) * overlap(b.start, b.end, m0, m1), 0);
}
export const monthlyCost = (acct, m) => { const [m0, m1] = monthRange(m); return acct.reduce((s, b) => s + (total(b) / days(b)) * overlap(b.start, b.end, m0, m1), 0); };

/** Every flag for an account, each with an estimated cost impact and the evidence behind it. */
export function anomalies(acct, tariff, verified = {}) {
  const out = [];
  const unit = UNIT[acct[0].utility];
  acct.forEach((b, i) => {
    const prev = acct[i - 1];
    const rate = tariff.rate;
    if (i >= 3) {
      const base = median(acct.slice(0, i).map(perDay));
      const r = perDay(b) / base;
      if (r > 1.3) out.push({id: `${b.id}-usage`, bill: b.id, kind: 'usage', title: `Usage ${Math.round((r - 1) * 100)}% above normal`, detail: `${Math.round(perDay(b)).toLocaleString()} ${unit}/day against a usual ${Math.round(base).toLocaleString()} ${unit}/day (median of earlier bills).`, impact: (perDay(b) - base) * days(b) * rate});
    }
    if (prev && b.start <= prev.end) { const d = prev.end - b.start + 1; out.push({id: `${b.id}-overlap`, bill: b.id, kind: 'overlap', title: `Billing period overlaps the previous bill by ${d} day${d > 1 ? 's' : ''}`, detail: `This bill starts ${fmt(b.start)}; the previous one ran to ${fmt(prev.end)}. Those days may have been billed twice.`, impact: d * perDay(b) * rate}); }
    if (prev && b.start > prev.end + 1) out.push({id: `${b.id}-gap`, bill: b.id, kind: 'gap', title: `Gap of ${b.start - prev.end - 1} days before this bill`, detail: `The previous bill ended ${fmt(prev.end)}; this one starts ${fmt(b.start)}.`, impact: 0});
    for (const l of b.lines) if (!STANDARD.has(l.label) && prev?.lines.some((p) => p.label === l.label && p.amount === l.amount)) out.push({id: `${b.id}-repeat`, bill: b.id, kind: 'repeat', title: `Repeated one-off charge: ${l.label}`, detail: `$${l.amount.toFixed(2)} appears on this bill and on the previous one.`, impact: l.amount});
    const usageLine = b.lines.find((l) => l.label === 'Energy charge' || l.label === 'Water supply');
    const billed = usageLine.amount / b.usage;
    if (Math.abs(billed - rate) / rate > 0.05) out.push({id: `${b.id}-rate`, bill: b.id, kind: 'rate', title: `Billed rate differs from the ${tariff.confirmed ? 'confirmed' : 'entered'} tariff`, detail: `$${billed.toFixed(3)}/${unit} billed against $${rate.toFixed(3)}/${unit}.`, impact: (billed - rate) * b.usage});
    if (b.read === 'estimated' && prev?.read === 'estimated') out.push({id: `${b.id}-estimated`, bill: b.id, kind: 'estimated', title: 'Second estimated reading in a row', detail: 'Ask the utility for an actual meter read; estimates can drift far from real use.', impact: 0});
    if (b.conf < 0.8 && !verified[b.id]) out.push({id: `${b.id}-extract`, bill: b.id, kind: 'extract', title: 'Reading needs checking', detail: `The usage figure was extracted with ${Math.round(b.conf * 100)}% confidence. Confirm it against the bill.`, impact: 0});
  });
  return out;
}

/** Next month's cost from recent usage per day (excluding bills with open usage flags) and a confirmed tariff. */
export function forecast(acct, tariff, open = new Set(), m = 11) {
  if (!tariff.confirmed) return {ok: false, reason: 'Confirm the tariff to forecast.'};
  const typical = median(acct.map(perDay));
  // Leave out bills with open usage/overlap flags, and unusually low periods such as school holidays.
  const clean = acct.filter((b) => !open.has(`${b.id}-usage`) && !open.has(`${b.id}-overlap`) && perDay(b) >= 0.7 * typical).slice(-3);
  if (clean.length < 2) return {ok: false, reason: 'Not enough clean bills to forecast.'};
  const pd = clean.reduce((s, b) => s + perDay(b), 0) / clean.length;
  const recent = acct.slice(-6).map(perDay);
  const sd = Math.sqrt(recent.reduce((s, x) => s + (x - pd) ** 2, 0) / recent.length);
  const n = doy(m + 1, 1) - doy(m, 1);
  const cost = pd * n * tariff.rate + tariff.fixed;
  const spread = Math.min(sd, pd * 0.25) * n * tariff.rate;
  return {ok: true, usage: pd * n, cost, low: cost - spread, high: cost + spread, month: MONTHS[m - 1], basis: clean.map((b) => b.id)};
}

export function initial(tariffs, roles) {
  return {verified: {}, reviews: {}, tariffs: structuredClone(tariffs), notes: {}, report: null, log: [], role: roles[0].id};
}

const now = () => new Date().toISOString();

export function act(state, a, {roles, actor, bills}) {
  const fail = (error) => ({state, ok: false, error});
  if (a.type === 'role') return {state: {...state, role: a.role}, ok: true};
  const allow = (p) => can(roles, state.role, p);
  const log = (id, summary, patch) => ({ok: true, state: {...state, ...patch, report: a.type === 'publish' ? patch.report : null, log: [{at: now(), actor, role: state.role, id, summary}, ...state.log]}});
  const why = (a.reason || '').trim();
  switch (a.type) {
    case 'verify': {
      if (!allow('verify')) return fail('Only facilities and finance staff confirm extracted readings.');
      const b = bills.find((x) => x.id === a.bill);
      if (!b) return fail('Bill not found.');
      const v = a.usage === '' || a.usage == null ? b.usage : Number(a.usage);
      if (!Number.isFinite(v) || v <= 0) return fail('Enter the reading as a positive number.');
      if (v !== b.usage && why.length < 8) return fail('Say why the reading was corrected (at least 8 characters).');
      return log(b.id, v === b.usage ? `Confirmed reading ${v.toLocaleString()}` : `Corrected reading ${b.usage.toLocaleString()} → ${v.toLocaleString()} — ${why}`, {verified: {...state.verified, [b.id]: {usage: v, by: actor, reason: why}}});
    }
    case 'review': {
      if (!allow('review')) return fail('Only the facilities manager reviews flags.');
      if (!['issue', 'explained'].includes(a.status)) return fail('Choose an outcome.');
      if (why.length < 8) return fail('Add a short explanation (at least 8 characters).');
      return log(a.id, `${a.status === 'issue' ? 'Raised with utility/site' : 'Explained'} — ${why}`, {reviews: {...state.reviews, [a.id]: {status: a.status, reason: why, by: actor}}});
    }
    case 'tariff': {
      if (!allow('tariff')) return fail('Only finance confirms tariffs.');
      const t = state.tariffs[a.key];
      if (!t) return fail('Tariff not found.');
      const rate = Number(a.rate); const fixed = Number(a.fixed);
      if (!(rate > 0) || !(fixed >= 0)) return fail('Enter the rate and fixed charge from the tariff sheet.');
      return log(a.key, `Confirmed tariff $${rate}/unit + $${fixed}/month`, {tariffs: {...state.tariffs, [a.key]: {rate, fixed, confirmed: true}}});
    }
    case 'publish': {
      if (!allow('report')) return fail('Only facilities or finance publish the monthly report.');
      if (a.unverified > 0) return fail('Confirm the readings that need checking before publishing.');
      if (why.length < 8) return fail('Add a covering note for the report (at least 8 characters).');
      return log('report', `Published ${a.month} report — ${why}`, {report: {by: actor, note: why, at: now(), open: a.open}});
    }
    default:
      return fail('Unknown action.');
  }
}
