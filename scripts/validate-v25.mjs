import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readText = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const readJSON = (name) => JSON.parse(readText(name));
const errors = [];
const checks = [];
const check = (condition, message) => {
  checks.push({ ok: Boolean(condition), message });
  if (!condition) errors.push(message);
};
const isWebUrl = (value) => {
  try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:'; }
  catch { return false; }
};
const unique = (values) => new Set(values).size === values.length;

const schemes = readJSON('schemes.json');
const lenders = readJSON('lenders.json');
const portals = readJSON('portals.json');
const geography = readJSON('geography-fallback.json');
const coverage = readJSON('coverage-v25.json');

const stateNames = geography.map((x) => x.name);
const stateNameSet = new Set(stateNames);
const districtTotal = geography.reduce((sum, state) => sum + (state.districts?.length || 0), 0);
const allowedTypes = new Set(['grant','loan','subsidy','insurance','institution','informal','pension']);
const allowedScopes = new Set(['national','state','district','local']);
const allowedProviders = new Set(['central-government','state-government','public-bank','private-bank','small-finance-bank','rrb','cooperative','regulated-nbfc','local-body','informal']);
const allowedAmountStatus = new Set(['published','assessment','not_published','rate_support','unknown','variable']);

check(schemes.length === 31, `Expected 31 scheme/benefit records; found ${schemes.length}.`);
check(lenders.length === 46, `Expected 46 lender/provider records; found ${lenders.length}.`);
check(geography.length === 36 && unique(stateNames), `Expected 36 unique State/UT names; found ${geography.length}.`);
check(districtTotal === 779, `Expected the bundled 779-district snapshot; found ${districtTotal}.`);
check(Object.keys(portals).length === 36, `Expected 36 State/UT portal records; found ${Object.keys(portals).length}.`);
check(coverage.states.length === 36, `Expected 36 coverage rows; found ${coverage.states.length}.`);
check(coverage.geography.districtEntryCount === districtTotal, 'Coverage register district count does not match geography fallback.');
check(coverage.nationalCatalogue.schemeRecordCount === schemes.length, 'Coverage register scheme count does not match schemes.json.');
check(coverage.nationalCatalogue.lenderProductRecordCount === lenders.length, 'Coverage register lender count does not match lenders.json.');

const schemeIds = schemes.map((x) => x.id);
check(unique(schemeIds), 'Duplicate scheme IDs found.');
const missingSchemeFields = [];
for (const s of schemes) {
  const required = ['id','name','type','category','scope','states','districts','profiles','amount','amountNote','summary','eligibility','process','application','source','sourceLabel','documents','matchRules','verification','recordVersion','recordClass','programmeStatus','programmeStatusLabel','sourceVerificationStatus','amountDisclosureStatus'];
  for (const key of required) if (s[key] === undefined || s[key] === null || s[key] === '') missingSchemeFields.push(`${s.id}: missing ${key}`);
  if (!allowedTypes.has(s.type)) missingSchemeFields.push(`${s.id}: invalid type ${s.type}`);
  if (!allowedScopes.has(s.scope)) missingSchemeFields.push(`${s.id}: invalid scope ${s.scope}`);
  if (s.recordVersion !== '2.5') missingSchemeFields.push(`${s.id}: recordVersion must be 2.5`);
  if (!Array.isArray(s.process) || s.process.length === 0) missingSchemeFields.push(`${s.id}: process must have at least one step`);
  if (!Array.isArray(s.documents) || s.documents.length === 0) missingSchemeFields.push(`${s.id}: documents checklist missing`);
  if (!Array.isArray(s.profiles) || s.profiles.length === 0) missingSchemeFields.push(`${s.id}: eligible profiles missing`);
  if (!Array.isArray(s.providerKinds) || s.providerKinds.length === 0) missingSchemeFields.push(`${s.id}: providerKinds missing`);
  if ((s.providerKinds || []).some((p) => !allowedProviders.has(p))) missingSchemeFields.push(`${s.id}: unknown provider kind`);
  if (!Array.isArray(s.matchRules?.profiles) || !Array.isArray(s.matchRules?.landStatus) || !Array.isArray(s.matchRules?.activities) || !Array.isArray(s.matchRules?.supportNeeds) || !Array.isArray(s.matchRules?.mustVerify)) missingSchemeFields.push(`${s.id}: incomplete matchRules`);
  if (!isWebUrl(s.application)) missingSchemeFields.push(`${s.id}: invalid application URL`);
  if (!isWebUrl(s.source)) missingSchemeFields.push(`${s.id}: invalid primary source URL`);
  if (!s.verification?.status || !s.sourceVerificationStatus) missingSchemeFields.push(`${s.id}: verification status missing`);
  if (s.amountStatus && !allowedAmountStatus.has(s.amountStatus)) missingSchemeFields.push(`${s.id}: unknown amountStatus ${s.amountStatus}`);
  if (Array.isArray(s.states) && s.states.some((state) => !stateNameSet.has(state))) missingSchemeFields.push(`${s.id}: references unknown State/UT`);
  if (s.programmeStatus === 'extension_not_verified' && s.matchRules?.excludeFromAssistant !== true) missingSchemeFields.push(`${s.id}: extension-unverified programme must be excluded from eligibility matching`);
  for (const ref of s.sources || []) if (!ref.label || !isWebUrl(ref.url)) missingSchemeFields.push(`${s.id}: invalid additional source reference`);
}
check(missingSchemeFields.length === 0, missingSchemeFields.slice(0, 12).join('; ') || 'All scheme records have required fields and valid source links.');

