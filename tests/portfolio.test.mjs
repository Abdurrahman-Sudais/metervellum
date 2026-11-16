import test from 'node:test';
import assert from 'node:assert/strict';
import site from '../src/content.js';
import {bills, people, roles, tariffs} from '../src/data.js';
import {accounts, act, anomalies, effective, forecast, initial, monthly, perDay} from '../src/engine.js';

const acc = accounts(bills);
const kinds = (k) => anomalies(acc[k], tariffs[k]).map((f) => f.kind);

test('each planted issue is caught, and only that one', () => {
  assert.deepEqual(kinds('L1-electricity'), ['usage']);
  assert.deepEqual(kinds('L2-electricity'), ['repeat']);
  assert.deepEqual(kinds('L3-electricity'), ['overlap']);
  assert.deepEqual(kinds('L3-water'), ['usage']);
  assert.deepEqual(kinds('L4-electricity'), ['rate']);
  assert.deepEqual(kinds('L5-electricity'), [], 'a holiday dip is not a fault');
  assert.deepEqual(kinds('L6-electricity').sort(), ['estimated', 'extract']);
});

test('normalisation spreads bills across calendar months', () => {
  const a = acc['L2-electricity'];
  const sum = a.reduce((s, b) => s + b.usage, 0);
  let months = 0; for (let m = 1; m <= 12; m += 1) months += monthly(a, m);
  assert.ok(Math.abs(months - sum) < 1e-6);
  assert.ok(perDay(a[0]) > 250 && perDay(a[0]) < 350);
});

test('forecasts need a confirmed tariff and ignore flagged bills', () => {
  assert.equal(forecast(acc['L5-electricity'], tariffs['L5-electricity']).ok, false);
  const k = 'L1-electricity'; const open = new Set(anomalies(acc[k], tariffs[k]).map((f) => f.id));
  const f = forecast(acc[k], tariffs[k], open);
  assert.ok(f.ok && !f.basis.includes('L1-E7'));
  assert.ok(f.cost < forecast(acc[k], tariffs[k]).cost, 'the spike would inflate the forecast');
});

test('review, verification, tariffs and publishing follow the rules', () => {
  const ctx = (s) => ({roles, actor: people[s.role], bills});
  let s = initial(tariffs, roles);
  assert.match(act(s, {type: 'review', id: 'L1-E7-usage', status: 'issue', reason: 'hm'}, ctx(s)).error, /explanation/);
  s = act(s, {type: 'review', id: 'L1-E7-usage', status: 'issue', reason: 'HVAC schedule stuck on 24h'}, ctx(s)).state;
  assert.equal(s.reviews['L1-E7-usage'].status, 'issue');
  assert.match(act(s, {type: 'publish', month: 'Oct', unverified: 1, reason: 'October summary'}, ctx(s)).error, /Confirm the readings/);
  assert.match(act(s, {type: 'verify', bill: 'L6-E7', usage: 29000}, ctx(s)).error, /why/);
  s = act(s, {type: 'verify', bill: 'L6-E7', usage: 29000, reason: 'Read from the PDF page 2'}, ctx(s)).state;
  assert.ok(!anomalies(accounts(effective(bills, s.verified))['L6-electricity'], tariffs['L6-electricity'], s.verified).some((f) => f.kind === 'extract'));
  assert.match(act(s, {type: 'tariff', key: 'L5-electricity', rate: 0.15, fixed: 60}, ctx(s)).error, /finance/);
  const fin = act(s, {type: 'role', role: 'finance'}, ctx(s)).state;
  const t = act(fin, {type: 'tariff', key: 'L5-electricity', rate: 0.15, fixed: 60}, ctx(fin)).state;
  assert.equal(t.tariffs['L5-electricity'].confirmed, true);
  assert.ok(act(t, {type: 'publish', month: 'Oct', unverified: 0, open: 4, reason: 'October summary with open flags'}, ctx(t)).state.report);
});

test('founder and contact', () => {
  assert.equal(site.team[0].name, 'Aisha Suleiman');
  assert.equal(site.email, 'aisha@metervellum.space');
});

test('founding team: founder, co-founder and CTO', async () => {
  const {default: s} = await import('../src/content.js');
  const {strict: a} = await import('node:assert');
  a.deepEqual(s.team.map((p) => p.role), ['Founder', 'Co-founder', 'CTO']);
  for (const p of s.team) a.ok(p.bio.length > 60 && p.focus.length === 3 && p.initials.length === 2);
});
