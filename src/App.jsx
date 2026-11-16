import React, {useState} from 'react';
import site from './content.js';
import {MONTHS, REPORT_MONTH, UNIT, bills, fmt, locations, tariffs} from './data.js';
import {accounts, anomalies, days, forecast, monthly, monthlyCost} from './engine.js';
import {ACROSS, SERVICES, STAGES, WHY} from './aws.js';
import {PROGRESS} from './forms.js';
import Portfolio from './Portfolio.jsx';
import PilotForm from './PilotForm.jsx';
import ContactForm from './ContactForm.jsx';

export function Logo({size = 30}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#1d2a26" />
      <path d="M8 26a12 12 0 0 1 24 0" fill="none" stroke="#f3f1ea" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 26 L27 16" stroke="#f0a202" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="26" r="2.6" fill="#f0a202" />
      <rect x="11" y="30" width="18" height="3" rx="1.5" fill="#5aa0f0" />
    </svg>
  );
}

const ACC = accounts(bills);
const ALL_FLAGS = Object.entries(ACC).flatMap(([k, a]) => anomalies(a, tariffs[k]).map((x) => ({...x, key: k})));
const money = (v) => `$${Math.round(v).toLocaleString()}`;
const OCT = locations.map((l) => {
  const e = ACC[`${l.id}-electricity`];
  const kwh = monthly(e, REPORT_MONTH);
  const cost = Object.keys(ACC).filter((k) => k.startsWith(`${l.id}-`)).reduce((s, k) => s + monthlyCost(ACC[k], REPORT_MONTH), 0);
  return {...l, kwh, intensity: kwh / 31 / l.area, cost, flags: ALL_FLAGS.filter((f) => f.key.startsWith(`${l.id}-`)).length};
});
const PORTFOLIO_KWH = OCT.reduce((s, l) => s + l.kwh, 0);

function Odometer({value, label}) {
  const digits = String(Math.round(value)).padStart(7, '0').split('');
  return (
    <div className="odo" data-read aria-label={`${label}: ${Math.round(value).toLocaleString()}`} role="img">
      {digits.map((d, i) => (
        <span key={i} className="col" aria-hidden="true"><span style={{transform: `translateY(-${Number(d) * 10}%)`, transitionDelay: `${i * 120}ms`}}>{'0123456789'.split('').map((n) => <i key={n}>{n}</i>)}</span></span>
      ))}
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const links = [['Billing periods', '/#periods'], ['Compare', '/#compare'], ['Checks', '/#checks'], ['Forecast', '/#forecast'], ['Technology', '/#technology'], ['Pricing', '/#pricing'], ['Contact', '/#contact']];
  return (
    <header className="hd">
      <a href="/" className="brand" aria-label="MeterVellum home"><Logo /><span>Meter<em>Vellum</em></span></a>
      <nav id="nav" className={open ? 'nav open' : 'nav'} aria-label="Main">
        {links.map(([t, h]) => <a key={t} href={h} onClick={() => setOpen(false)}>{t}</a>)}
        <a className="nav-app" href="/app" onClick={() => setOpen(false)}>Open the portfolio report</a>
      </nav>
      <a className="hd-cta" href="/app">Portfolio report</a>
      <button className="menu" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
    </header>
  );
}

function Hero() {
  const maxI = Math.max(...OCT.map((l) => l.intensity));
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div>
        <p className="kicker">Commercial utility analytics</p>
        <h1 id="hero-title">Understand utility costs across <em>every location.</em></h1>
        <p className="lede">{site.about}</p>
        <div className="ctas"><a className="btn" href="/app">Open the portfolio report</a><a className="btn ghost" href="#pilot">Request a pilot</a></div>
        <p className="fine">A proposed product. The portfolio report runs in your browser on fictional bills.</p>
      </div>
      <figure className="meter" aria-label="Fictional portfolio, October">
        <p className="mono">Portfolio electricity · October · kWh</p>
        <Odometer value={PORTFOLIO_KWH} label="Portfolio electricity in October, kWh" />
        <ul className="sites">{OCT.map((l) => (
          <li key={l.id} data-read><span><b>{l.name}</b><small>{l.type} · {l.area.toLocaleString()} m²</small></span>
            <span className="bar"><i style={{width: `${(l.intensity / maxI) * 100}%`}} /></span><span className="num">{l.intensity.toFixed(2)}<small>kWh/m²/day</small></span>{l.flags > 0 && <span className="flag" title={`${l.flags} flag${l.flags > 1 ? 's' : ''}`}>{l.flags}</span>}</li>
        ))}</ul>
        <figcaption className="fine">Normalised to calendar days and floor area. Numbers in red circles are open flags.</figcaption>
      </figure>
    </section>
  );
}

