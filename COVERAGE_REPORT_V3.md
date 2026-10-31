# AgriBridge V3 — Coverage and Data Quality Report

Release date: 31 October 2026

## Executive summary

V3 implements an all-India parallel catalogue strategy with equal priority for farmer benefits (grants, subsidies, insurance, pensions and public support) and agricultural finance (banks, RRBs, cooperatives, Small Finance Banks and NBFCs). The release improves national programme discovery and adds an explicit State/UT and district research register.

**This is a national starter catalogue, not a claim of complete all-India scheme or branch coverage.** The coverage register is designed to show gaps rather than implying that portal links equal researched opportunities.

## Catalogue counts

| Measure | V2.5 count | Interpretation |
|---|---:|---|
| Scheme / benefit / public-service records | 37 | Central and national records plus a limited West Bengal State/district set. |
| Lender / provider entries | 46 | 8 public-bank product families, 3 private banks, 2 Small Finance Banks, 28 RRBs, 2 cooperative-credit routes and 3 NBFC entries. |
| State / UT portal rows | 36 | Agriculture/scheme portal links are mapped; they are not full scheme inventories. |
| District snapshot entries | 779 | Community-maintained geography fallback; not reconciled to current official LGD codes. |
| Direct district website mappings | 22 | Mapped for West Bengal districts in this release. The India.gov directory is used as a discovery route elsewhere and for the unmapped Kolkata host. |
| State-scope scheme records | 12 | Across seven States/UTs: Andhra Pradesh, Assam, Maharashtra, Odisha, Rajasthan, Telangana and West Bengal. |
| District-scope programme records | 1 | West Bengal rainfed diversification programme. |
| Districts associated with a district-specific programme record | 6 | Paschim Medinipur, Purulia, Bankura, Jhargram, Birbhum and Paschim Bardhaman. |
| States/UTs with at least one State-specific scheme record | 7 of 36 | Twelve named State-scope records are source-linked; 29 State/UT scheme inventories remain research pending. |
| Individually listed Regional Rural Banks | 28 | Names, websites and sponsor-bank information are mapped from the DFS list. Local district branch presence remains unverified. |

## V3 State workstream status

All 36 State/UTs are tracked in `state-programme-register.json` against nine categories: income/DBT, crop production, mechanisation/irrigation, horticulture, livestock/fisheries, marketing/procurement, cooperative credit, tenant/landless/tribal inclusion and enterprise/infrastructure. Seven States/UTs have at least one named State record; the other 29 remain visibly research pending. This is a parallel research queue, not a claim that all State schemes have been audited.

## Scheme/benefit record mix

| Type | Records |
|---|---:|
| Grants / direct benefits | 4 |
| Loans / credit frameworks | 7 |
| Subsidies / interest support | 13 |
| Insurance | 1 |
| Informal-credit risk information | 1 |
| Institutional / public-service routes | 4 |
| Pension / social security | 1 |

Some records describe an application channel or public service rather than a direct payment. Programme amounts may represent loan limits, project cost norms, interest support, procurement prices or service parameters; read the individual amount note before applying.

## Newly added national records

| Record | Workstream | Current status/caveat |
|---|---|---|
| SMAM 2026–27 | Mechanisation subsidy | State Annual Action Plan, machine list, district target and application window required. |
| Per Drop More Crop | Irrigation subsidy | 55% / 45% assistance rates described by Government; eligible unit cost and State window control actual value. |
| PM-KUSUM | Solar pump / solarisation | Component, State agency, vendor, benchmark cost and tender window required. |
| MIDH / NHB | Horticulture / infrastructure | Component and project-specific norms; not a single national subsidy rate. |
| AMI / ISAM | Warehouse / rural market infrastructure | Credit-linked infrastructure support; beneficiary/project class and financing institution approval required. |
| 10,000 FPO scheme | FPO entity support | Management/equity/credit guarantee routes are for eligible FPOs via designated Implementing Agency/CBBO, not an individual cash grant. |
| NLM-EDP | Livestock/fodder enterprise | 50% capital subsidy up to eligible component ceiling; State screening, bank appraisal and milestone release apply. |
| PM-MKSSY | Fisheries incentives / insurance / credit | NFDP registration and component-specific eligibility required. |
| FIDF | Fisheries infrastructure finance | Project finance and interest-subvention through eligible channels; project appraisal required. |
| PM-AASHA | MSP procurement | Only notified commodity/State/season operations with registration and quality checks; not direct grant. |
| PM-KMY | Farmer pension | Voluntary contributory pension, not an immediate grant. |
| Soil Health Card | Soil testing service | Public service/advisory, not a cash benefit. |
| PMFME | Historical micro-food-processing support | Scheme period on linked State page ends 31 March 2026; no FY 2026–27 extension verified for V2.5. Excluded from eligibility matching. |
| AHIDF | Historical animal-husbandry infrastructure finance | Linked DAHD continuation material is through 31 March 2026; no post-period extension verified for V2.5. Excluded from eligibility matching. |

## Finance coverage

The lender catalogue includes eight public-sector-bank product families, three private banks, two Small Finance Banks, 28 individually listed Regional Rural Banks, two cooperative-credit routes and three NBFC products. The finance records contain product scope, eligible borrower segment, amount/rate disclosure note, terms, document checklist, application route and source links.

Important unresolved finance gaps:

