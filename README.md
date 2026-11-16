# MeterVellum

**Understand utility costs across every location.**

MeterVellum helps multi-site businesses (retail chains, hotels, schools, restaurant groups and commercial property operators) compare electricity and water use across locations. AI extracts bill data, normalises billing periods and flags unusual consumption or charges. Forecasting estimates upcoming spend from usage trends and confirmed tariffs. Facilities teams review every flag before a report goes out.

> MeterVellum is a proposed product. Pricing is illustrative and the prototype uses fictional bills. Founder: **Aisha Suleiman**; co-founder **Zainab Lawal**; CTO **Tochukwu Okonkwo**. Website: `metervellum.space` · contact: `aisha@metervellum.space`. LinkedIn availability for `metervellum` / `meter-vellum` is unconfirmed, so no page is linked. Organisation types named on the site are prospective customers with no implied affiliation.

## Design

The look is the utility bill: perforated stubs, a mechanical meter, amber for electricity and blue for water. Instrument Serif is used for headlines and figures, Instrument Sans for text and Martian Mono for readings.

- **Hero:** a meter whose odometer digits roll up to the portfolio's October kWh. Location bars fill like gauges, normalised to kWh per m² per day, with open flags shown on each.
- **Every bill runs on its own calendar:** billing periods drawn to scale, with an overlapping bill shown in red.
- **Compare like with like:** a normalised table.
- **Five checks on every bill:** perforated stubs with estimated cost impact.
- **Forecast:** next month's spend, shown only where the tariff is confirmed.
- **Other sections:** steps, ground rules, sourced statistics (US EIA and ENERGY STAR), pricing, team, FAQ.
- **Technology:** "How we use Amazon Web Services" in five stages (S3, Textract, Lambda, DynamoDB, SageMaker AI, API Gateway, Cognito), a row for the services that span every stage, and each service's role.
- **Progress and pilot:** "Where MeterVellum is today" beside the pilot form, followed by a contact form with a topic picker.

## Portfolio report (`/app`)

The report covers six fictional locations: electricity for all, water for two.

- **Normalisation:** usage per day per bill, then calendar months built by spreading each bill across its days, then kWh per m² per day.
- **Five checks:**
  - usage more than 30% above the account's own median
  - one-off charges repeated on consecutive bills
  - billing periods that overlap or leave gaps
  - billed rates more than 5% away from the tariff
  - consecutive estimated reads
- **Low-confidence readings:** these must be confirmed or corrected (with a reason) before the report can be published.
- **Planted issues:** each fictional account has one issue, and a school's holiday dip is deliberately *not* flagged.
- **Flag review:** the Facilities Manager raises or explains each flag, with a note.
- **Forecasts:** these use only tariffs that Finance has confirmed. They leave out bills with open usage or overlap flags, and unusually low periods.
- **Report:** the monthly portfolio report is published with a covering note and exported as CSV. Roles are Facilities Manager, Finance Analyst, Site Manager and Viewer.

Every action is written to a log, and state persists in `localStorage`.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build   # Vite build, server render, static prerender of /, /app, /privacy, /terms and 404.html
npm test        # node --test: planted issues, normalisation, forecasts, review rules, forms, AWS content
```

Docs: `docs/architecture.md` (proposed AWS architecture and design rules) and `docs/crm-plan.md` (HubSpot forms and properties). Until HubSpot is configured, the forms keep requests in the browser and open a pre-filled email. Set `VITE_HUBSPOT_PORTAL_ID`, `VITE_HUBSPOT_FORM_GUID` and `VITE_HUBSPOT_CONTACT_FORM_GUID` (see `.env.example`) and update the privacy notice first.