function Periods() {
  const show = ['L1-electricity', 'L2-electricity', 'L3-electricity'];
  const from = bills.reduce((m, b) => Math.min(m, b.start), 999); const to = bills.reduce((m, b) => Math.max(m, b.end), 0);
  const x = (d) => `${((d - from) / (to - from)) * 100}%`;
  const monthsShown = [5, 6, 7, 8, 9, 10];
  return (
    <section className="sec" id="periods" aria-labelledby="per-title">
      <p className="kicker">The problem</p>
      <h2 id="per-title">Every bill runs on its own calendar.</h2>
      <p className="intro">One store’s bill ends on the 24th, another’s on the 28th, the hotel’s on the last day of the month — and cycles run 28 to 34 days. Put the totals side by side and you compare different lengths of time. Sometimes the periods even overlap.</p>
      <div className="periods" data-read>
        <div className="p-months" aria-hidden="true">{monthsShown.map((m) => <span key={m} style={{left: x(Math.max(from, Math.round((Date.UTC(2026, m - 1, 1) - Date.UTC(2026, 0, 1)) / 864e5) + 1))}}>{MONTHS[m - 1]}</span>)}</div>
        {show.map((k) => { const loc = locations.find((l) => k.startsWith(l.id)); return (
          <div key={k} className="p-row"><p>{loc.name}</p>
            <div className="p-track">{ACC[k].map((b, i) => { const lap = i > 0 && b.start <= ACC[k][i - 1].end; return <span key={b.id} className={lap ? 'p-bill lap' : 'p-bill'} style={{left: x(b.start), width: `calc(${x(b.end + 1)} - ${x(b.start)})`}} title={`${fmt(b.start)}–${fmt(b.end)} · ${days(b)} days`}>{days(b)}d</span>; })}</div>
          </div>); })}
      </div>
      <p className="fine">Fictional accounts, April–October. The red stub is a bill that starts before the previous one ended.</p>
    </section>
  );
}

