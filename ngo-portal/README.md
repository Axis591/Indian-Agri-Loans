# AgriBridge NGO Helping Hand — Separate Access-Protected Pages Project

This directory is deployed as a **second Cloudflare Pages project** so the NGO workspace can be protected by Cloudflare Access without placing the public AgriBridge website behind a login.

## Cloudflare Pages project settings

| Setting | Value |
|---|---|
| Project name | `agribridge-ngo-portal` |
| GitHub repository | `Axis591/Indian-Agri-Loans` |
| Production branch | `main` |
| Root directory | `ngo-portal` |
| Build command | `exit 0` |
| Build output directory | `.` |
| Production URL | `https://agribridge-ngo-portal.pages.dev` |

The portal is a same-origin Pages application. Its browser calls its own Pages Functions, so Access cookies and `Cf-Access-Jwt-Assertion` stay first-party and do not need cross-origin browser requests.

## Required Production bindings

| Type | Binding name | Existing resource |
|---|---|---|
| D1 database | `NGO_DB` | `agribridge-ngo` |
| R2 bucket | `NGO_DOCS` | `agribridge-ngo-private-doc` |

Bind the existing resources; do not create a second D1 database or R2 bucket.

## Required Production variables

| Variable | Value |
|---|---|
| `ACCESS_TEAM_DOMAIN` | Exact Cloudflare Zero Trust team domain, e.g. `https://<team>.cloudflareaccess.com` |
| `ACCESS_AUD` | Application Audience (AUD) tag for the **portal Pages Access application** |
| `NGO_PLATFORM_ADMIN_EMAILS` | Comma/semicolon-separated platform administrator email allowlist |

The portal Access application's AUD is distinct from any other Access application. Copy the AUD from the application created for this Pages project.

For the **public** AgriBridge project, keep the existing D1/R2 bindings and configure the public join form variables: `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` (presence/readiness only for the public join endpoint), `NGO_PLATFORM_ADMIN_EMAILS`, `NGO_JOIN_TURNSTILE_SITE_KEY`, `NGO_JOIN_TURNSTILE_SECRET`, and `NGO_JOIN_RATE_LIMIT_SALT`.

## Cloudflare Access

1. Create the Pages project above and deploy it once.
2. In this Pages project's **Settings → General**, enable the Access policy for preview deployments.
3. In **Zero Trust → Access → Applications**, open the Pages preview Access application created for this project.
4. Configure its production hostname: use the exact `agribridge-ngo-portal.pages.dev` hostname (remove the wildcard subdomain if Cloudflare initially shows one).
5. Ensure the preview wildcard application is also protected. Do not leave preview URLs publicly accessible.
6. Enable **One-time PIN** as an identity provider.
7. Configure an **Allow / Everyone** policy for the Access login layer. This means anyone may verify an email to reach the portal shell; it does **not** grant NGO data access. The API then checks the verified email against `ngo_users`, and the administrator review API additionally checks `NGO_PLATFORM_ADMIN_EMAILS`.
8. Copy the portal Access application's AUD tag into this Pages project's `ACCESS_AUD` variable, then redeploy.

Do **not** enable Access on the original public Pages project. Cloudflare Pages Access protection applies to the Pages hostname; using it on the public project would put the public AgriBridge site behind login too.

Official Cloudflare instructions: [Enable Access on a Pages `pages.dev` hostname](https://developers.cloudflare.com/pages/platform/known-issues/), [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/), [One-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/).

## Public/secure split

- Public site: `https://indian-agri-loans.pages.dev`. Public scheme directory, NGO membership application and private application status lookup.
- Secure NGO portal: `https://agribridge-ngo-portal.pages.dev`. Cloudflare Access login, administrator queue, organisation workspace, farmer data, private documents and manual scheme tracker.

The public site links approved NGO members to the secure portal. The secure portal uses the copied Pages Functions and the same D1/R2 resources.

## Data and privacy

Farmer profiles remain pseudonymous and organisation-scoped. Do not store farmer names, phone numbers, Aadhaar, PAN, bank details or OTPs. Supporting documents must be redacted. Files are stored in private R2 and are not OCR-processed or automatically verified. Review `NGO_PRIVACY_NOTICE.md` and complete its privacy/grievance/retention requirements before using live farmer data.

## Deployment notes

A commit to `main` triggers deployment for both Pages projects when each project is connected to this repository. The main project's root directory stays at the repository root; the NGO portal project uses root directory `ngo-portal`. Each project has its own environment variables, secrets, bindings and Access application.
