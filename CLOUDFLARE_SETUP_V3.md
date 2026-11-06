# AgriBridge V3 — Cloudflare Production Setup

Release: 31 October 2026

This repository contains the Cloudflare Pages Functions, D1 schema, source-data proxies and authenticated NGO workspace code. **The code is committed, but the secure NGO database and live OGD API feeds are not activated until the Cloudflare account owner completes the dashboard steps below.** The public directory remains usable without those optional services.

## 1. What is deployed by the repository

- `functions/api/market-prices.js`: same-origin proxy to the Government of India's daily AGMARKNET/OGD resource. The API key is read only from a Cloudflare secret and is never shipped to the browser.
- `functions/api/geography.js`: optional proxy to the official LGD District API if that resource has a functioning API endpoint and a resource ID is configured.
- `functions/api/ngo/*`: Cloudflare Access JWT validation, organisation role checks, D1-backed aggregate metrics, pseudonymous follow-up references and audit events.
- `migrations/0001_ngo_secure.sql`: D1 schema. It has no fields for farmer names, Aadhaar, phone numbers, bank-account numbers or document scans.
- `scripts/import-lgd-export.mjs`: imports official LGD CSV exports into a machine-readable geography file. This is the supported route for Local Bodies exports where OGD does not publish an API.

Cloudflare Pages uses file-based routing from the root `functions/` directory. The repository's `_routes.json` restricts Function invocations to `/api/*`, so static HTML/CSS/JS and JSON assets are not needlessly sent through a Function invocation.

## 2. Activate the daily mandi-price feed

1. Sign in to the Open Government Data Platform at https://data.gov.in/.
2. Open the official resource: https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi.
3. Generate/copy an API key for your account/resource.
4. Open Cloudflare Dashboard → **Workers & Pages** → **indian-agri-loans** → **Settings** → **Variables and Secrets**.
5. Add a Production secret named `DATA_GOV_IN_API_KEY` and paste the key. Do not put the key in `app.js`, `index.html`, `portals.json`, GitHub Actions variables or any public file.
6. Save and redeploy the Pages project.
7. Open the public Market Access page and search a commodity. The source publishes daily market records; the result shows the market's own arrival date. A published modal price is not a guaranteed farm-gate quote.

The server-side proxy defaults to the official resource ID `9ef84268-d588-465a-a308-a864a43d0070`. If the OGD resource ID or fields change, update `RESOURCE_ID` and the normalisation map in `functions/api/market-prices.js`, then validate against a real API response.

## 3. Load official LGD geography

### Recommended path: monthly CSV export import

1. Open the Ministry of Panchayati Raj's official LGD portal: https://lgdirectory.gov.in/.
2. Download the current State/UT and District export from the official portal / OGD catalogue: https://data.gov.in/catalog/local-government-directory-lgd.
3. Download the corresponding Sub-district and Village exports if available.
4. Download the Local Bodies export separately. The OGD Local Bodies resource page currently states that an API does not exist for that resource and provides a request-API route; use the official CSV/export rather than assuming a live API is available.
5. Put the exports in a private working directory. The CSV files are not intended to be committed to the public repository.
6. Run the importer from the repository root:

```bash
node scripts/import-lgd-export.mjs \
  --districts /path/to/lgd-districts.csv \
  --subdistricts /path/to/lgd-subdistricts.csv \
  --villages /path/to/lgd-villages.csv \
  --local-bodies /path/to/lgd-local-bodies.csv \
  --as-of 2026-11-01 \
  --out lgd-geography.json
```

7. Check the printed counts and completeness flags. Review the output against the current LGD portal before using it for official routing.
8. Commit `lgd-geography.json` only after confirming it contains public administrative codes and names only. Do not include contact names, telephone numbers, personal identifiers or other sensitive fields.
9. Push to `main`. The application tries the configured official LGD API first, then the imported `lgd-geography.json`, then the explicitly labelled community snapshot.

The District resource is updated monthly. The Local Bodies dataset page explains that some villages may be mapped partially under more than one Gram Panchayat; do not force a one-to-one district/village/Panchayat join. This release keeps Local Body codes at State level when the export does not include a reliable district parent code.

### Optional API path for Districts

If OGD enables the District resource API for your account, obtain its resource ID from the official District resource page: https://data.gov.in/resource/local-government-directory-lgd-districts. In Cloudflare → Pages → Settings → Variables and Secrets, add:

- `DATA_GOV_IN_API_KEY` — secret, if not already present for mandi prices.
- `LGD_DISTRICT_RESOURCE_ID` — non-secret resource UUID for the District resource with an active API.

Redeploy. `/api/geography` returns `configured: true` only when it receives a usable official dataset with State and District codes. If the resource API is unavailable, the site uses the downloaded CSV import or the community fallback and labels the source accordingly.

## 4. Enable NGO Helping Hand

The original V3 section described the aggregate-only NGO workspace. It has since been expanded with mandatory organisation onboarding, administrator approval, approved NGO sign-in, consent-based pseudonymous farmer profiles, scheme recommendations, private supporting files and a manual scheme-application tracker.

**Use the current, complete deployment runbook:** [NGO_HELPING_HAND_SETUP.md](NGO_HELPING_HAND_SETUP.md).

The new setup requires D1 migration `0002_ngo_helping_hand.sql` after migration 0001, a private R2 binding named `NGO_DOCS`, Turnstile site/secret keys, `NGO_JOIN_RATE_LIMIT_SALT`, `NGO_PLATFORM_ADMIN_EMAILS`, and the existing Cloudflare Access configuration. The feature remains unavailable until the site owner finishes these dashboard steps and redeploys.

Review [NGO_PRIVACY_NOTICE.md](NGO_PRIVACY_NOTICE.md) before accepting organisation applications or farmer profiles. Uploaded files are redacted support evidence for human review only; the matching system reads structured profile fields and does not OCR or automatically verify uploads.

## 5. Test the secured endpoints

- `GET /api/ngo/workspace` — returns 503 until D1 / Access settings are present; returns 401/403 if an unauthorised user calls it; returns the organisation workspace to an authorised user.
- `PUT /api/ngo/metrics` — accepts only seven aggregate whole-number project metrics.
- `POST /api/ngo/followups` — accepts an internal code, State, District, support category and status only.
- `DELETE /api/ngo/followups/<uuid>` — admin-only.
- `GET /api/market-prices?state=...&district=...&commodity=...` — requires `DATA_GOV_IN_API_KEY`.
- `GET /api/geography` — requires a configured `LGD_DISTRICT_RESOURCE_ID` and OGD API key; otherwise the app automatically falls back.

Do not test with real farmer identity data. Use dummy aggregate counts and random references (for example `CAMP-TEST-001`).

## 6. Privacy and operating controls

- The NGO workspace schema deliberately stores aggregate measures and internal reference codes, not farmer identity records or uploaded documents.
- Cloudflare Access restricts the API; `ngo_users` provides organisation-scoped roles; all writes create an audit event.
- D1 queries filter by the authenticated member's `org_id`, preventing one organisation from reading or deleting another organisation's follow-ups.
- The public Find My Support assistant remains browser-side and does not send a farmer profile to the server.
- Before any future collection of personal data, obtain legal/privacy review, document purpose and lawful basis, consent/notice where required, security controls, data retention/deletion and grievance processes. Do not add personal-data fields to this schema without a separate design/security review.
- The DPDP Act commencement notification was published on 13 November 2025 and phases in core obligations 18 months after publication (13 May 2027). This is not a grace period to ignore privacy safeguards; implementation should be reviewed against the current law, rules and legal advice.

## 7. Troubleshooting

| Symptom | What it means / action |
|---|---|
| NGO page says backend not configured | Check `NGO_DB`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, and redeploy. |
| NGO page asks you to sign in repeatedly | Check the Access application path, identity policy, team domain and AUD tag. |
| Sign-in works but user is not enabled | Insert the verified email into `ngo_users` with an organisation ID and role. |
| Mandi search says API key required | Add `DATA_GOV_IN_API_KEY` as an encrypted Production secret and redeploy. |
| Geography shows Community Snapshot | The District API is not configured and no `lgd-geography.json` import exists. Follow Section 3. |
| Local Body rows have no district assignment | The source CSV may not contain district parent IDs. Retain State-level codes; obtain a validated LGD relationship file before allocating them to districts. |

Primary official documentation:

- Pages Functions routing: https://developers.cloudflare.com/pages/functions/routing/
- Pages Functions D1 bindings and secrets: https://developers.cloudflare.com/pages/functions/bindings/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- D1 Wrangler commands: https://developers.cloudflare.com/d1/wrangler-commands/
- Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- LGD data catalogue: https://data.gov.in/catalog/local-government-directory-lgd
- Daily mandi price resource: https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi
- DPDP commencement Gazette notification: https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf

Last updated: 31 October 2026.
