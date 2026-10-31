# Indian Agri Market & Loans

> **Public portal:** [https://indian-agri-loans.pages.dev/](https://indian-agri-loans.pages.dev/)

This repository publishes a free-to-access, public information directory for farmers. Visitors can open the portal without a GitHub account. The GitHub repository is public and the live public site is hosted on Cloudflare Pages. GitHub Pages remains available as a backup.


A static, Cloudflare Pages-hosted and GitHub Pages-compatible directory for discovering farmer grants, subsidies, crop insurance, cooperative loans, private-bank finance and market-access resources across India.

> **Repository slug:** `Indian-Agri-Loans` (GitHub repository names cannot contain spaces). The product title shown in the interface remains **Indian Agri Market and Loans**.

## Current release status

This is a source-linked national starter catalogue with explicit geographic and verification gaps. It is not an exhaustive verified inventory of every State, district, block, Panchayat, PACS, bank branch, lending product or local grant in India.

- **National records:** 31 scheme/benefit/service records, including PM-KISAN, KCC, AIF, PMFBY, MUDRA, SMAM 2026–27, PDMC, PM-KUSUM, MIDH, AMI, FPO formation support, NLM-EDP, PM-MKSSY, FIDF, PM-AASHA, PM-KMY and Soil Health Card.
- **West Bengal records:** Krishak Bandhu, death benefit, rainfed diversification (including Paschim Medinipur), women SHG interest support (including Paschim Medinipur), cooperative credit, farm mechanisation and Amar Fasal Amar Gola.
- **Lender catalogue:** 46 initial product entries (including 28 individually listed Regional Rural Banks, cooperative-credit routes and an NBFC-MFI microcredit product): 8 public-sector-bank product families, 3 private banks, 2 Small Finance Banks, 28 Regional Rural Banks, 2 cooperative-credit routes and 3 NBFC products. These include SBI, Bank of Baroda, Canara Bank, PNB, Bank of India, Bank of Maharashtra, Indian Bank, UCO Bank, HDFC Bank, ICICI Bank, Axis Bank, Ujjivan SFB, ESAF SFB, Mahindra Finance and Samunnati Finance. Each entry links to product terms, application route, typical documents, process and source material.
- **Panchayat / block:** a last-mile navigation entry explains how to find local notices and implementing offices; it is not represented as a uniform Panchayat loan or grant.
- **Formal rural channels:** RRBs, cooperative banks/PACS, public/private banks and regulated NBFC/MFI routes are identified separately. “Semi-private” is not treated as one legal lender category.
- **Informal finance:** described as a risk category, not recommended or represented as an approved scheme.
- **Other States/UTs:** all 36 State/UTs have portal links and a structured coverage row. State-specific inventories are marked portal-linked/research-pending unless source-linked records exist. The current State-specific scheme records are concentrated in West Bengal; this is not an all-India State-scheme inventory.

## Public portal

**Open the live portal:** https://indian-agri-loans.pages.dev/

No sign-in is required to browse the public directory. Farmers can:
1. Select their State/UT and District on the Finance Finder page.
2. Filter programme records by farmer profile, support type and programme delivery level.
3. Open **Schemes & Lenders** for bank, RRB, cooperative, Small Finance Bank and NBFC product details, typical documents, application steps and official links.
4. Open **Market Access** for official mandi, e-trading, procurement and FPO resources.
5. Verify live scheme windows and lending terms with the implementing department or lender before applying.

The portal is an independent information directory, not a government website, bank, lender, broker, application authority or eligibility decision service. It does not collect applications, Aadhaar, bank account information, passwords, OTPs or personal financial data. Applications are submitted only through the linked official provider channels.

To report an inaccurate or outdated listing, use the repository's **Issues** tab and include the State, District, record name and official source URL. Please do not post personal documents or sensitive financial information.

## Features

- State → District selector, 36 States and Union Territories.
- District list loaded from a public JSON directory with a bundled fallback covering 36 States/UTs and 779 district entries.
- Filter by farmer profile, support type and provider/delivery level (central/state government, public/private bank, small finance bank, RRB, cooperative/PACS, regulated NBFC and Panchayat/block access).
- A dedicated **Schemes & Lenders** second page contains the location-filtered scheme catalogue, separate lender catalogue, process/document detail panels, and State/District portal cards.
- The last-mile access panel refreshes when either State or District changes. State portals come from an official State Agriculture Department link directory; directly mapped West Bengal district websites are individually linked. When a direct district host is not verified, the page opens the official Government of India district-website directory instead of guessing a URL.
- Individual detail panels with amount/loan quantum, eligibility, application steps, links and caveats.
- Dedicated market-access section linking to Agmarknet, e-NAM, MSP information and SFAC.
- Coverage tracker that distinguishes verified records from unresearched areas.
- Responsive layout; no build step or package install required.

## Run locally

Use a local web server (do not open `index.html` as a `file://` URL, because browser fetch restrictions can block JSON loading).

```bash
python -m http.server 8000
```

Open `http://localhost:8000` from this folder.

## Publish to GitHub Pages

The repository is already created and the static-site workflow is included at `.github/workflows/pages.yml`.

1. Open this repository on GitHub: https://github.com/Axis591/Indian-Agri-Loans
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Open the **Actions** tab and select **Deploy to GitHub Pages**. If the workflow has not started automatically, choose **Run workflow**.
5. Wait for the workflow to finish with a green check. Then return to **Settings → Pages**; GitHub displays the live website URL there.

Every push to `main` will trigger a new deployment.

## Data model

Each record in `schemes.json` contains:

- `id`, `name`, `type`, `category`, `providerKinds`
- `scope`: `national`, `state`, `district` or `local`
- `states`, `districts`, `profiles`
- `amount`, `amountNote`, `amountStatus`
- `summary`, `eligibility`, `process[]`
- `application`, `source`, `sourceLabel`, `sourceDate`, `caution`

A record should not be added as `verified` without a direct official source, the relevant state/district/season scope, a current application route and a date of review. Amounts that depend on bank appraisal must be `assessment`; amounts not stated in an official source must be `not_published`.

## District directory

The district selector attempts to load `CodingMation/indian-states-districts` JSON at runtime. A local fallback and the `coverage-v25.json` register contain 36 State/UTs and 779 community-snapshot district entries. This is not an official dataset and is not yet reconciled to the current Government of India's Local Government Directory (LGD). Block, village and Gram Panchayat identifiers are not yet loaded.

Official LGD catalogue: https://data.gov.in/catalog/local-government-directory-lgd

## Data safety rules

- This project is not a lender, broker, government portal or eligibility checker.
- A grant is not described as a loan; insurance is not described as a grant; interest subvention is not described as cash paid directly to a farmer.
- No fixed loan cap or rate is invented where the lender calculates it from scale of finance, collateral, project appraisal or credit assessment.
- Informal/unregulated lending is not endorsed. Check licensing, obtain written terms, and compare institutional credit first.
- Always re-check current scheme guidelines, district crop notifications, application windows and bank circulars before applying.

## Contributing state and district records

Use `CONTRIBUTING.md` and the source register in `SOURCES.md`. Priority order: official ministry/department notification, scheme portal, state department, district lead bank/cooperative department, regulator and authorised lender product page. Add a source date and a clear caveat whenever the public page does not disclose a rupee limit.


## Additional data files

- `portals.json`: State/UT department, application, cooperative, Panchayat/local-government and district-website routes. Includes all 36 State/UT names. State Agriculture Department links are sourced from APEDA FarmerConnect's official Useful Links directory. Verified West Bengal district websites are mapped directly; other district websites open India.gov's official district directory until the specific host is checked.
- `lenders.json`: 46 bank/SFB/RRB/cooperative/NBFC product or institution entries. Each row stores product scope, borrower segment, amount/pricing note, terms, documents, application steps, official product sources, pricing-refresh status and district-branch verification caveat.
- Lender-category filtering applies to the lender catalogue; scheme type filtering applies to scheme records. A national lender's product page does not prove the bank has a branch in every district.

## Lender catalogue limitations

This is a verified-source starter directory, not every lending product, branch or NBFC in India. Products marked “bank assessed” do not have a universal published cap/rate. Some products are limited to FPOs, SHGs, existing KCC holders, machinery purchasers or allied activities; they must not be presented as an unrestricted individual crop loan. Confirm current APR, processing fees, collateral, repayment schedule, service area and Key Fact Statement directly with the lender.


### Regional Rural Banks and cooperative channels

The official Department of Financial Services list currently identifies 28 Regional Rural Banks and publishes each bank's official website. `portals.json` maps these RRBs to the corresponding State/UT; `lenders.json` carries an individual KCC/agriculture-credit entry for each. Where a State/UT does not have an RRB in the official list, the application routes to the national Kisan Rin Portal instead.

The cooperative catalogue separates the national State Cooperative Bank → DCCB → PACS structure from the West Bengal cooperative credit route. PACS membership, financing DCCB, district crop Scale of Finance and actual loan windows must be checked locally.


## AgriBridge V2 — Farmer assistance and NGO pilot

- **Find My Support:** a browser-side eligibility shortlist that uses selected State/District, applicant type, land/cultivation status, activity and support need. It returns potential scheme records and profile-matched bank/RRB/cooperative/SFB/NBFC product leads only; it is not an official eligibility decision or approval.
- **Document checklists:** scheme-specific documents and source/verification notes appear in scheme detail panels and eligibility results. The latest official notice takes precedence.
- **NGO Connect (pilot):** local aggregate project metrics and anonymised internal follow-up references. Data is saved only in the current browser using local storage; there is no organisation login, shared database or cloud synchronisation.
- **Privacy guardrail:** never enter farmer names, mobile numbers, Aadhaar, bank details, OTPs, passwords or identity-document scans in the NGO pilot. Live multi-user case management requires a secure authenticated backend, organisation-level permissions, consent records, encrypted storage, audit logging, retention/deletion controls and a privacy review.
- **Eligibility matching limitations:** the assistant filters the current 31 scheme/benefit records using declared profile, location, activity and support tags. It cannot verify a farmer's full legal/financial circumstances, current crop notification, bank credit appraisal, local beneficiary target or application window. Final checks remain with the implementing authority or lender.
- **Live public portal:** https://indian-agri-loans.pages.dev/

### Verification states

- **Official source checked:** the primary portal/guidance was checked on the date shown in the record. This does not mean every district window is open.
- **Source linked — recheck current rules:** a primary source is linked, but the latest local notification or operational circular has not been independently checked for every jurisdiction.
- **Seasonal / local verification required:** crop, district, season, block target, local PACS or lender branch must be confirmed before applying.

V2.5 adds source-checked national programme records with component, State-window and project-approval caveats. PMFME and AHIDF are visible as legacy/extension-unconfirmed records and excluded from eligibility matching. A record review date does not mean every district window, procurement operation or lender branch is open.

## AgriBridge V2.5 — all-India parallel release

V2.5 advances two equal-priority workstreams in one national catalogue:

- **Farmer benefits and programmes:** grants, direct benefits, subsidies, crop insurance, pensions, price support, agricultural infrastructure, horticulture, irrigation, mechanisation, livestock, fisheries and soil services.
- **Agricultural finance:** public-sector and private banks, Small Finance Banks, Regional Rural Banks, cooperative/PACS routes and regulated NBFC products.

### V2.5 catalogue contents

- 31 scheme/benefit/service records, including 14 additional national programme/status records added for this release.
- 46 lender/provider entries: 8 public-bank product families, 3 private banks, 2 Small Finance Banks, 28 individually listed Regional Rural Banks, 2 cooperative-credit routes and 3 NBFC products.
- 36 State/UT portal records and a 779-entry community-maintained district snapshot.
- 22 direct West Bengal district website mappings; other districts use the Government of India's official district website directory as a discovery route.
- A machine-readable `coverage-v25.json` register distinguishing State portal links, State-specific records, district-specific programme records, RRB listing, local branch status and block/Panchayat research gaps.

### Important programme status distinctions

- SMAM 2026–27, PDMC and PM-KUSUM are State/UT implementation and application-window dependent.
- MIDH and AMI are component/project-based; the displayed rates are not blanket cash payments to every farmer.
- FPO scheme support is routed through eligible FPOs and designated Implementing Agencies/CBBOs, not paid as a universal individual-farmer grant.
- NLM-EDP is a project-based capital-subsidy route with component ceilings, State screening and bank/own-contribution requirements.
- PM-MKSSY and FIDF are fisheries-specific components and project/participant conditions apply.
- PM-AASHA is a notified procurement/price-support mechanism, not a direct grant to every farmer.
- PM-KMY is a voluntary contributory pension, not immediate grant assistance.
- PMFME and AHIDF remain visible for historical reference, but no FY 2026–27 extension was verified in this release; both are excluded from the eligibility matcher.
- KCC wording distinguishes the DFS page's current description of up to ₹3 lakh from the Budget announcement of a ₹5 lakh Modified Interest Subvention Scheme ceiling enhancement. The latter is not represented as a guaranteed universal KCC limit; confirm the operative circular and the bank's written sanction.

### Geographic coverage limitations

- The 36 State/UT portal register is not the same as 36 completed State scheme inventories.
- Only West Bengal currently has State-specific scheme records in this catalogue (six State-scope records plus one district-scope programme record covering six named districts). Other State/UT scheme inventories remain portal-linked/research-pending.
- The 779 district entries are a community-maintained fallback snapshot, not an LGD-certified current district list. Official LGD reconciliation is outstanding.
- Direct district websites are mapped for 22 West Bengal districts. Kolkata and districts outside that mapped set use the India.gov official district directory.
- The 28 RRB institutions are mapped from the Department of Financial Services list. A State-level RRB listing does not prove a branch exists in every district.
- District branches, PACS/DCCBs, SHG federations, BDOs, Gram Panchayats, village-level targets and money-lending licences are not comprehensively inventoried.

### Repeatable quality checks

- `DATA_DICTIONARY.md` documents the scheme, lender, portal, geography and coverage-register fields.
- `COVERAGE_REPORT_V25.md` explains the current national coverage and research gaps.
- `scripts/validate-v25.mjs` validates unique IDs, required metadata, source URLs, State/UT names, RRB mappings and catalogue/coverage counts.
- `.github/workflows/validate-v25.yml` runs the validation script on pushes and pull requests.