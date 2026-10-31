# Indian Agri Market & Loans

> **Public portal:** [https://axis591.github.io/Indian-Agri-Loans/](https://axis591.github.io/Indian-Agri-Loans/)

This repository publishes a free-to-access, public information directory for farmers. Visitors can open the portal without a GitHub account. The GitHub repository is public and the site is deployed through GitHub Pages.


A static, GitHub Pages-ready directory for discovering farmer grants, subsidies, crop insurance, cooperative loans, private-bank finance and market-access resources across India.

> **Repository slug:** `Indian-Agri-Loans` (GitHub repository names cannot contain spaces). The product title shown in the interface remains **Indian Agri Market and Loans**.

## Current release status

This is a source-linked starter release, not yet an exhaustive verified catalogue of every state, district, block, Panchayat, PACS, bank branch, lending product or local grant in India.

- **National records:** PM-KISAN, KCC, Agriculture Infrastructure Fund, PMFBY and MUDRA allied-enterprise credit.
- **West Bengal records:** Krishak Bandhu, death benefit, rainfed diversification (including Paschim Medinipur), women SHG interest support (including Paschim Medinipur), cooperative credit, farm mechanisation and Amar Fasal Amar Gola.
- **Lender catalogue:** 46 initial product entries (including 28 individually listed Regional Rural Banks, cooperative-credit routes and an NBFC-MFI microcredit product): 8 public-sector-bank product families, 3 private banks, 2 Small Finance Banks, 28 Regional Rural Banks, 2 cooperative-credit routes and 3 NBFC products. These include SBI, Bank of Baroda, Canara Bank, PNB, Bank of India, Bank of Maharashtra, Indian Bank, UCO Bank, HDFC Bank, ICICI Bank, Axis Bank, Ujjivan SFB, ESAF SFB, Mahindra Finance and Samunnati Finance. Each entry links to product terms, application route, typical documents, process and source material.
- **Panchayat / block:** a last-mile navigation entry explains how to find local notices and implementing offices; it is not represented as a uniform Panchayat loan or grant.
- **Formal rural channels:** RRBs, cooperative banks/PACS, public/private banks and regulated NBFC/MFI routes are identified separately. “Semi-private” is not treated as one legal lender category.
- **Informal finance:** described as a risk category, not recommended or represented as an approved scheme.
- **Other States/UTs:** national programmes are shown. State-specific and district-specific records are explicitly marked as research pending rather than fabricated.

## Public portal

**Open the live portal:** https://axis591.github.io/Indian-Agri-Loans/

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


## Additional data files

- `portals.json`: State/UT department, application, cooperative, Panchayat/local-government and district-website routes. Includes all 36 State/UT names. State Agriculture Department links are sourced from APEDA FarmerConnect's official Useful Links directory. Verified West Bengal district websites are mapped directly; other district websites open India.gov's official district directory until the specific host is checked.
- `lenders.json`: 15 initial bank/SFB/NBFC products. Each row stores product scope, borrower segment, published or bank-assessed quantum, interest/pricing note, terms, documents, application steps, application URL, official product sources, availability note and caveats.
- Lender-category filtering applies to the lender catalogue; scheme type filtering applies to scheme records. A national lender's product page does not prove the bank has a branch in every district.

## Lender catalogue limitations

This is a verified-source starter directory, not every lending product, branch or NBFC in India. Products marked “bank assessed” do not have a universal published cap/rate. Some products are limited to FPOs, SHGs, existing KCC holders, machinery purchasers or allied activities; they must not be presented as an unrestricted individual crop loan. Confirm current APR, processing fees, collateral, repayment schedule, service area and Key Fact Statement directly with the lender.


### Regional Rural Banks and cooperative channels

The official Department of Financial Services list currently identifies 28 Regional Rural Banks and publishes each bank's official website. `portals.json` maps these RRBs to the corresponding State/UT; `lenders.json` carries an individual KCC/agriculture-credit entry for each. Where a State/UT does not have an RRB in the official list, the application routes to the national Kisan Rin Portal instead.

The cooperative catalogue separates the national State Cooperative Bank → DCCB → PACS structure from the West Bengal cooperative credit route. PACS membership, financing DCCB, district crop Scale of Finance and actual loan windows must be checked locally.