- A bank/RRB website or product page is not evidence that a branch is present in every selected district.
- Current APR, processing/document fees, collateral, loan-to-value, repayment and Key Fact Statement must be reconfirmed with the lending institution.
- PACS membership, DCCB financing link, crop Scale of Finance and seasonal application window need local confirmation.
- Some products are only for FPOs, SHGs, JLGs, machinery purchasers, dairy/allied enterprises or qualifying JLG borrowers; they are not general crop KCC substitutes.
- NBFC and NBFC-MFI product pages must be checked against the current RBI register. Microcredit pricing should be compared with KCC/cooperative credit and borrower affordability.

## State / district coverage gaps

1. All 36 State/UT rows have agriculture portal links, but only West Bengal currently has six State-scope scheme records.
2. One district-scope programme record covers six West Bengal districts. No other district-specific programme inventories are complete in this release.
3. The bundled 779-district fallback is a community dataset, not an LGD-certified administrative list. It needs refresh and reconciliation using current LGD district/sub-district/village/local-body codes.
4. Direct district websites are mapped for 22 West Bengal districts. Other districts use the India.gov official district directory as a discovery route, not a claimed direct district portal.
5. Block/Gram Panchayat IDs and the actual BDO/Panchayat office inventory have not yet been loaded.
6. PACS, DCCBs, State Cooperative Banks, local bank branches, SHG federations, CSCs, KVK contacts and village-level application/beneficiary targets are not yet comprehensively inventoried.

## Quality controls implemented

- Every scheme record has a stable ID, release version, record class, source-verification status, amount-disclosure status, application status, process, document checklist and matching rules.
- Every lender record has source links, applicant matching rules, pricing reconfirmation status, local branch verification status and a last-reviewed date.
- Legacy/extension-unverified PMFME and AHIDF records are excluded from the eligibility assistant.
- KCC wording distinguishes the DFS page's current ₹3 lakh description from the Budget announcement of a ₹5 lakh interest-subvention ceiling enhancement; no automatic ₹5 lakh entitlement is claimed.
- The Coverage Explorer separates portal presence, State scheme records, district programme records, direct district websites, RRB listing and local branch/PACS/block verification.
- The validation script checks unique IDs, required fields, data counts, URLs, State/UT names, RRB mappings, legacy exclusions and coverage-register reconciliation.

## Next research waves

1. Reconcile all 36 State/UT and 779 district entries against the official Local Government Directory, then add sub-district, village and Gram Panchayat IDs.
2. Build a State-by-State scheme register in parallel, starting with official agriculture, horticulture, animal husbandry, fisheries, cooperation, tribal/welfare and rural-development orders.
3. Add district lead banks, RRB branches, DCCBs, StCBs, PACS names, CSCs, KVKs and BDO/Panchayat contacts with source and verification dates.
4. Add live/current mandi prices from official Agmarknet/Open Government Data sources with commodity, market, unit, date and modal/min/max fields.
5. Establish a recurring review process for application windows, scheme extensions, financial rates, lending fees and source links.

## Key official references

- Local Government Directory: https://lgdirectory.gov.in/
- Open Government Data — LGD catalogue: https://data.gov.in/catalog/local-government-directory-lgd
- Department of Financial Services — Agriculture Credit: https://financialservices.gov.in/agriculture-credit
- DFS — official list of Regional Rural Banks: https://financialservices.gov.in/list-rrbs-functioning-country
- Kisan Rin Portal: https://fasalrin.gov.in/
- myScheme: https://www.myscheme.gov.in/
- Agmarknet daily mandi price dataset: https://data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi

Last updated: 31 October 2026.

## V3 functionality and activation status

- **Loan Cost Comparator:** reducing-balance and flat-rate EMI estimates with upfront fees and an estimated annualised cash-flow APR. This is a calculator, not a lender quote/KFS.
- **Daily mandi intelligence:** Market Access requests daily AGMARKNET/OGD records through a Cloudflare Pages Function. It requires the OGD API key as a server-side secret. Prices are wholesale/min/modal records for the source arrival date, not real-time farm-gate offers.
- **Official LGD priority:** the app tries an enabled official LGD District API, then `lgd-geography.json` imported from official CSV exports, then the community fallback. The official import has not yet been committed in this release.
- **NGO workspace:** browser localStorage has been removed. Cloudflare Access JWT verification, D1 tables, org-scoped APIs, roles and audit events are committed. Secure NGO features remain disabled until the account owner configures D1 binding, Access application/team/AUD, and provisions approved members.
- **Pages Functions routing:** `_routes.json` limits invocations to `/api/*`, leaving the public static directory on the asset path.

## Official geography import gap

The current bundled geography fallback still contains 779 community-snapshot district entries. The Local Government Directory (LGD) District resource is a monthly dataset and OGD reported its latest update on 27 October 2026. The Local Bodies dataset page reports monthly Local Body codes but indicates that an API does not exist for that resource; official CSV export/import is therefore required for local-body codes. A district count from a community dataset is not treated as official LGD verification.

## Outstanding national research

- 29 State/UTs still have no named State-specific scheme records in the catalogue. Their portals are present and nine categories have a visible research queue, but State budgets, current operational guidelines, eligibility, district windows and actual benefits remain to be independently researched.
- No complete district-level branch/PACS/DCCB/CSC/KVK/BDO/Panchayat inventory is available. The finance entries remain product discovery routes, not branch confirmations.
- Use `CLOUDFLARE_SETUP_V3.md` to activate the server functions. Until the secrets and D1/Access bindings are configured, live mandi API and NGO cloud workspace routes report as not configured.
