# AgriBridge V2.5 — Data Dictionary

Release: 31 October 2026

This document defines the public catalogue files and the meaning of the fields used by the Finance Finder, Find My Support, Schemes & Lenders and Coverage Explorer.

## 1. schemes.json

One record represents a government programme, insurance/product route, public service or clearly labelled institutional/access/risk reference. It is not necessarily a farmer cash benefit.

| Field | Meaning |
|---|---|
| id | Stable unique record identifier. Do not change after publication without a migration. |
| name, category, summary | Public display name, support category and plain-language explanation. |
| type | grant, loan, subsidy, insurance, institution, informal or pension. This separates cash benefit, credit, cost support, cover and service routes. |
| scope | national, state, district or local. This is the geography level claimed by the record. |
| states | all or an explicit State/UT name array. |
| districts | all or explicit district names. For district-scope records this must be an explicit list. |
| providerKinds | Central/State government, public/private bank, SFB, RRB, cooperative, NBFC, local body or informal delivery category. |
| profiles | Broad applicant classes used to generate a potential shortlist. Not a full legal eligibility test. |
| amount | Human-readable amount, cap, percentage, formula or “not published”. |
| amountStatus | published, assessment, not_published, rate_support, unknown or variable. Describes the quality/type of the quantum, not approval. |
| amountNote / rate | Conditions, calculation basis, pricing, caps and caveats. |
| eligibility | Human-readable applicant and activity criteria. The current official guideline always takes precedence. |
| process | Ordered application/verification steps. |
| documents | Typical document checklist; not a substitute for the latest authority checklist. |
| application / applicationLabel | Official application or enquiry route and the link label. Some programme records point to a portal/authority rather than a live form. |
| source / sourceLabel / sources[] | Primary and additional source links and their labels. |
| sourceDate | Human-readable source review note. |
| verification.status / verification.lastChecked / verification.note | Provenance and what was actually checked. A checked source does not prove every local window is open. |
| sourceVerificationStatus | Normalised verification-status string used in reporting and validation. |
| programmeStatus / programmeStatusLabel / programmeStatusNote | Application status such as State-window required, project appraisal, pension enrolment, seasonal notification or extension unverified. |
| recordVersion / recordClass | Schema/release version and record family. |
| matchRules | Browser assistant filters: profiles, landStatus, activities, supportNeeds and mustVerify. |
| matchRules.excludeFromAssistant | When true, a record remains visible in the directory but is not suggested as a potential match. Used for legacy/extension-unverified programmes and inappropriate claim types. |

### Scheme types and interpretation

- **grant:** direct benefit/transfer or a grant-like scheme. Always read conditions; some programmes are not universal.
- **loan:** repayable finance; interest, collateral, tenure and final amount depend on the lender.
- **subsidy:** cost/interest support, often linked to approved expenditure, an eligible loan or inspection.
- **insurance:** risk cover; current crop, area, season, sum insured and enrolment deadline control availability.
- **institution:** a public service, procurement or access route; not automatically a cash benefit.
- **pension:** future social-security benefit that may require regular contributions.
- **informal:** risk information only. It is not promoted as a recommended or regulated loan product.

## 2. lenders.json

One record represents a lender institution and a named agricultural product/product family. The record is a discovery lead, not a loan offer or evidence that a branch serves every district.

| Field | Meaning |
|---|---|
| id, name, product | Stable product ID, institution name and named finance product/family. |
| providerKinds | public-bank, private-bank, small-finance-bank, rrb, cooperative or regulated-nbfc. |
| states | all or explicit State/UT scope. State-level scope does not prove a branch in every district. |
| scopeLabel / availability | Public display of product/service area caveat. |
| amount / amountNote | Published range, formula, bank-assessed limit or explicit not-published note. |
| rate | Published price information or instruction to obtain the current rate/KFS. It must not be inferred. |
| borrower / eligibility / purpose / summary | Applicant class, eligibility caveat, supported use and product description. |
| terms | Tenure, repayment, collateral, renewal or other conditions as published/linked. |
| documents / process | Typical supporting papers and ordered application guidance. |
| applyUrl / applyLabel | Official product/application/enquiry URL and label. A product page may require branch application. |
| sourceUrl / sources[] | Official product and regulatory/source references. |
| verificationStatus / verificationNote | Whether the record is an official product-page link, DFS RRB registry entry or institutional/cooperative source. |
| pricingStatus | Whether pricing must be reconfirmed with the institution before application. |
| branchCoverageStatus | District branch presence verification state. Current national entries are not district-branch confirmations. |
| lastReviewed / reviewDate | Source review date. This is not a promise that terms remain unchanged. |
| matchRules | Broad profile/land/activity rules for potential lender discovery. They do not indicate creditworthiness or sanction. |
| sponsorBank | Sponsor bank for an RRB, where present in the official DFS list. |

### Finance comparison cautions

