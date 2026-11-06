# AgriBridge NGO Helping Hand — Production Setup

**Release note:** 7 November 2026  
**Status:** Feature code is in the repository. The production service remains unavailable until the account owner configures the D1, R2, Access and Turnstile resources below.

This guide covers the mandatory NGO membership application, administrator review, approved NGO sign-in, pseudonymous farmer profiles, private supporting files, scheme matching and manual application tracking.

## 1. What the feature does

1. An organisation opens **NGO Helping Hand** and completes the mandatory membership form.
2. Turnstile and server-side validation protect the public form. The request is stored as **pending**. The applicant receives an application code and a private tracking token; the token is shown once.
3. A configured AgriBridge platform administrator reviews the request. Approval creates an organisation record and provisions the submitted official email as that organisation's first **admin** member.
4. The approved member signs in using Cloudflare Access. Access authenticates the email; the D1 membership table decides whether the email can access organisation data.
5. NGO staff create a farmer case using a random reference and structured characteristics. The farmer must have agreed to the profile and its purpose.
6. AgriBridge compares those structured characteristics with the scheme catalogue and returns **potential matches** with verification notes and official links.
7. Staff can add a matching scheme to the manual application tracker and open the official portal/process. The actual government/department application remains a manual process outside AgriBridge.

The public form does not auto-approve organisations or send approval emails. Applicants use their application code and private tracking token to check status. The platform admin must contact applicants using their independently verified official contact channel where more evidence is required.

## 2. Apply the D1 migration

The repository runs the release validator and a synthetic SQLite integration test for migrations 0001 and 0002 on every `main` push. The automated test does not connect to or modify your production D1 database.

The current NGO workspace uses migration 0001. Apply migration 0002 after it:

```bash
npx wrangler login
npx wrangler d1 migrations apply agribridge-ngo --remote
```

If migration 0001 was applied manually in the D1 SQL editor, confirm that the existing tables are present, then apply the contents of `migrations/0002_ngo_helping_hand.sql` in the D1 SQL editor. Do not run the migration against a production database until you have a backup.

Migration 0002 adds:
- organisation membership applications and organisation records;
- a hashed application-status token and salted rate-limit table;
- consent-stamped pseudonymous farmer profiles;
- private document metadata;
- manual scheme application records.

## 2A. Deployment from GitHub

The public site is designed for Cloudflare Pages. When this repository is connected to the Cloudflare Pages Git integration and `main` is selected as the production branch, Cloudflare automatically builds and deploys new commits pushed to `main`. Confirm the Git integration is connected to `Axis591/Indian-Agri-Loans` and automatic production deployments are enabled in Cloudflare Dashboard → Workers & Pages → your Pages project → Build → Branch control.

The repository's `.github/workflows/pages.yml` is only an optional GitHub Pages backup. It is skipped unless the repository variable `ENABLE_GITHUB_PAGES=true` is explicitly set. It is not the Cloudflare deployment mechanism.

Cloudflare's Git integration guide: https://developers.cloudflare.com/pages/configuration/git-integration/

## 3. Configure Cloudflare Pages bindings

Open **Cloudflare Dashboard → Workers & Pages → indian-agri-loans → Settings → Bindings**.

### D1

Confirm the D1 database is bound as exactly:

| Binding | Resource |
|---|---|
| `NGO_DB` | The production `agribridge-ngo` D1 database |

The production binding must be redeployed after it is added or changed.

### R2 — private farmer supporting files

1. Create an R2 bucket, for example `agribridge-ngo-private-docs`.
2. Keep public bucket access disabled. Do not attach a public custom domain.
3. Add an R2 bucket binding to the Pages project:

| Binding | Resource |
|---|---|
| `NGO_DOCS` | The private bucket created above |

4. Redeploy after adding the binding.

The upload API only accepts PDF, PNG and JPEG files up to 5 MB. It checks the file signature and stores a generated object name. Downloads are served through authenticated organisation-scoped routes as attachments. Do not put an R2 public URL in the site.

**Important:** this release does not include antivirus scanning or OCR. An upload is marked pending staff review. The organisation should use an independent malware-scanning process before opening files and should upload only necessary, redacted evidence. Do not upload Aadhaar, PAN, bank passbooks, OTP screenshots or unredacted identity documents.

Cloudflare Pages binding instructions: https://developers.cloudflare.com/pages/functions/bindings/

## 4. Configure Cloudflare Access

Create a Self-hosted Access application for `indian-agri-loans.pages.dev` with the path:

```
/api/ngo/*
```

Use a verified identity method such as email one-time PIN. The login route is `/api/ngo/login`; successful authentication returns the person to the NGO page.

