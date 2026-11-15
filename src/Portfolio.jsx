import React, {useEffect, useState} from 'react';
import site from './content.js';
import {MONTHS, REPORT_MONTH, UNIT, bills as RAW, fmt, locations, people, roles, tariffs as TARIFFS} from './data.js';
import {accounts, act, anomalies, can, days, effective, forecast, initial, monthly, monthlyCost, perDay} from './engine.js';
import {Logo} from './App.jsx';

const KEY = 'metervellum-report-v1';
const money = (v) => `$${Math.round(v).toLocaleString()}`;
const KIND = {usage: 'Unusual usage', repeat: 'Repeated charge', overlap: 'Overlapping period', gap: 'Missing days', rate: 'Rate mismatch', estimated: 'Estimated reads', extract: 'Reading to check'};

export default function Portfolio() {
  const [state, setState] = useState(() => initial(TARIFFS, roles));
  const [sel, setSel] = useState('L1');
  const [tab, setTab] = useState('flags');
  const [msg, setMsg] = useState('');
  const [txt, setTxt] = useState({});
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s?.tariffs) setState(s); } catch { /* ignore */ } }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

  const actor = people[state.role];
  const allow = (p) => can(roles, state.role, p);
  const bills = effective(RAW, state.verified);
  const acc = accounts(bills);
  const run = (a, after) => { const r = act(state, a, {roles, actor, bills: RAW}); setMsg(r.ok ? '' : r.error); if (r.ok) { setState(r.state); after?.(); } };
  const t = (k) => txt[k] ?? '';
  const setT = (k, v) => setTxt({...txt, [k]: v});
  const flagsFor = (k) => anomalies(acc[k], state.tariffs[k], state.verified);
  const allFlags = Object.keys(acc).flatMap((k) => flagsFor(k).map((f) => ({...f, key: k})));
  const openFlags = allFlags.filter((f) => !state.reviews[f.id]);
  const unverified = allFlags.filter((f) => f.kind === 'extract').length;
  const loc = locations.find((l) => l.id === sel);
  const keys = Object.keys(acc).filter((k) => k.startsWith(`${sel}-`));
  const rows = locations.map((l) => {
    const ks = Object.keys(acc).filter((k) => k.startsWith(`${l.id}-`));
    const e = acc[`${l.id}-electricity`];
    return {l, kwh: monthly(e, REPORT_MONTH), prev: monthly(e, REPORT_MONTH - 1), cost: ks.reduce((s, k) => s + monthlyCost(acc[k], REPORT_MONTH), 0), open: openFlags.filter((f) => f.key.startsWith(`${l.id}-`)).length};
  });
  const exportCsv = () => { const r = [['location', 'type', 'area m2', `${MONTHS[REPORT_MONTH - 1]} kWh`, 'kWh/m2/day', 'change vs previous month %', 'cost $', 'open flags'], ...rows.map(({l, kwh, prev, cost, open}) => [l.name, l.type, l.area, Math.round(kwh), (kwh / 31 / l.area).toFixed(3), (((kwh - prev) / prev) * 100).toFixed(1), Math.round(cost), open])].map((x) => x.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')); const url = URL.createObjectURL(new Blob([r.join('\n')], {type: 'text/csv'})); const a = document.createElement('a'); a.href = url; a.download = 'metervellum-october-report.csv'; a.click(); URL.revokeObjectURL(url); };

  return (
    <div className="pf">
      <header className="pf-top">
        <a href="/" className="brand" aria-label="Back to the MeterVellum website"><Logo size={26} /><span>Meter<em>Vellum</em></span></a>
        <span className="mono">Fictional portfolio · {locations.length} locations · report for {MONTHS[REPORT_MONTH - 1]} 2026</span>
        <label className="pf-role">Signed in as <select value={state.role} onChange={(e) => run({type: 'role', role: e.target.value})}>{roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
        <button className="btn ghost sm" onClick={() => { setState(initial(TARIFFS, roles)); setMsg(''); }}>Reset</button>
      </header>
      <p className="pf-banner">Fictional bills. Extracted figures and flags are for people to check — MeterVellum does not contact utilities or change any account.</p>
      <main className="pf-main">
        <div className="pf-head"><h1>{site.app.title}</h1><p className="mono">{openFlags.length} open flag{openFlags.length === 1 ? '' : 's'} · {unverified} reading{unverified === 1 ? '' : 's'} to check</p></div>
        <div className="pf-tabs" role="group" aria-label="View">{[['flags', `Flags (${openFlags.length})`], ['bills', 'Bills'], ['forecast', 'Tariffs & forecast'], ['report', 'Monthly report']].map(([id, l]) => <button key={id} className={tab === id ? 'on' : ''} aria-pressed={tab === id} onClick={() => { setTab(id); setMsg(''); }}>{l}</button>)}</div>
        {msg && <p className="pf-err" role="alert">{msg}</p>}

        <div className="pf-grid">
          <aside className="pf-card pf-locs" aria-label="Locations">
            <h2>Locations</h2>
            <ul>{rows.map(({l, cost, open}) => <li key={l.id}><button className={l.id === sel ? 'on' : ''} onClick={() => setSel(l.id)}><span><b>{l.name}</b><small>{l.type} · {money(cost)} in {MONTHS[REPORT_MONTH - 1]}</small></span>{open > 0 && <span className="flag">{open}</span>}</button></li>)}</ul>
          </aside>

          <section className="pf-card" aria-labelledby="pf-sec">
            <p className="mono">{loc.type} · {loc.city} · {loc.area.toLocaleString()} m²</p>
            <h2 id="pf-sec">{loc.name}</h2>

            {tab === 'flags' && (<>
              {keys.flatMap((k) => flagsFor(k).map((f) => ({...f, key: k}))).length === 0 && <p className="empty">No flags for this location.</p>}
              <ul className="flags">{keys.flatMap((k) => flagsFor(k).map((f) => ({...f, key: k}))).map((f) => { const r = state.reviews[f.id]; const b = bills.find((x) => x.id === f.bill); return (
                <li key={f.id} className={`fl ${f.kind}${r ? ' done' : ''}`}>
                  <p className="mono">{KIND[f.kind]} · {f.key.split('-')[1]} · bill {fmt(b.start)}–{fmt(b.end)}</p>
                  <h3>{f.title}</h3><p>{f.detail}</p>
                  {f.impact > 0 && <p className="impact">Estimated impact ≈ {money(f.impact)}</p>}
                  {f.kind === 'extract' ? (
                    <div className="row"><input aria-label="Confirmed reading" placeholder={`Reading (${b.usage.toLocaleString()})`} value={t(`v-${b.id}`)} onChange={(e) => setT(`v-${b.id}`, e.target.value)} disabled={!allow('verify')} /><input aria-label="Reason if corrected" placeholder="Reason, if corrected" value={t(`vr-${b.id}`)} onChange={(e) => setT(`vr-${b.id}`, e.target.value)} disabled={!allow('verify')} /><button className="btn sm" disabled={!allow('verify')} onClick={() => run({type: 'verify', bill: b.id, usage: t(`v-${b.id}`), reason: t(`vr-${b.id}`)})}>Confirm reading</button></div>
                  ) : r ? <p className={`outcome ${r.status}`}>{r.status === 'issue' ? 'Raised with utility/site' : 'Explained'} by {r.by} — “{r.reason}”</p> : (
                    <div className="row"><input aria-label="Explanation" placeholder="What you found or will do (required)" value={t(f.id)} onChange={(e) => setT(f.id, e.target.value)} disabled={!allow('review')} />
                      <button className="btn sm" disabled={!allow('review')} onClick={() => run({type: 'review', id: f.id, status: 'issue', reason: t(f.id)})}>Raise it</button>
                      <button className="btn ghost sm" disabled={!allow('review')} onClick={() => run({type: 'review', id: f.id, status: 'explained', reason: t(f.id)})}>Explained</button></div>
                  )}
                </li>); })}</ul>
              {!allow('review') && <p className="fine">Only the facilities manager reviews flags.</p>}
            </>)}

            {tab === 'bills' && keys.map((k) => (
              <div key={k} className="acct">
                <h3>{k.split('-')[1] === 'water' ? 'Water' : 'Electricity'} · {UNIT[k.split('-')[1]]}</h3>
                <table className="bills"><thead><tr><th scope="col">Period</th><th scope="col">Days</th><th scope="col">Usage</th><th scope="col">Per day</th><th scope="col">Read</th><th scope="col">Total</th><th scope="col">Confidence</th></tr></thead>
                  <tbody>{acc[k].map((b) => <tr key={b.id} className={b.conf < 0.8 ? 'low' : ''}><td>{fmt(b.start)}–{fmt(b.end)}</td><td>{days(b)}</td><td>{b.usage.toLocaleString()}{state.verified[b.id] ? ' ✓' : ''}</td><td>{Math.round(perDay(b)).toLocaleString()}</td><td>{b.read}</td><td>{money(b.lines.reduce((s, l) => s + l.amount, 0))}</td><td>{Math.round(b.conf * 100)}%</td></tr>)}</tbody></table>
              </div>
            ))}

            {tab === 'forecast' && keys.map((k) => { const tf = state.tariffs[k]; const open = new Set(flagsFor(k).filter((f) => !state.reviews[f.id] || state.reviews[f.id].status === 'issue').map((f) => f.id)); const f = forecast(acc[k], tf, open); return (
              <div key={k} className="acct">
                <h3>{k.split('-')[1] === 'water' ? 'Water' : 'Electricity'}</h3>
                <p className={tf.confirmed ? 'tariff ok' : 'tariff'}>Tariff ${tf.rate}/{UNIT[k.split('-')[1]]} + ${tf.fixed}/month · {tf.confirmed ? 'confirmed' : 'not confirmed'}</p>
                {!tf.confirmed && (<div className="row">
                  <input aria-label="Rate" placeholder={`Rate (${tf.rate})`} value={t(`r-${k}`)} onChange={(e) => setT(`r-${k}`, e.target.value)} disabled={!allow('tariff')} />
                  <input aria-label="Fixed charge" placeholder={`Fixed (${tf.fixed})`} value={t(`x-${k}`)} onChange={(e) => setT(`x-${k}`, e.target.value)} disabled={!allow('tariff')} />
                  <button className="btn sm" disabled={!allow('tariff')} onClick={() => run({type: 'tariff', key: k, rate: t(`r-${k}`) || tf.rate, fixed: t(`x-${k}`) || tf.fixed})}>Confirm tariff</button>
                </div>)}
                {!tf.confirmed && !allow('tariff') && <p className="fine">Finance confirms tariffs.</p>}
                {f.ok ? <p className="fc-big"><b>{money(f.cost)}</b> expected in {f.month}<small>range {money(f.low)}–{money(f.high)} · {Math.round(f.usage).toLocaleString()} {UNIT[k.split('-')[1]]} · from bills {f.basis.join(', ')}</small></p> : <p className="empty">{f.reason}</p>}
              </div>); })}

            {tab === 'report' && (<>
              <table className="report"><thead><tr><th scope="col">Location</th><th scope="col">{MONTHS[REPORT_MONTH - 1]} kWh</th><th scope="col">kWh/m²/day</th><th scope="col">vs {MONTHS[REPORT_MONTH - 2]}</th><th scope="col">Cost</th><th scope="col">Open flags</th></tr></thead>
                <tbody>{rows.map(({l, kwh, prev, cost, open}) => <tr key={l.id}><th scope="row">{l.name}</th><td>{Math.round(kwh).toLocaleString()}</td><td>{(kwh / 31 / l.area).toFixed(2)}</td><td className={kwh > prev * 1.15 ? 'up' : ''}>{kwh >= prev ? '+' : ''}{(((kwh - prev) / prev) * 100).toFixed(0)}%</td><td>{money(cost)}</td><td>{open || '—'}</td></tr>)}</tbody>
                <tfoot><tr><th scope="row">Portfolio</th><td>{Math.round(rows.reduce((s, r) => s + r.kwh, 0)).toLocaleString()}</td><td /><td /><td>{money(rows.reduce((s, r) => s + r.cost, 0))}</td><td>{openFlags.length}</td></tr></tfoot></table>
              {state.report ? <p className="outcome issue">Published by {state.report.by} — “{state.report.note}” ({state.report.open} flag{state.report.open === 1 ? '' : 's'} still open, listed in the report).</p> : (<>
                <textarea rows="2" aria-label="Covering note" placeholder="Covering note for the report (required)" value={t('note')} onChange={(e) => setT('note', e.target.value)} disabled={!allow('report')} />
                <button className="btn" disabled={!allow('report')} onClick={() => run({type: 'publish', month: MONTHS[REPORT_MONTH - 1], unverified, open: openFlags.length, reason: t('note')})}>Publish {MONTHS[REPORT_MONTH - 1]} report</button>
                {unverified > 0 && <p className="fine">{unverified} reading{unverified > 1 ? 's' : ''} must be confirmed first.</p>}
              </>)}
              {allow('export') && <button className="btn ghost sm" onClick={exportCsv}>Export CSV</button>}
            </>)}
          </section>

          <aside className="pf-card pf-side" aria-label="Log">
            <h2>Log</h2>
            <ul className="log">{state.log.slice(0, 10).map((l, i) => <li key={i}><time>{new Date(l.at).toLocaleTimeString()}</time> <b>{l.actor}</b> · {l.id} · {l.summary}</li>)}{!state.log.length && <li className="fine">Confirmations, reviews, tariffs and reports appear here.</li>}</ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