function Compare() {
  const rows = [...OCT].sort((a, b) => b.intensity - a.intensity);
  return (
    <section className="sec ledger" id="compare" aria-labelledby="cmp-title">
      <p className="kicker">Usage normalisation</p>
      <h2 id="cmp-title">Compare like with like.</h2>
      <p className="intro">MeterVellum spreads each bill evenly across its days, rebuilds calendar months, and divides by floor area — so a hotel and a corner store can sit on the same chart.</p>
      <table className="cmp" data-read>
        <thead><tr><th scope="col">Location</th><th scope="col">Type</th><th scope="col">October kWh</th><th scope="col">kWh per day</th><th scope="col">kWh / m² / day</th><th scope="col">October cost</th></tr></thead>
        <tbody>{rows.map((l) => <tr key={l.id}><th scope="row">{l.name}</th><td>{l.type}</td><td>{Math.round(l.kwh).toLocaleString()}</td><td>{Math.round(l.kwh / 31).toLocaleString()}</td><td><b>{l.intensity.toFixed(2)}</b></td><td>{money(l.cost)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

const CHECK_NAMES = {usage: 'Unusual usage', repeat: 'Repeated charges', overlap: 'Overlapping periods', rate: 'Rate mismatches', estimated: 'Estimated reads'};

function Checks() {
  const ex = Object.keys(CHECK_NAMES).map((k) => ALL_FLAGS.find((f) => f.kind === k)).filter(Boolean);
  return (
    <section className="sec" id="checks" aria-labelledby="chk-title">
      <p className="kicker">Anomaly detection</p>
      <h2 id="chk-title">Five checks on every bill.</h2>
      <p className="intro">Each flag says what looks wrong, shows the numbers behind it and estimates what it costs. A facilities manager decides whether it is a real issue or has an explanation.</p>
      <div className="stubs">{ex.map((f) => { const loc = locations.find((l) => f.key.startsWith(l.id)); return (
        <article key={f.id} className={`stub ${f.kind}`} data-read>
          <p className="mono">{CHECK_NAMES[f.kind]}</p>
          <h3>{f.title}</h3>
          <p>{f.detail}</p>
          <p className="stub-foot"><span>{loc.name} · {UNIT[f.key.split('-')[1]] === 'm³' ? 'water' : 'electricity'}</span>{f.impact > 0 && <b>≈ {money(f.impact)}</b>}</p>
        </article>); })}</div>
      <p className="fine">Examples from the fictional portfolio. A school’s August holiday dip is deliberately not flagged: usage that falls is not treated as a fault.</p>
    </section>
  );
}

function Forecast() {
  const rows = Object.entries(ACC).map(([k, a]) => { const loc = locations.find((l) => k.startsWith(l.id)); const open = new Set(anomalies(a, tariffs[k]).map((f) => f.id)); return {k, loc, util: k.split('-')[1], f: forecast(a, tariffs[k], open)}; });
  return (
    <section className="sec" id="forecast" aria-labelledby="fc-title">
      <div className="split">
        <div>
          <p className="kicker">Cost forecasting</p>
          <h2 id="fc-title">Next month’s spend, from your own tariffs.</h2>
          <p className="intro">Forecasts project recent usage per day — leaving out bills with open flags — and price it with the tariff your finance team has confirmed. No confirmed tariff, no forecast: MeterVellum never guesses a rate.</p>
        </div>
        <ul className="fc" data-read>{rows.map(({k, loc, util, f}) => (
          <li key={k} className={f.ok ? '' : 'pending'}><span><b>{loc.name}</b><small>{util}</small></span>{f.ok ? <span className="num">{money(f.cost)}<small>{money(f.low)}–{money(f.high)}</small></span> : <span className="wait">{f.reason}</span>}</li>
        ))}</ul>
      </div>
    </section>
  );
}

const STEPS = [['Upload bills', 'PDFs or scans from each location, electricity first and water when you’re ready.'], ['Extract and confirm', 'Readings, charges and periods are read automatically; anything uncertain is confirmed by a person.'], ['Normalise and check', 'Usage per day, per month and per m², with five checks on every bill.'], ['Review and report', 'Facilities review the flags; a monthly portfolio report goes to the people who pay the bills.']];
const RULES = [['Every figure traceable', 'Normalised numbers link back to the bill, its period and the line they came from.'], ['People confirm', 'Uncertain readings and every flag are reviewed before a report is published.'], ['No guessed tariffs', 'Forecasts appear only once finance has confirmed the tariff.'], ['Falls are not faults', 'Lower usage — holidays, closures — is shown, not flagged.']];

function Steps() {
  return (
    <section className="sec" aria-labelledby="how-title">
      <p className="kicker">How it works</p>
      <h2 id="how-title">From a pile of bills to a monthly report.</h2>
      <ol className="steps">{STEPS.map(([t, d], i) => <li key={t} data-read><span className="mono">Step {i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
      <h3 className="sub">Ground rules</h3>
      <div className="rules">{RULES.map(([t, d]) => <article key={t} data-read><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>
  );
}

function Stats() {
  return (
    <section className="sec" aria-labelledby="stats-title">
      <p className="kicker">Why it matters</p>
      <h2 id="stats-title">Buildings run on bills nobody has time to read.</h2>
      <div className="stats">{site.stats.map((s) => <article key={s.value} data-read><b>{s.value}</b><p>{s.label}</p><a href={s.url} target="_blank" rel="noopener noreferrer">{s.source}</a></article>)}</div>
    </section>
  );
}

const WHO = [['Retail chains', 'Dozens of similar stores that should use similar energy — and the outliers that don’t.'], ['Hotels', 'Large electricity and water bills where a leak or a stuck chiller costs thousands.'], ['Schools', 'Term-time and holiday patterns, and budgets set a year ahead.'], ['Restaurant groups', 'Kitchens with high, variable loads and frequent tariff changes.'], ['Commercial property operators', 'Shared meters, recharges and estimated reads across buildings.']];

function Who() {
  return (
    <section className="sec" aria-labelledby="who-title">
      <p className="kicker">Who it’s for</p>
      <h2 id="who-title">Businesses with more meters than people to watch them.</h2>
      <div className="who">{WHO.map(([t, d]) => <article key={t} data-read><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>
  );
}

const PLANS = [['Starter', '$9', 'per location / month', ['Electricity bills', 'Extraction with confirmation', 'Five bill checks', 'Monthly portfolio report'], false], ['Portfolio', '$7', 'per location / month, 25+ locations', ['Electricity and water', 'Everything in Starter', 'Tariff management and forecasts', 'Roles and audit log'], true], ['Enterprise', 'Custom', '', ['Hundreds of locations', 'Utility data feeds on request', 'Single sign-on', 'Agreed data-handling terms'], false]];

function Pricing() {
  return (
    <section className="sec" id="pricing" aria-labelledby="pricing-title">
      <p className="kicker">Pricing</p>
      <h2 id="pricing-title">Priced by location.</h2>
      <p className="intro">Illustrative pricing for a proposed product, to be agreed with pilot customers.</p>
      <div className="plans">{PLANS.map(([n, p, per, items, hl]) => <article key={n} className={hl ? 'plan hl' : 'plan'} data-read><h3>{n}</h3><p className="price">{p}<small>{per}</small></p><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul><a className={hl ? 'btn' : 'btn ghost'} href="#pilot">{n === 'Enterprise' ? 'Contact us' : 'Request a pilot'}</a></article>)}</div>
    </section>
  );
}

function Technology() {
  return (
    <section className="sec" id="technology" aria-labelledby="tech-title">
      <p className="kicker">Technology</p>
      <h2 id="tech-title">How we use Amazon Web Services.</h2>
      <p className="intro">{WHY}</p>
      <ol className="stages">{STAGES.map(([t, svcs, d], i) => <li key={t} data-read><span className="mono">Stage {i + 1}</span><h3>{t}</h3><p className="svcs">{svcs.map((s) => <span key={s}>{s}</span>)}</p><p>{d}</p></li>)}</ol>
      <div className="across" data-read><p className="mono">Across every stage</p><ul>{ACROSS.map(([a, b]) => <li key={a}><b>{a}</b> {b}</li>)}</ul></div>
      <h3 className="sub">Services and their role in MeterVellum</h3>
      <dl className="svc">{SERVICES.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
      <p className="fine">Proposed, not deployed. This website and the portfolio report run in your browser on fictional data.</p>
    </section>
  );
}

function Team() {
  return (
    <section className="sec" id="team" aria-labelledby="team-title">
      <p className="kicker">Team</p>
      <h2 id="team-title">The team behind MeterVellum.</h2>
      <div className="team">{site.team.map((p) => <article key={p.name} data-read><span className="av" aria-hidden="true">{p.initials}</span><div><h3>{p.name}</h3><p className="role">{p.role}</p><p>{p.bio}</p><ul className="tags">{p.focus.map((f) => <li key={f}>{f}</li>)}</ul></div></article>)}</div>
    </section>
  );
}

function Pilot() {
  return (
    <section className="sec" id="pilot" aria-labelledby="pilot-title">
      <p className="kicker">Progress & pilot programme</p>
      <h2 id="pilot-title">Bring a handful of locations and their bills.</h2>
      <div className="pilot">
        <div>
          <p className="intro">MeterVellum is in its building stage and opening its first pilots. A pilot covers a few locations: you upload recent electricity bills, we confirm tariffs with your team, and you receive a monthly portfolio report with every flag explained.</p>
          <h3 className="sub">Where MeterVellum is today</h3>
          <ol className="readings">{PROGRESS.map(([st, t, d]) => <li key={t} className={st === 'Next' ? 'next' : ''}><span className="mono">{st}</span><span><b>{t}</b><small>{d}</small></span></li>)}</ol>
        </div>
        <div className="card-form"><PilotForm /></div>
      </div>
    </section>
  );
}

const FAQ = [['Which utilities are covered?', 'Electricity first, from uploaded bills. Water follows in the same workspace; gas and other utilities come later.'], ['Do we need smart meters?', 'No. MeterVellum works from the bills you already receive. Meter data feeds can be added later.'], ['How are unusual charges found?', 'Five checks run on every bill: unusual usage against the location’s own history, repeated one-off charges, overlapping or missing billing days, rates that differ from your tariff, and runs of estimated reads.'], ['Is MeterVellum live?', 'Not yet. It is a proposed product; the portfolio report is a prototype running in your browser on fictional bills.']];

function Faq() {
  return (
    <section className="sec" aria-labelledby="faq-title">
      <p className="kicker">FAQ</p>
      <h2 id="faq-title">Frequently asked questions.</h2>
      <div className="faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>
  );
}

function Contact() {
  return (
    <section className="sec" id="contact" aria-labelledby="contact-title">
      <div className="pilot">
        <div>
          <p className="kicker">Contact</p>
          <h2 id="contact-title">Talk to the MeterVellum team.</h2>
          <p className="intro">Questions about the product, the pilot programme, bill uploads or how your data is handled. Messages go directly to the founders.</p>
          <p className="contact-line"><span className="mono">Email</span><a href={`mailto:${site.email}`}>{site.email}</a></p>
        </div>
        <div className="card-form"><ContactForm /></div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ft">
      <a href="/" className="brand light" aria-label="MeterVellum home"><Logo /><span>Meter<em>Vellum</em></span></a>
      <p>{site.tagline}</p>
      <nav aria-label="Footer"><a href="/app">Portfolio report</a><a href="/#technology">Technology (AWS)</a><a href="/#pricing">Pricing</a><a href="/#contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href={`mailto:${site.email}`}>{site.email}</a></nav>
      <p className="fine">© 2026 MeterVellum. Founded by {site.team[0].name} with co-founder {site.team[1].name} and CTO {site.team[2].name}. A proposed product: pricing is illustrative and the portfolio report uses fictional data.</p>
    </footer>
  );
}

function Home() {
  return (<><Hero /><Periods /><Compare /><Checks /><Forecast /><Steps /><Stats /><Who /><Pricing /><Technology /><Team /><Pilot /><Faq /><Contact /></>);
}

const LEGAL = {
  privacy: ['Privacy notice', [
    ['This website', 'MeterVellum is a proposed product. This website and the portfolio report run in your browser on fictional data.'],
    ['Portfolio report', 'Your changes are kept in your browser’s local storage (key metervellum-report-v1) and never leave your device. “Reset” clears them.'],
    ['Forms', `Until a form service is connected, the pilot and contact forms open a pre-filled email to ${site.email}; nothing is sent until you send it. This notice will be updated before any customer-relationship service is connected.`],
    ['Cookies & analytics', 'None.'],
  ]],
  terms: ['Terms of use', [
    ['A proposed product', 'Nothing here is an offer of service. Pricing is illustrative.'],
    ['Demonstration only', 'The portfolio report uses fictional bills and must not be used for real billing disputes.'],
    ['People decide', 'MeterVellum flags; facilities and finance staff decide what to raise with utilities.'],
    ['No affiliation', 'Organisation types named are prospective customers; no affiliation is implied.'],
  ]],
};

function Legal({kind}) {
  const [title, items] = LEGAL[kind];
  return <section className="sec legal"><p className="kicker">Review draft</p><h1>{title}</h1>{items.map(([t, d]) => <div key={t}><h2>{t}</h2><p>{d}</p></div>)}</section>;
}

function NotFound() {
  return <section className="sec legal"><p className="kicker">404</p><h1>No reading for this page.</h1><p>We couldn’t find it.</p><p><a className="btn" href="/">Back to MeterVellum</a></p></section>;
}

export default function App({path = '/'}) {
  if (path.startsWith('/app')) return <Portfolio />;
  const page = path === '/' ? <Home /> : path === '/privacy' ? <Legal kind="privacy" /> : path === '/terms' ? <Legal kind="terms" /> : <NotFound />;
  return (<><a className="skip" href="#main">Skip to content</a><Header /><main id="main">{page}</main><Footer /></>);
}


