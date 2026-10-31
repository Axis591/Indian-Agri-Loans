# Indian Agri Market & Loans

A static, GitHub Pages-ready directory for discovering farmer grants, subsidies, crop insurance, cooperative loans, private-bank finance and market-access resources across India.

> **Repository slug:** `Indian-Agri-Loans` (GitHub repository names cannot contain spaces). The product title shown in the interface remains **Indian Agri Market and Loans**.

## Current release status

This is a source-linked starter release, not yet an exhaustive verified catalogue of every state, district, block, Panchayat, PACS, bank branch, lending product or local grant in India.

- **National records:** PM-KISAN, KCC, Agriculture Infrastructure Fund, PMFBY and MUDRA allied-enterprise credit.
- **West Bengal records:** Krishak Bandhu, death benefit, rainfed diversification (including Paschim Medinipur), women SHG interest support (including Paschim Medinipur), cooperative credit, farm mechanisation and Amar Fasal Amar Gola.
- **Private finance:** HDFC Bank and ICICI Bank agri/allied lending pages are linked. Loan amounts and rates are marked bank-assessed where there is no universal published cap.
- **Panchayat / block:** a last-mile navigation entry explains how to find local notices and implementing offices; it is not represented as a uniform Panchayat loan or grant.
- **Formal rural channels:** RRBs, cooperative banks/PACS, public/private banks and regulated NBFC/MFI routes are identified separately. “Semi-private” is not treated as one legal lender category.
- **Informal finance:** described as a risk category, not recommended or represented as an approved scheme.
- **Other States/UTs:** national programmes are shown. State-specific and district-specific records are explicitly marked as research pending rather than fabricated.

## Features

- State → District selector, 36 States and Union Territories.
- District list loaded from a public JSON directory with a bundled fallback covering 36 States/UTs and 779 district entries.
- Filter by farmer profile, support type and provider/delivery level (central/state government, public/private bank, RRB, cooperative/PACS, regulated NBFC/MFI/SFB and Panchayat/block access).
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

The district selector attempts to load `CodingMation/indian-states-districts` JSON at runtime. A complete local fallback is also bundled in `geography-fallback.json` (36 States/UTs and 779 district entries in the bundled snapshot). This is a community dataset, not an official government source; verify administrative changes against the Government of India's Local Government Directory (LGD).

Official LGD catalogue: https://data.gov.in/catalog/local-government-directory-lgd

## Data safety rules

- This project is not a lender, broker, government portal or eligibility checker.
- A grant is not described as a loan; insurance is not described as a grant; interest subvention is not described as cash paid directly to a farmer.
- No fixed loan cap or rate is invented where the lender calculates it from scale of finance, collateral, project appraisal or credit assessment.
- Informal/unregulated lending is not endorsed. Check licensing, obtain written terms, and compare institutional credit first.
- Always re-check current scheme guidelines, district crop notifications, application windows and bank circulars before applying.

## Contributing state and district records

Use `CONTRIBUTING.md` and the source register in `SOURCES.md`. Priority order: official ministry/department notification, scheme portal, state department, district lead bank/cooperative department, regulator and authorised lender product page. Add a source date and a clear caveat whenever the public page does not disclose a rupee limit.
