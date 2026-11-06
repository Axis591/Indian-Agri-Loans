# AgriBridge NGO Helping Hand — Privacy Notice (Draft)

**Notice version:** 1.0  
**Prepared:** 7 November 2026  
**Status:** Draft for the site owner and participating organisations to review before accepting real farmer records.

This notice describes the data flows implemented in the NGO Helping Hand feature. It is not a legal opinion or a claim of compliance. Before production use, the site owner and each participating organisation must decide and document their respective responsibilities, lawful basis, contact details for privacy requests/grievances, retention schedule and incident-response process with qualified Indian privacy counsel.

## 1. Information collected

### Organisation membership application

The public membership form collects organisation name and type, registration details (where available), State and district, service areas, website (optional), contact person's name and role, official work email, contact phone, and a description of farmer-support activities. It is used only to review and administer the membership request.

A private application code and tracking token are generated. The tracking token is returned once and only its hash is stored. Keep the token confidential.

### Farmer support profile

The NGO workspace is designed around pseudonymous case references. It stores the organisation's internal case code, State, district, farmer/applicant profile, land/cultivation status, main farm activity, support need, crop/commodity, optional cultivated area and unit, season, irrigation status, and a consent timestamp/version. The authenticated staff account that created or updated a record is also logged for accountability.

**Do not enter a farmer's name, phone number, Aadhaar, PAN, bank details, OTP, exact home address, or other direct identifier in a case code, crop field, note or application reference.** Keep any re-identification key outside AgriBridge under the NGO's own approved controls.

### Optional supporting files

The workspace accepts PDF, PNG and JPEG files up to 5 MB. Use only necessary, redacted evidence such as a land/cultivation proof extract, group registration evidence or crop/activity photo. Redact names, addresses, identity numbers, phone numbers, bank details and unrelated personal information before upload.

A file is stored in the organisation's private Cloudflare R2 bucket. Its metadata is stored in D1. Files are served as downloads through authenticated routes; the bucket must not be made public or connected to a public custom domain.

**There is no automatic OCR, document extraction, eligibility verification or malware-scanning service in this release.** Uploaded material is not automatically read by the recommendation engine. It is stored for authorised staff review only. The NGO should independently scan files before opening them and should not upload a file unless it has the necessary consent and a clear purpose.

## 2. Why information is used

The information is used to:
- assess an organisation's request to join the NGO network;
- create a pseudonymous farmer support case after the farmer's informed agreement;
- compare entered farmer characteristics with AgriBridge's public scheme catalogue;
- keep a manual record of scheme applications that the NGO is supporting;
- maintain aggregate programme metrics and an audit trail.

Recommendations are indicative catalogue matches, not a government eligibility decision, sanction, benefit promise or application submission.

## 3. Access and sharing

Organisation farmer profiles, files and application trackers are separated by the authenticated organisation ID. Cloudflare Access authenticates the account; the D1 membership table authorises the account and role. Platform administrators can review NGO membership applications. Only the appropriate NGO roles can manage farmer cases and files.

AgriBridge does not publish farmer profiles or supporting documents. Scheme applications are completed separately by the NGO/farmer using the official portal or the implementing department's process. AgriBridge does not submit farmer data to a government scheme portal from this workspace.

Cloudflare provides hosting, database and object-storage infrastructure. The site owner must review applicable provider terms and data-location requirements before production deployment.

## 4. Consent, correction and deletion

Before creating a farmer profile, the NGO must explain—in a language the farmer understands—the purpose of the profile, what characteristics will be stored, how scheme matching works, and whether optional files will be uploaded. The farmer's agreement must be freely given. The staff member records that confirmation by checking the consent field; the system stores the consent timestamp and notice version.

The farmer may ask the NGO to correct or withdraw the profile. The organisation administrator can delete a farmer profile; the implemented deletion also removes its linked documents and scheme-tracker entries. The NGO should keep a separate process for responding to requests and must not retain duplicate copies unnecessarily.

The site owner must publish a clear retention period and implement periodic deletion for membership applications, case data, documents and audit records before using real data. This release does not yet run an automatic retention/deletion schedule. Pending or rejected membership applications should not be kept indefinitely.

## 5. Security measures in this release

- Cloudflare Access JWT verification and organisation-scoped role checks for private APIs.
- Platform-admin email allowlist for the membership review queue.
- D1 prepared statements and organisation ID filters.
- Private R2 object storage, random object identifiers, file-size and file-signature checks, restricted file types, download-only responses and nosniff headers.
- Turnstile server-side token verification and salted daily submission rate limits on the public join form.
- Audit events for key farmer-profile, document and manual-application changes.
- No browser localStorage persistence for NGO records.

These safeguards reduce risk but do not eliminate it. Configure MFA/identity policies where available, limit staff access, review audit activity, protect administrator credentials, maintain backups, test restoration, and document breach handling.

## 6. Privacy contact and grievance process — must be completed by the site owner

Before enabling live farmer records, publish:
- the legal name and contact details of the responsible platform operator;
- the privacy/grievance contact email or other monitored channel;
- the name/contact route for each participating NGO's privacy representative;
- the retention period for each data category;
- the procedure and response timeframe for access, correction, withdrawal and deletion requests;
- the process for notifying affected people and authorities if a reportable incident occurs.

The site owner should confirm whether the platform operator and NGO act as independent or joint Data Fiduciaries, or whether another arrangement applies. Do not assume this technical notice settles the legal allocation of responsibilities.

## 7. Legal review

The Digital Personal Data Protection Act, 2023 and Digital Personal Data Protection Rules, 2025 have phased commencement provisions. Review the current Gazette notifications and obtain legal advice before processing identifiable farmer information. Official references:
- [Digital Personal Data Protection Rules, 2025 — MeitY](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa)
- [Rules notification — Gazette of India, 14 November 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
- [Act commencement notification — Gazette of India, 13 November 2025](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf)

**Do not activate real farmer data collection until this draft has been reviewed, the missing contact/retention items are completed, and the Cloudflare bindings and access policies have been tested.**