**Recommended policy:** allow verified email identities to complete the Access sign-in, then rely on the API's D1 membership check for authorisation. Every private NGO API except the sign-in return route calls `requireNgoUser` or `requirePlatformAdmin`. An email that is not in `ngo_users` receives 403 and cannot read another organisation's records. A platform administrator must also appear in `NGO_PLATFORM_ADMIN_EMAILS`.

If you instead use a restrictive Access email allowlist, you must add every newly approved NGO contact email to that Access policy as well as approving it in the AgriBridge review queue. Otherwise the person cannot reach the D1 membership check to sign in.

Copy the Access Application Audience (AUD) tag and the Zero Trust team domain, then add the following Pages Production variables:

| Variable | Type | Value |
|---|---|---|
| `ACCESS_TEAM_DOMAIN` | Variable | Exact team domain, e.g. `https://<team-name>.cloudflareaccess.com` |
| `ACCESS_AUD` | Variable | Application AUD tag |

Do not use a browser-supplied email or an unverified identity header. The server validates the Access JWT signature, issuer, audience and expiry.

## 5. Configure public NGO application protection

Create a Cloudflare Turnstile widget for the live hostname `indian-agri-loans.pages.dev`. Use the widget's sitekey in the browser-facing Pages variable and its secret only in the Pages secret.

Add these variables/secrets under **Settings → Variables and Secrets**:

| Variable | Type | Purpose |
|---|---|---|
| `NGO_JOIN_TURNSTILE_SITE_KEY` | Variable | Public Turnstile sitekey; returned by the public config endpoint |
| `NGO_JOIN_TURNSTILE_SECRET` | Secret | Server-only Siteverify secret |
| `NGO_JOIN_RATE_LIMIT_SALT` | Secret | Long random secret used to hash the connecting IP for daily rate limits |
| `NGO_PLATFORM_ADMIN_EMAILS` | Variable/Secret | Comma- or semicolon-separated verified platform administrator email addresses |

Use a long random value for `NGO_JOIN_RATE_LIMIT_SALT`. Do not commit any secret or real administrator email to GitHub. The application form stays disabled until all required public-application settings and the D1 binding are present.

The backend calls Cloudflare's Siteverify endpoint; the browser widget alone is not treated as sufficient protection. Turnstile tokens are single-use and expire, so the interface requests a new verification after each submission attempt.

Turnstile server validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## 6. Membership review and login flow

1. Open the public site and go to **NGO Helping Hand**.
2. Complete the organisation form and submit the anti-spam verification.
3. Save the application code and private tracking token. The token cannot be recovered from the database because only its hash is stored.
4. A platform administrator signs in through Access and opens **Platform administrator review**. Their email must match `NGO_PLATFORM_ADMIN_EMAILS`.
5. The administrator can approve, reject or request more information. Approval creates an organisation ID and a D1 `ngo_users` record with role `admin` for the applicant's submitted email.
6. The approved contact signs in from the NGO page. Cloudflare Access verifies the email; `ngo_users` grants access only to the matching organisation.
7. Add other staff only after verifying their identity and authorisation. Use the organisation's existing ID and roles `editor` or `viewer`. Example D1 statement (replace placeholders in the D1 console only):

```sql
INSERT INTO ngo_users (email, org_id, role, active)
VALUES ('<verified-staff-email>', '<existing-organisation-id>', 'editor', 1);
```

Do not store actual email addresses or organisation records in repository files.

Roles:
- `admin`: manage farmer profiles, private documents, application records, metrics and organisation follow-ups; delete farmer cases and files.
- `editor`: create farmer profiles, upload supporting files, add/update manual application records and metrics.
- `viewer`: read organisation case and outcome information; cannot create or change records or download supporting documents.

## 7. Farmer profile and scheme recommendation workflow

A farmer case profile stores:
- an anonymous NGO case reference;
- State and district;
- applicant profile and land/cultivation status;
- main agricultural activity and required support type;
- crop/commodity, optional cultivated area and unit;
- season and irrigation status;
- consent timestamp and consent-notice version.

Profiles can be created one at a time or imported in a CSV file using `assets/ngo-farmer-import-template.csv`. The CSV parser runs in the browser, validates State/District values and allowed characteristic fields, accepts up to 100 rows per file, and sends only the structured profile rows to D1; it does not upload or retain the original CSV. A batch consent checkbox is mandatory and the NGO is responsible for explaining the purpose in a language each farmer understands and recording valid permission for every row. Maintain any mapping between the internal case code and a farmer's identity outside AgriBridge.