Always compare the current annualised interest/APR, reducing/flat method, processing/document/insurance fees, margin, collateral, repayment frequency, foreclosure terms and Key Fact Statement. Do not compare products using headline interest alone. PACS are not automatically banks under the Banking Regulation Act. RRB registry inclusion is not proof of branch presence in a selected district.

## 3. portals.json

One record per State/UT. Typical fields include:

- agriculture: State/UT Agriculture Department URL and description.
- scheme: State scheme portal or official directory link.
- districtDirectory: Government district website discovery link.
- localGovernance: Panchayat/Block/BDO/local-government route.
- cooperative: State Cooperative Department or Kisan Rin Portal route.
- rrb: official Regional Rural Bank name, website and sponsor bank where listed by DFS.
- facilitation / extra: additional State help centres, horticulture or marketing authorities.
- districts: direct district websites only where individually mapped in this release. A fallback directory link must not be described as a direct district portal.

## 4. geography-fallback.json

Bundled State/UT and district names used when the runtime district feed is unavailable. Current snapshot contains 36 State/UT entries and 779 district entries. The source is community-maintained and is not a government-certified administrative hierarchy. It must be reconciled with the official Local Government Directory before using it as an authoritative district/block/Panchayat inventory.

Official geography reference: https://lgdirectory.gov.in/ and https://data.gov.in/catalog/local-government-directory-lgd

## 5. coverage-v25.json

Machine-readable progress and research-gap register. Important fields:

- geography: counts and source/provisional warning for State/UT and district snapshot.
- nationalCatalogue: actual record counts, IDs, type counts, status counts and provider categories.
- stateInventory: State-scope and district-scope record counts, number of States with any State-specific records, and direct district website count.
- financeCoverage: RRB count and district branch verification caveat.
- states[]: each State/UT's agriculture/scheme portal, State-specific record IDs/count, district record IDs/count, district website mapping, RRB, lender catalogue count and each district's separate programme/branch/PACS/block status.

## 6. `state-programme-register.json`

A V3 research queue for all 36 State/UTs. Each State/UT has nine workstreams: farmer income/DBT; crop production support; mechanisation/irrigation; horticulture; animal husbandry/fisheries; marketing/procurement; cooperative credit; tenant/landless/tribal support; and FPO/enterprise/infrastructure. Each workstream stores a research status, record IDs, source reference where available and next research action. A portal link alone is not counted as a researched scheme.

## 7. Official geography import (`lgd-geography.json`)

Generated locally from downloaded official LGD CSV exports using `scripts/import-lgd-export.mjs`. State and District codes are required; Sub-district/Village CSVs are optional but enrich the hierarchy. Local Bodies exports may lack district parents; the importer retains those codes at State level instead of attributing them to a district. Never commit sensitive or non-administrative fields from exports.

## 8. V3 API contracts

- `GET /api/market-prices`: server-side data.gov.in daily market price proxy; requires `DATA_GOV_IN_API_KEY` secret. Filters are State, District and commodity; result records include the source arrival date and prices. Daily records are not real-time farm-gate quotations.
- `GET /api/geography`: optional official LGD District API proxy. Without a resource API it returns a not-configured response and the app tries the imported official file then community snapshot.
- `/api/ngo/*`: Cloudflare Access authenticated, organisation-scoped D1 routes. `ngo_users` defines active org role; only aggregate metrics and internal follow-up references are stored. Admin/editor/viewer permissions apply.

## 9. Security and privacy boundaries

The static Find My Support tool does not submit farmer profiles. NGO V3 stores no farmer names, phone numbers, Aadhaar, bank numbers, identity scans or free-text case notes. Do not add personal-data fields without a separate threat model, access/consent/retention design and legal/privacy review. Cloudflare Access authenticates the member; the D1 `org_id` scopes every read/write.

### Status language

- **Portal linked:** an official department or discovery URL is available; it does not mean that the scheme inventory is complete.
- **Partial / sourced:** one or more State-specific catalogue records have a source; it does not mean all State programmes are captured.
- **Research pending:** no State-specific/district-specific programme record has been independently catalogued in this release.
- **Direct district website mapped:** a direct district URL is listed. Otherwise the official India.gov directory is used as a discovery route.
- **Not district verified:** product/institution exists in the national/state directory but branch/serviceability is not confirmed for the selected district.
- **LGD mapping pending:** block/Panchayat identifiers have not yet been loaded and reconciled.

## 6. Eligibility matcher contract

The Find My Support assistant uses the selected State/District plus a broad applicant category, land/cultivation status, activity and support need. It only returns potential catalogue matches. It does not test income-tax exclusions, land records, KYC, notified crop status, past benefit history, bank credit score, local targets, budget availability or complete legal conditions. The final determination belongs to the implementing authority or lender.

Never enter Aadhaar, mobile number, bank account, OTP, password or identity documents into the public static assistant. The protected NGO V3 workspace accepts only aggregate totals and internal non-identifying reference codes.
