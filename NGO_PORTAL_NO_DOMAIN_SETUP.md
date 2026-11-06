# AgriBridge NGO Helping Hand — No-Custom-Domain Cloudflare Setup

**Architecture:** two Cloudflare Pages projects in one GitHub repository.  
**Public project:** `indian-agri-loans` → `https://indian-agri-loans.pages.dev`  
**Secure portal project:** `agribridge-ngo-portal` → `https://agribridge-ngo-portal.pages.dev`

This approach does **not** require buying or attaching a custom domain. It keeps the public scheme directory public and protects the separate NGO portal's complete `pages.dev` hostname with Cloudflare Access.

## Why there are two Pages projects

Cloudflare Pages' supported Access setup for a `pages.dev` hostname protects that project's hostname. Applying it to the existing public project would put the public AgriBridge site behind login. Do not enable Access on `indian-agri-loans`.

Instead, this repository now contains a second self-contained Pages application in `ngo-portal/`. The secure portal uses the same D1 database and private R2 bucket, but its own Pages hostname and Access audience. The public project remains open and continues to accept NGO membership applications through Turnstile.

Official Cloudflare guidance: [Pages Access on pages.dev](https://developers.cloudflare.com/pages/platform/known-issues/), [Pages monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/).

## Step 1 — Create the second Cloudflare Pages project

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages**.
3. Select **Create application → Pages → Connect to Git**.
4. Choose GitHub and select `Axis591/Indian-Agri-Loans`.
5. Choose these build settings:

| Setting | Exact value |
|---|---|
| Project name | `agribridge-ngo-portal` |
| Production branch | `main` |
| Framework preset | None |
| Root directory (Advanced) | `ngo-portal` |
| Build command | `exit 0` |
| Build output directory | `.` |

6. Select **Save and Deploy**.
7. Wait for the first deployment to succeed. The expected address is `https://agribridge-ngo-portal.pages.dev`.

If Cloudflare says the project name is already taken, choose another unique project name and tell the site owner; the public website's portal link must then be updated to that exact hostname before inviting NGOs.

Cloudflare allows multiple Pages projects to use the same GitHub repository with separate root directories. The repository is within Cloudflare Pages' default five-project-per-repository limit. <https://developers.cloudflare.com/pages/configuration/monorepos/>

## Step 2 — Add the existing D1 and R2 bindings to the secure portal

Open:

**Workers & Pages → agribridge-ngo-portal → Settings → Bindings**

Add these in the **Production** environment:

| Binding type | Variable name | Existing resource to select |
|---|---|---|
| D1 database | `NGO_DB` | `agribridge-ngo` |
| R2 bucket | `NGO_DOCS` | `agribridge-ngo-private-doc` |

Use the already-created resources. Do not create another D1 database, another migration set, or another R2 bucket.

Save the bindings. The next deployment will make them available to the portal's Pages Functions.

Do not attach a public domain to the R2 bucket or enable its public access. Farmer evidence is served only through authenticated Functions.

## Step 3 — Enable Cloudflare One-Time PIN authentication

1. In Cloudflare Dashboard, open **Zero Trust**.
2. Open **Settings → Authentication** (or **Integrations → Identity providers**, depending on the dashboard navigation).
3. Add/enable **One-time PIN**.
4. Save.

This lets an approved NGO user authenticate with a verified email address. Cloudflare Access performs the login; the portal backend separately checks whether that email is provisioned in the organisation membership table.

Cloudflare guide: <https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/>.

## Step 4 — Protect the secure portal's pages.dev hostname

Do this on the **agribridge-ngo-portal** Pages project only.

1. Open **Workers & Pages → agribridge-ngo-portal → Settings → General**.
2. Enable the Pages **Access policy** for preview deployments if it is not already enabled. Cloudflare will create an Access application for preview URLs.
3. Open **Zero Trust → Access controls → Applications**.
4. Open the Access application created for `agribridge-ngo-portal`.
5. Select **Configure / Edit**.
6. Under its public hostname, set the production hostname to the exact Pages subdomain:
   - Subdomain: `agribridge-ngo-portal`
   - Domain: `pages.dev`
   - Path: empty (protect the entire secure portal project)
7. If Cloudflare initially displays a wildcard subdomain (`*`), remove the wildcard and save the exact production hostname. Give the application a distinct name if Cloudflare reports a duplicate name.
8. Return to the Pages project Settings → General and ensure the preview Access policy is still enabled. Cloudflare's Pages guidance recommends separate production-hostname and preview-hostname policies; verify both appear in Zero Trust → Applications.

**Do not apply this Access policy to `indian-agri-loans.pages.dev`.** That is the public AgriBridge site.

Cloudflare's Pages-specific instructions: <https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain>.

## Step 5 — Configure the Access policy

Open the Access application for `agribridge-ngo-portal.pages.dev`.

1. Enable **One-time PIN** as the identity provider.
2. Add an **Allow** policy.
3. Use **Everyone** as the Include rule (all visitors must still complete email verification).
4. Do not add a Bypass policy.
5. A session duration such as 8 hours is a reasonable starting point.

Why Everyone? Access decides who can reach the portal login session. AgriBridge's backend performs the actual authorisation:
- NGO members must have an active row in `ngo_users`; otherwise APIs return 403.
- Platform administrators must additionally match `NGO_PLATFORM_ADMIN_EMAILS`.
- Organisation records and farmer data remain scoped to the authenticated `org_id`.
- Admin/editor/viewer roles are enforced by the API.

Do not put only the platform administrator email in the Access Allow policy. That would prevent other approved NGO staff from signing in.

After creating the Access application, copy its **Application Audience (AUD) tag**. This is the portal-specific audience; do not substitute the team domain or application name.

## Step 6 — Set the secure portal Production variables

Open:

**Workers & Pages → agribridge-ngo-portal → Settings → Variables and Secrets → Production**

Add:

| Name | Type | Value |
|---|---|---|
| `ACCESS_TEAM_DOMAIN` | Variable | Your actual Zero Trust team domain, e.g. `https://<team>.cloudflareaccess.com` |
| `ACCESS_AUD` | Variable | Exact AUD tag from the portal Access application |
| `NGO_PLATFORM_ADMIN_EMAILS` | Secret recommended | The platform administrator's verified email; multiple emails may be comma/semicolon separated |

Save and redeploy the portal project.

The portal's `ACCESS_AUD` must match the Access application protecting **this portal hostname**. This is a different Pages project and has its own Access application audience.

Do not paste any secret into GitHub or chat.

## Step 7 — Keep the existing public AgriBridge project configured

Do **not** add Access to the original public Pages project.

Open:

**Workers & Pages → indian-agri-loans → Settings → Bindings / Variables and Secrets**

Confirm the original public project still has these Production bindings:

| Binding | Resource |
|---|---|
| `NGO_DB` | `agribridge-ngo` |
| `NGO_DOCS` | `agribridge-ngo-private-doc` |

The public membership form needs these Production variables/secrets:

| Name | Type |
|---|---|
| `NGO_PLATFORM_ADMIN_EMAILS` | Secret recommended |
| `NGO_JOIN_TURNSTILE_SITE_KEY` | Variable |
| `NGO_JOIN_TURNSTILE_SECRET` | Secret |
| `NGO_JOIN_RATE_LIMIT_SALT` | Secret |

The public join form does **not** need Cloudflare Access variables. Its public config endpoint checks that the D1 migration, private R2 binding, platform administrator allowlist, Turnstile keys and rate-limit salt are present before enabling organisation applications. The separate portal alone uses `ACCESS_TEAM_DOMAIN` and its own `ACCESS_AUD`.

The Turnstile sitekey/secret must be for the public hostname `indian-agri-loans.pages.dev`. Keep the secret private. Generate the rate-limit salt locally with `openssl rand -hex 32`.

## Step 8 — Deploy and test both projects

Each Pages project is connected to the same repository. A push to `main` triggers a build for both projects unless build-watch paths are configured.

Test in this order:

1. Open `https://indian-agri-loans.pages.dev` in a private/incognito window. It must remain public and must not show a Cloudflare Access login.
2. Open `https://indian-agri-loans.pages.dev/api/ngo-join`. After all public-project settings are configured, it should return JSON with `enabled: true` and a Turnstile sitekey.
3. Open `https://agribridge-ngo-portal.pages.dev`. It should show Cloudflare Access email One-time PIN login.
4. Sign in as the platform administrator. Open **Platform administrator review**. The signed-in email must match `NGO_PLATFORM_ADMIN_EMAILS`.
5. Approve a test organisation application. The approved contact email is provisioned as that organisation's first admin.
6. Sign in with the approved NGO email. The portal should show its organisation name and role.
7. Create a dummy pseudonymous farmer case, check its scheme suggestions, upload a redacted test file, and add a manual application tracker record.
8. Confirm that a non-provisioned email can authenticate at Access but receives an AgriBridge 403 response; it must not see another organisation's records.
9. Test with dummy data only until the privacy notice, retention policy, privacy/grievance contact and document handling procedures have been completed.

## Important operational notes

- The D1 database and R2 bucket are shared; there is only one source of organisation/farmer data.
- Both Pages projects need their own bindings and environment variables; bindings do not automatically carry over from one Pages project to another.
- The public site contains the public NGO application and application-status form. The Access-protected portal contains the member workspace and administrator review queue.
- The portal is marked `noindex` and uses an Access-protected `pages.dev` hostname. Do not share its URL as a public resource.
- Uploaded documents are redacted PDF/PNG/JPEG evidence stored in private R2. No OCR, automatic eligibility certification or malware scanning is included.
- Keep preview deployments protected. Do not bind production farmer data to a public preview deployment.
- Do not enable Access on the public project until you intentionally want to restrict the entire public website.

Last updated: 7 November 2026.
