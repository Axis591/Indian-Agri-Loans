# AgriBridge V3 — Release Notes

Release: 07 November 2026 · CRM catalogue update

V3 is the integrated all-India farmer support and finance release. The programme/benefit and finance workstreams remain equal product priorities.

## Added in V3

- Scheme/benefit/service catalogue expanded from 31 to 38 records. Six additional State records were added for Odisha, Andhra Pradesh, Telangana, Rajasthan, Maharashtra and Assam.
- State/UT research register now covers all 36 States/UTs and nine workstreams per State: income support, crop support, mechanisation/irrigation, horticulture, livestock/fisheries, marketing/procurement, cooperatives, tenant/landless/tribal and enterprise/infrastructure.
- Twelve named State-scope scheme/service records now span seven States/UTs. The other 29 State/UT inventories remain explicitly research-pending; a portal link is not counted as a researched scheme.
- Loan-cost comparison supports reducing-balance and flat-rate monthly instalments, processing fees, other upfront charges, total repayment, total financing cost and estimated annualised cash-flow APR.
- Daily mandi query UI calls a same-origin Cloudflare Pages Function. The data.gov.in API key is stored server-side as a Cloudflare secret, not in browser code.
- Geography selection now prefers the official LGD API when configured, then an imported official `lgd-geography.json`, then the visibly labelled community fallback.
- Added `scripts/import-lgd-export.mjs` for downloaded official LGD District, Sub-district, Village and Local Bodies CSV files. Local Body codes remain at State level where the source does not give reliable district linkage.
- NGO Connect is no longer a localStorage prototype. It uses Cloudflare Access JWT validation, organisation-scoped D1 metrics/follow-ups, roles, audit events and pseudonymous reference codes. It remains disabled until Cloudflare account configuration is completed.
- Added Cloudflare Pages Function routing configuration so only `/api/*` invokes Functions.
- Added a production setup guide and security/privacy notes.

## V3 catalogue counts

| Dataset | Count |
|---|---:|
| Scheme / benefit / public-service records | 38 |
| Lender / finance entries | 46 |
| States / UTs in portal register | 36 |
| State-specific programme records | 12 across 7 States/UTs |
| State programme research workstreams | 9 per State/UT |
| Community fallback district entries | 779 (not official LGD-reconciled) |
| Direct district website links | 22 (West Bengal) |

## Not yet activated / complete

- The current public website has not been configured with the owner's Cloudflare D1 binding, Access application, team-domain/AUD variables, approved member allowlist or data.gov.in API secret. Thus secure NGO collaboration and live mandi API data are implemented but disabled until those account settings are completed.
- An official LGD CSV import has not yet been provided/run. The site uses the community snapshot until the district API or `lgd-geography.json` is available.
- The OGD Local Bodies resource page currently states that an API does not exist for that resource. Download/import its official export or request API access; do not infer district links.
- Full State scheme inventories, seasonal notifications, local PACS/branches, BDO/Panchayat, block targets and branch serviceability remain active research tasks. The 29 States/UTs without a named State record are labelled pending.
- Loan APR is an estimate from entered offer inputs; it is not the lender's official APR/KFS. Verify all fees, insurance, daily-rest rules and repayment dates from the sanction/KFS.
- Mandi data is daily reported wholesale data, not a live farm-gate quote or price guarantee.

## Required administrator setup

Follow `CLOUDFLARE_SETUP_V3.md` to activate the server secret, D1 binding, Cloudflare Access application, D1 migration and authorised NGO user provisioning.

## Validation

`scripts/validate-v3.mjs` checks JSON schema and record versions, State/UT coverage, State research register reconciliation, lender/source fields, extension-unverified exclusions, app syntax, navigation, data routes, Pages Function files and privacy controls.

### 07 November 2026 — Crop Residue Management addition

- Added the national CRM scheme as a structured catalogue record, with current implementation-State limits, individual/CHC/supply-chain assistance tracks, application guidance, document checklist and official source links.
- Added it to the searchable scheme directory and the My Support matcher through the existing data-driven catalogue; no layout or navigation changes were required.
- Updated the catalogue/coverage record count to 38. The application window remains State- and district-notification dependent.

Last updated: 07 November 2026.


## 07 November 2026 — NGO Helping Hand expansion

- Replaced the NGO Connect placeholder entry with a mandatory organisation onboarding form, private application code/token status checks and platform-admin review/approval flow.
- Added organisation-scoped membership provisioning, Access login return route and admin/editor/viewer role checks.
- Added consent-stamped pseudonymous farmer profiles, profile-driven potential scheme recommendations from the public catalogue, profile editing after staff review of evidence, optional private R2 file upload/download/review and a manual scheme-application tracker.
- Added a manual scheme picker that lets NGOs choose any non-excluded catalogue scheme listed for a selected farmer's State/District, even when it is not in that farmer's automatic shortlist.
- Added D1 migration 0002, Turnstile-based public form protection, salted submission rate limits, privacy notice draft and a production setup guide.
- Uploaded documents are redacted evidence for human review only; no OCR, automated document verification or malware scanning is provided. Scheme recommendations are catalogue matches, not approval or direct government submissions.
- Production activation still requires the site owner's D1 migration, R2 binding, Cloudflare Access configuration, Turnstile variables, rate-limit salt and platform-admin email allowlist.