const lenderIds = lenders.map((x) => x.id);
check(unique(lenderIds), 'Duplicate lender IDs found.');
const missingLenderFields = [];
for (const l of lenders) {
  const required = ['id','name','product','providerKinds','states','amount','amountNote','rate','summary','purpose','eligibility','terms','documents','process','applyUrl','sourceUrl','matchRules','verificationStatus','verificationNote','pricingStatus','branchCoverageStatus','lastReviewed'];
  for (const key of required) if (l[key] === undefined || l[key] === null || l[key] === '') missingLenderFields.push(`${l.id}: missing ${key}`);
  if (!Array.isArray(l.providerKinds) || !l.providerKinds.length) missingLenderFields.push(`${l.id}: providerKinds missing`);
  if ((l.providerKinds || []).some((p) => !allowedProviders.has(p))) missingLenderFields.push(`${l.id}: unknown provider kind`);
  if (!Array.isArray(l.matchRules?.profiles) || !Array.isArray(l.matchRules?.landStatus) || !Array.isArray(l.matchRules?.activities) || !Array.isArray(l.matchRules?.supportNeeds)) missingLenderFields.push(`${l.id}: incomplete matchRules`);
  if (!isWebUrl(l.applyUrl) || !isWebUrl(l.sourceUrl)) missingLenderFields.push(`${l.id}: invalid application/source URL`);
  if (l.states !== 'all' && (!Array.isArray(l.states) || l.states.some((state) => !stateNameSet.has(state)))) missingLenderFields.push(`${l.id}: invalid geographic scope`);
  for (const ref of l.sources || []) if (!ref.label || !isWebUrl(ref.url)) missingLenderFields.push(`${l.id}: invalid additional source reference`);
}
check(missingLenderFields.length === 0, missingLenderFields.slice(0, 12).join('; ') || 'All lender entries have borrower rules, source links and disclosure fields.');

const rrbLenders = lenders.filter((x) => (x.providerKinds || []).includes('rrb'));
check(rrbLenders.length === 28, `Expected 28 individually listed RRB entries; found ${rrbLenders.length}.`);
const portalStateNames = Object.keys(portals);
check(unique(portalStateNames) && stateNames.every((state) => portalStateNames.includes(state)), 'Portal register does not cover all bundled State/UT names.');
for (const state of stateNames) {
  const portal = portals[state];
  if (!portal?.agriculture?.url) errors.push(`${state}: agriculture portal link missing`);
  const coverageRow = coverage.states.find((x) => x.stateUT === state);
  if (!coverageRow) errors.push(`${state}: coverage register row missing`);
  const stateSchemes = schemes.filter((x) => x.scope === 'state' && Array.isArray(x.states) && x.states.includes(state));
  const districtSchemes = schemes.filter((x) => x.scope === 'district' && Array.isArray(x.states) && x.states.includes(state));
  if (coverageRow && coverageRow.stateSchemeRecordCount !== stateSchemes.length) errors.push(`${state}: state scheme count mismatch in coverage register`);
  if (coverageRow && coverageRow.districtScopedProgrammeRecordCount !== districtSchemes.length) errors.push(`${state}: district programme count mismatch in coverage register`);
  if (portal?.rrb) {
    const match = rrbLenders.find((x) => Array.isArray(x.states) && x.states.includes(state));
    if (!match || match.name !== portal.rrb.name || match.sponsorBank !== portal.rrb.sponsor) errors.push(`${state}: RRB portal and lender register mismatch`);
  }
}
check(errors.length === 0, errors.join('; ') || 'State, portal, RRB and coverage registers reconcile.');


// Browser-app syntax and page-navigation contract.
let appSyntaxValid = true;
try { new Script(readText('app.js'), { filename: 'app.js' }); }
catch (error) { appSyntaxValid = false; errors.push(`app.js syntax error: ${error.message}`); }
check(appSyntaxValid, 'app.js parses successfully under Node.js.');
const html = readText('index.html');
const navViews = [...html.matchAll(/data-view="([^"]+)"/g)].map((m) => m[1]);
const pageViews = [...html.matchAll(/<section id="view-([^"]+)"/g)].map((m) => m[1]);
const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
check(unique(navViews) && unique(pageViews) && navViews.length === pageViews.length && navViews.every((view) => pageViews.includes(view)), 'Every navigation item maps to exactly one page section.');
check(unique(htmlIds), 'HTML IDs are unique.');
check(['view-assistant','view-directory','view-ngo','view-market','view-coverage'].every((id) => html.includes(`id="${id}"`)), 'All V2.5 pages are present in the public interface.');
check(html.includes('id="directory-type"') && html.includes('value="pension"'), 'Directory includes the pension/social-security support filter.');
check(html.includes('https://indian-agri-loans.pages.dev/'), 'Public canonical host remains the Cloudflare Pages URL.');

const extensionRecords = schemes.filter((x) => x.programmeStatus === 'extension_not_verified');
check(extensionRecords.length === 2 && extensionRecords.every((x) => x.matchRules.excludeFromAssistant === true), 'Legacy extension-unverified records must remain excluded from eligibility matching.');
check(coverage.geography.verificationStatus === 'community_snapshot_not_reconciled_to_current_LGD', 'Coverage register must retain the provisional-geography warning.');
check(coverage.stateInventory.statesWithAtLeastOneStateSpecificScheme === 1, 'Current state inventory count should remain explicit: one State has State-specific scheme records.');
check(coverage.stateInventory.districtsWithIndividuallyMappedDirectWebsites === 22, 'Direct district website mapping count changed; review coverage register.');

console.log('AgriBridge V2.5 data validation');
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.message}`);
console.log(`Records: ${schemes.length} schemes/benefits; ${lenders.length} lender/provider entries; ${geography.length} States/UTs; ${districtTotal} provisional district entries.`);
if (errors.length) { console.error(`Validation failed: ${errors.length} issue(s).`); process.exit(1); }
console.log('Validation passed.');
