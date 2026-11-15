# Architecture

Status: **proposed**. The website and the prototype run entirely in the browser on fictional data. None of the AWS services below are deployed or connected.

## Today: browser-only prototype

- Vite + React, server-rendered to static HTML for every route (`scripts/prerender.mjs`).
- Fictional locations, bills and tariffs live in `src/data.js`; normalisation, the five bill checks, forecasts and review actions are pure functions in `src/engine.js`, tested with `node --test`.
- Changes persist in `localStorage`; roles are switched in the UI, not authenticated.

## Why AWS

MeterVellum’s work is document-heavy and recurring: every location sends a bill every cycle, in different formats and on different calendars, and each figure must stay traceable to the page it came from. Designing on AWS lets document storage, extraction, forecasting and validation run as managed services, and keeps each customer’s portfolio isolated as it grows from a few sites to hundreds.

## Proposed production service

| Stage | Services | What happens |
|---|---|---|
| 1. Bill intake | Amazon S3 | Electricity and water bills (PDFs and scans) land in per-customer storage, organised by location and account. |
| 2. Extract | Amazon Textract, AWS Lambda | Readings, charges, billing periods and read types are extracted with confidence scores; Lambda validates totals and dates. |
| 3. Location history | Amazon DynamoDB | Bills, normalised usage per day and per month, tariffs, flags and every review decision are stored per location. |
| 4. Forecast | Amazon SageMaker AI | A usage model trained on each location’s history projects consumption; confirmed tariffs turn it into expected spend. |
| 5. Review & report | Amazon API Gateway, Amazon Cognito | Authenticated review, tariff and report APIs serve the portfolio workspace, with facilities and finance roles. |
| Across every stage | AWS Lambda, Amazon CloudWatch, AWS KMS, Amazon SES | AWS Lambda runs normalisation and the bill checks; Amazon CloudWatch monitors uploads, extraction and APIs; AWS KMS encrypts each customer’s bills; Amazon SES sends monthly reports and flag alerts |

### Services and their role

- **Amazon S3** — Stores uploaded bills and exported monthly reports, separated by customer and location.
- **Amazon Textract** — Extracts readings, charge lines, billing periods and read types from bill PDFs and scans, with page positions and confidence.
- **AWS Lambda** — Validates extracted totals and dates, normalises usage to per-day and calendar-month figures, and runs the five bill checks.
- **Amazon DynamoDB** — Holds location histories, tariffs, flags and every confirmation and review decision.
- **Amazon SageMaker AI** — Trains and hosts per-location usage forecasts that account for trend and season.
- **Amazon API Gateway** — Exposes the review, tariff and report endpoints, plus the website’s pilot-request intake.
- **Amazon Cognito** — Signs users in and separates facilities, finance and site-manager roles.
- **Amazon SES** — Delivers monthly reports, flag alerts and pilot-request notifications.
- **Amazon CloudWatch** — Collects logs and metrics for uploads, extraction failures and API latency.
- **AWS KMS** — Encrypts bills and location data at rest with customer-specific keys.

The same lists live in `src/aws.js` and are shown on the home page (`#technology`).

### Design rules

1. **Every figure traceable.** Each normalised number links back to the bill, the billing period and the extracted line it came from.
2. **People confirm.** Low-confidence readings and every flag are reviewed by facilities staff before a report is published.
3. **Forecasts need confirmed tariffs.** MeterVellum never guesses a rate; forecasts appear only once finance has confirmed the tariff.
4. **Isolated by customer.** Each customer's bills and locations sit in their own partition with role checks on every request.

## Website lead capture

The pilot and contact forms post to HubSpot (see `docs/crm-plan.md`). If a server-side intake is needed later, Amazon API Gateway + AWS Lambda can validate submissions and Amazon SES can notify the founder.