The recommendation engine uses structured characteristics and the source-linked records in `schemes.json`. It applies the catalogue's profile, land status, activity, location and support-needs rules. Crop/commodity, season, irrigation and area details can improve relevance ordering when the catalogue descriptions contain corresponding keywords or tags. It does not read document contents. If a supporting document changes a farmer characteristic, an authorised NGO admin/editor can mark the file reviewed, use **Edit profile**, confirm consent again, update the structured fields and rerun the shortlist.

A match is only a starting shortlist. Staff must check current eligibility, exclusions, funding availability, district target, seasonal window, machine/asset ceilings and official application requirements with the implementing department.

## 8. Manual scheme application tracker

For a recommended scheme, staff can choose **Add to tracker & open application**. For a scheme outside the automatic shortlist, the NGO can use the manual scheme selector: choose any saved farmer case, then select any non-informal scheme record in the catalogue that is listed for that farmer's State/District. The site creates an organisation-scoped progress record and opens the scheme's official application link.

The manual picker is independent of the recommendation list: select any saved farmer and choose any catalogue scheme listed for that farmer's State/District (excluding informal-risk records and entries explicitly excluded from matching due to unverified continuation). The tracker supports identified, preparing, documents pending, ready to submit, submitted, approved, rejected, benefit received and closed stages. Staff can add a non-personal application reference and a short progress note.

The tracker is not a government application API. It does not transmit personal data to scheme portals, submit an application, reserve a subsidy, or represent approval. The NGO/farmer must complete the process on the official website or at the authorised department/bank/CSC.

## 9. Privacy, retention and operational safeguards

Before using real cases:
- review and publish `NGO_PRIVACY_NOTICE.md`, identify the responsible platform operator and each NGO's role, and add a monitored privacy/grievance contact;
- define and implement a retention period for membership applications, farmer profiles, private files and audit data; automatic retention expiry is not included in this release;
- explain the purpose to each farmer in a language they understand and retain an auditable consent timestamp/version;
- keep farmer identities and re-identification keys out of AgriBridge; redact uploaded evidence;
- limit staff membership, review access logs, use MFA where available, make backups and test restoration;
- maintain an incident-response process and a way for farmers to request correction, withdrawal and deletion.

Organisation administrators can delete a farmer profile; the implemented deletion removes linked uploaded files and scheme tracker entries. This does not replace a complete legal retention and grievance process.

Review the current Digital Personal Data Protection Act/Rules notifications and obtain qualified advice. The commencement provisions are phased; do not treat a future effective date as permission to collect excessive or unprotected information. Official MeitY references are linked in `NGO_PRIVACY_NOTICE.md`.

## 10. Test before opening membership

Use dummy information only:
- Submit one test NGO application and confirm the public status endpoint accepts its code/token.
- Sign in as a listed platform administrator and approve the test application.
- Sign in as the test organisation admin; confirm the organisation name and role are shown.
- Create a dummy farmer profile in the same State/district as an active test scheme; confirm it returns potential matches.
- Upload a dummy PDF or image; confirm it is private and requires authorised Access to download.
- Add a scheme to the manual tracker, update its status and verify that another organisation cannot see it.
- Confirm that an unprovisioned email receives 403, an editor cannot delete profiles, and a viewer cannot write.
- Delete the dummy farmer profile and confirm its linked files and tracker entries are removed.

## 11. Implemented endpoints

| Endpoint | Purpose | Access |
|---|---|---|
| `GET /api/ngo-join` | Public join-form config | Public |
| `POST /api/ngo-join` | Submit membership application | Turnstile + rate limit |
| `POST /api/ngo-join-status` | Check with application code and private token | Private token |
| `GET /api/ngo/admin/applications` | List pending membership requests | Platform admin |
| `PATCH /api/ngo/admin/applications/:id` | Approve/reject/request more information | Platform admin |
| `GET /api/ngo/login` | Access sign-in return route | Cloudflare Access |
| `GET /api/ngo/farmers`, `POST /api/ngo/farmers` | List/create pseudonymous profiles | NGO member / admin or editor for create |
| `DELETE /api/ngo/farmers/:id` | Delete profile and linked records/files | Organisation admin |
| `GET/POST /api/ngo/farmers/:id/documents` | List/upload private supporting files | NGO member / admin or editor for upload |
| `GET/PATCH/DELETE /api/ngo/documents/:id` | Download, review or delete private files | Admin/editor for download; admin for review/delete |
| `GET/POST /api/ngo/scheme-applications` | List/create manual scheme tracker records | NGO member / admin or editor for create |
| `PATCH /api/ngo/scheme-applications/:id` | Update manual application progress | Admin/editor |
| `GET /api/ngo/workspace` | Organisation metrics and follow-ups | NGO member |
| `PUT /api/ngo/metrics`, `POST /api/ngo/followups` | Update aggregate metrics / activity references | Admin/editor |

Last updated: 7 November 2026.
