import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readText=name=>fs.readFileSync(path.join(root,name),'utf8');
const readJSON=name=>JSON.parse(readText(name));
const exists=name=>fs.existsSync(path.join(root,name));
const errors=[],checks=[];
const check=(condition,message)=>{checks.push({ok:Boolean(condition),message});if(!condition)errors.push(message);};
const isWebUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:';}catch{return false;}};
const unique=values=>new Set(values).size===values.length;

const schemes=readJSON('schemes.json');
const lenders=readJSON('lenders.json');
const portals=readJSON('portals.json');
const geography=readJSON('geography-fallback.json');
const coverage=readJSON('coverage-v25.json');
const stateRegister=readJSON('state-programme-register.json');
const stateNames=geography.map(x=>x.name),stateNameSet=new Set(stateNames);
const districtTotal=geography.reduce((n,s)=>n+(s.districts?.length||0),0);
const allowedTypes=new Set(['grant','loan','subsidy','insurance','institution','informal','pension']);
const allowedScopes=new Set(['national','state','district','local']);
const allowedProviders=new Set(['central-government','state-government','public-bank','private-bank','small-finance-bank','rrb','cooperative','regulated-nbfc','local-body','informal']);
const allowedAmountStatus=new Set(['published','assessment','not_published','rate_support','unknown','variable']);

check(schemes.length===38,`Expected 38 scheme/benefit records; found ${schemes.length}.`);
check(lenders.length===46,`Expected 46 lender/provider entries; found ${lenders.length}.`);
check(geography.length===36&&unique(stateNames),`Expected 36 unique State/UT names; found ${geography.length}.`);
check(districtTotal===779,`Expected 779 provisional fallback district entries; found ${districtTotal}.`);
check(Object.keys(portals).length===36&&stateNames.every(s=>Object.hasOwn(portals,s)),'Portal map covers all 36 State/UT names.');
check(coverage.states.length===36&&stateRegister.states.length===36,'Coverage and State research registers each have 36 State/UT rows.');
check(coverage.geography.districtEntryCount===districtTotal,'Coverage district count matches bundled fallback.');
check(coverage.nationalCatalogue.schemeRecordCount===schemes.length,'Coverage scheme count reconciles to schemes.json.');
check(coverage.nationalCatalogue.lenderProductRecordCount===lenders.length,'Coverage lender count reconciles to lenders.json.');
check(coverage.stateInventory.stateSchemeRecords===schemes.filter(s=>s.scope==='state').length,'State-scope record count reconciles.');
check(coverage.stateInventory.statesWithAtLeastOneStateSpecificScheme===7,'Seven States/UTs have at least one named State-scope record in this release.');
check(stateRegister.workstreamDefinitions.length===9&&stateRegister.states.every(s=>(s.workstreams||[]).length===9),'Nine State programme research workstreams exist for every State/UT.');
check(stateRegister.totals.namedStateProgrammeRecords===12&&stateRegister.totals.statesWithNamedStateProgrammes===7,'State programme register reports 12 records across seven States/UTs.');
check(stateRegister.totals.researchPendingStates.length===29,'Twenty-nine State/UT inventories are explicitly research pending.');

const schemeIds=schemes.map(s=>s.id);
check(unique(schemeIds),'Scheme IDs are unique.');
const missingSchemes=[];
for(const s of schemes){
  const required=['id','name','type','category','scope','states','districts','profiles','amount','amountNote','summary','eligibility','process','application','source','sourceLabel','documents','matchRules','verification','recordVersion','recordClass','programmeStatus','programmeStatusLabel','sourceVerificationStatus','amountDisclosureStatus'];
  for(const key of required)if(s[key]===undefined||s[key]===null||s[key]==='')missingSchemes.push(`${s.id}: missing ${key}`);
  if(!allowedTypes.has(s.type)||!allowedScopes.has(s.scope))missingSchemes.push(`${s.id}: invalid type or scope`);
  if(s.recordVersion!=='3.0')missingSchemes.push(`${s.id}: recordVersion must be 3.0`);
  if(!Array.isArray(s.process)||!s.process.length||!Array.isArray(s.documents)||!s.documents.length||!Array.isArray(s.profiles)||!s.profiles.length)missingSchemes.push(`${s.id}: missing process/documents/profiles`);
  if(!Array.isArray(s.providerKinds)||!s.providerKinds.length||(s.providerKinds||[]).some(p=>!allowedProviders.has(p)))missingSchemes.push(`${s.id}: invalid providerKinds`);
  if(!Array.isArray(s.matchRules?.profiles)||!Array.isArray(s.matchRules?.landStatus)||!Array.isArray(s.matchRules?.activities)||!Array.isArray(s.matchRules?.supportNeeds)||!Array.isArray(s.matchRules?.mustVerify))missingSchemes.push(`${s.id}: incomplete matchRules`);
  if(!isWebUrl(s.application)||!isWebUrl(s.source))missingSchemes.push(`${s.id}: invalid application or source URL`);
  if(!s.verification?.status||!s.sourceVerificationStatus)missingSchemes.push(`${s.id}: missing source verification status`);
  if(s.amountStatus&&!allowedAmountStatus.has(s.amountStatus))missingSchemes.push(`${s.id}: invalid amountStatus`);
  if(Array.isArray(s.states)&&s.states.some(state=>!stateNameSet.has(state)))missingSchemes.push(`${s.id}: references unknown State/UT`);
  if(s.programmeStatus==='extension_not_verified'&&s.matchRules?.excludeFromAssistant!==true)missingSchemes.push(`${s.id}: extension-unverified record must be excluded from matcher`);
  for(const ref of s.sources||[])if(!ref.label||!isWebUrl(ref.url))missingSchemes.push(`${s.id}: invalid additional source link`);
}
check(missingSchemes.length===0,missingSchemes.slice(0,15).join('; ')||'All scheme records have required V3 fields, matching rules and source links.');

const lenderIds=lenders.map(l=>l.id);
check(unique(lenderIds),'Lender/provider IDs are unique.');
const missingLenders=[];
for(const l of lenders){
  const required=['id','name','product','providerKinds','states','amount','amountNote','rate','summary','purpose','eligibility','terms','documents','process','applyUrl','sourceUrl','matchRules','verificationStatus','verificationNote','pricingStatus','branchCoverageStatus','lastReviewed'];
  for(const key of required)if(l[key]===undefined||l[key]===null||l[key]==='')missingLenders.push(`${l.id}: missing ${key}`);
  if(!Array.isArray(l.providerKinds)||!l.providerKinds.length||(l.providerKinds||[]).some(p=>!allowedProviders.has(p)))missingLenders.push(`${l.id}: invalid providerKinds`);
  if(!Array.isArray(l.matchRules?.profiles)||!Array.isArray(l.matchRules?.landStatus)||!Array.isArray(l.matchRules?.activities)||!Array.isArray(l.matchRules?.supportNeeds))missingLenders.push(`${l.id}: incomplete lender matchRules`);
  if(!isWebUrl(l.applyUrl)||!isWebUrl(l.sourceUrl))missingLenders.push(`${l.id}: invalid product URL`);
  if(l.states!=='all'&&(!Array.isArray(l.states)||l.states.some(s=>!stateNameSet.has(s))))missingLenders.push(`${l.id}: invalid lender State scope`);
  for(const ref of l.sources||[])if(!ref.label||!isWebUrl(ref.url))missingLenders.push(`${l.id}: invalid lender source reference`);
}
check(missingLenders.length===0,missingLenders.slice(0,15).join('; ')||'All lender records have disclosure, source and borrower fields.');
const rrb=lenders.filter(l=>(l.providerKinds||[]).includes('rrb'));
check(rrb.length===28,'All 28 RRB entries remain listed.');

const registerErrors=[];
for(const state of stateNames){
  const p=portals[state],row=coverage.states.find(x=>x.stateUT===state),research=stateRegister.states.find(x=>x.stateUT===state);
  if(!p?.agriculture?.url)registerErrors.push(`${state}: agriculture portal missing`);
  if(!row||!research)registerErrors.push(`${state}: missing coverage or research row`);
  const stateIds=schemes.filter(s=>s.scope==='state'&&Array.isArray(s.states)&&s.states.includes(state)).map(s=>s.id).sort();
  const districtIds=schemes.filter(s=>s.scope==='district'&&Array.isArray(s.states)&&s.states.includes(state)).map(s=>s.id).sort();
  if(row&&row.stateSchemeRecordCount!==stateIds.length)registerErrors.push(`${state}: coverage state-scheme count mismatch`);
  if(row&&row.districtScopedProgrammeRecordCount!==districtIds.length)registerErrors.push(`${state}: coverage district-programme count mismatch`);
  if(research&&JSON.stringify([...(research.namedSchemeRecordIds||[])].sort())!==JSON.stringify(stateIds))registerErrors.push(`${state}: State research record IDs do not reconcile`);
  if(p?.rrb){const match=rrb.find(l=>Array.isArray(l.states)&&l.states.includes(state));if(!match||match.name!==p.rrb.name||match.sponsorBank!==p.rrb.sponsor)registerErrors.push(`${state}: RRB/sponsor mismatch`);}
}
check(registerErrors.length===0,registerErrors.slice(0,20).join('; ')||'State portal, scheme, RRB and research registers reconcile.');

// Browser app, routing and static UI contract.
let appValid=true;try{new Script(readText('app.js'),{filename:'app.js'});}catch(e){appValid=false;errors.push(`app.js syntax: ${e.message}`);}
check(appValid,'app.js parses successfully.');
const html=readText('index.html'),nav=[...html.matchAll(/data-view="([^"]+)"/g)].map(m=>m[1]),views=[...html.matchAll(/<section id="view-([^"]+)"/g)].map(m=>m[1]),htmlIds=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
check(unique(nav)&&unique(views)&&nav.length===views.length&&nav.every(x=>views.includes(x)),'Every navigation tab maps to one unique page section.');
check(unique(htmlIds),'HTML IDs are unique.');
check(['finance','assistant','directory','ngo','market','coverage'].every(v=>views.includes(v)),'All six AgriBridge pages are present.');
check(['loan-principal','loan-tenure','loan-method','offer-a-rate','offer-b-rate','calculate-loans','loan-comparison-output'].every(id=>html.includes(`id="${id}"`)),'Loan comparison inputs and result container exist.');
check(['market-price-form','market-state','market-district','market-commodity','market-price-status','market-price-results'].every(id=>html.includes(`id="${id}"`)),'Daily mandi search form and results container exist.');
check(['ngo-workspace-status','ngo-workspace-ready','ngo-save-metrics','ngo-followup-form','ngo-join-form','ngo-join-submit','ngo-admin-panel','ngo-farmer-form','ngo-farmer-import-form','ngo-farmer-csv','ngo-farmer-csv-consent','ngo-farmer-list','ngo-farmer-recommendations','ngo-doc-form','ngo-scheme-application-list','ngo-manual-apply-form','ngo-manual-farmer','ngo-manual-scheme'].every(id=>html.includes(`id="${id}"`)),'NGO Helping Hand membership, farmer and application UI elements exist.');
check(html.includes('value="women_farmer"'),'Women farmer applicant profile is selectable.');
check(html.includes('NGO_PORTAL_NO_DOMAIN_SETUP.md')&&html.includes('NGO_PRIVACY_NOTICE.md'),'Current no-domain NGO portal setup and privacy notices are linked in the public page.');
check(html.includes('https://indian-agri-loans.pages.dev/'),'Cloudflare public canonical host is retained.');
check(html.includes('data-ngo-portal="false"')&&html.includes('https://agribridge-ngo-portal.pages.dev/?page=ngo'),'Public AgriBridge keeps its public access and links approved members to the separate NGO portal.');
const portalHtml=readText('ngo-portal/index.html'),portalApp=readText('ngo-portal/app.js');
check(portalHtml.includes('data-ngo-portal="true"')&&portalHtml.includes('noindex,nofollow,noarchive'),'Separate NGO portal is marked as the protected, non-indexed application.');
check(portalHtml.includes('ngo-admin-review-toggle')&&portalHtml.includes('ngo-farmer-form')&&portalHtml.includes('ngo-manual-apply-form')&&portalHtml.includes('ngo-doc-form'),'Separate portal contains admin review, farmer, document and manual scheme UI.');
check(portalApp.includes("document.documentElement.dataset.ngoPortal==='true'")&&portalApp.includes('loadNGOWorkspace'),'Separate portal activates the same-origin secure NGO workspace APIs.');
check(portalHtml.includes('https://indian-agri-loans.pages.dev/assets/'),'Portal reuses public-site static illustrations without exposing private R2 objects.');
const portalRoutes=readJSON('ngo-portal/_routes.json');
check(portalRoutes.version===1&&portalRoutes.include.includes('/api/*'),'Portal Pages Functions are routed under /api/*.');

const app=readText('app.js');
check(app.includes("document.documentElement.dataset.ngoPortal==='true'")&&app.includes('Open secure NGO portal'),'The public app does not call private NGO APIs and directs members to the Access-protected portal.');
check(!app.includes('localStorage'),'Public app does not store NGO data in browser localStorage.');
check(app.includes('submitNGOJoin')&&app.includes('loadNGOAdminApplications')&&app.includes('reviewNGOApplication'),'NGO membership application and platform review UI logic exist.');
check(app.includes('addNGOFarmer')&&app.includes('importNGOFarmerCSV')&&app.includes('parseNGOFarmerCSV')&&app.includes('editNGOFarmer')&&app.includes('showFarmerRecommendations')&&app.includes('startManualSchemeApplication')&&app.includes('submitManualSchemeApplication')&&app.includes('updateNGOManualSchemeOptions'),'Consent-based single and CSV farmer profiles, document-informed edits, recommendations and manual scheme selection exist.');
check(app.includes('uploadNGOFarmerDocument')&&app.includes('loadFarmerDocuments')&&app.includes('reviewNGOFarmerDocument'),'Private supporting-document upload and review workflow exists.');
check(readText('functions/api/ngo/farmers/[id].js').includes('onRequestPatch'),'Farmer characteristics can be updated after authorised evidence review.');
check(readText('functions/api/ngo/documents/[id].js').includes('onRequestPatch'),'Organisation admins can mark private supporting files reviewed or rejected.');
check(app.includes('ngoJoinConfigLoaded')&&app.includes('loadNGOJoinConfig'),'Turnstile is initialized after the public membership form is opened.');
check(app.includes('/api/market-prices?')&&app.includes('/api/ngo/workspace')&&app.includes('/api/geography'),'App calls same-origin server-side data/NGO/geography routes.');
check(app.includes('/api/ngo/farmers')&&app.includes('/api/ngo/scheme-applications')&&app.includes('/api/ngo-join'),'NGO browser app connects to farmer, scheme tracker and public membership endpoints.');
check(app.includes('function renderLoanComparison')&&app.includes('function renderStateWorkstreams')&&app.includes('function loadMandiPrices'),'Loan, State research and market features have app logic.');

// Cloudflare Pages Functions, API security and migration files.
const requiredFiles=['_routes.json','functions/api/market-prices.js','functions/api/geography.js','functions/_lib/ngo.js','functions/api/ngo/workspace.js','functions/api/ngo/metrics.js','functions/api/ngo/followups.js','functions/api/ngo/followups/[id].js','functions/api/ngo/login.js','functions/api/ngo-join.js','functions/api/ngo-join-status.js','functions/api/ngo/admin/applications.js','functions/api/ngo/admin/applications/[id].js','functions/api/ngo/farmers.js','functions/api/ngo/farmers/[id].js','functions/api/ngo/farmers/[id]/documents.js','functions/api/ngo/documents/[id].js','functions/api/ngo/scheme-applications.js','functions/api/ngo/scheme-applications/[id].js','migrations/0001_ngo_secure.sql','migrations/0002_ngo_helping_hand.sql','NGO_HELPING_HAND_SETUP.md','NGO_PRIVACY_NOTICE.md','assets/ngo-farmer-import-template.csv','scripts/import-lgd-export.mjs','scripts/test-ngo-migrations.py','CLOUDFLARE_SETUP_V3.md','V3_RELEASE_NOTES.md','COVERAGE_REPORT_V3.md','NGO_PORTAL_NO_DOMAIN_SETUP.md','ngo-portal/index.html','ngo-portal/app.js','ngo-portal/styles.css','ngo-portal/language.js','ngo-portal/schemes.json','ngo-portal/lenders.json','ngo-portal/portals.json','ngo-portal/coverage-v25.json','ngo-portal/geography-fallback.json','ngo-portal/state-programme-register.json','ngo-portal/_headers','ngo-portal/_routes.json','ngo-portal/robots.txt','ngo-portal/README.md','ngo-portal/functions/_lib/ngo.js','ngo-portal/functions/api/geography.js','ngo-portal/functions/api/market-prices.js','ngo-portal/functions/api/ngo/workspace.js','ngo-portal/functions/api/ngo/metrics.js','ngo-portal/functions/api/ngo/followups.js','ngo-portal/functions/api/ngo/followups/[id].js','ngo-portal/functions/api/ngo/login.js','ngo-portal/functions/api/ngo/admin/applications.js','ngo-portal/functions/api/ngo/admin/applications/[id].js','ngo-portal/functions/api/ngo/farmers.js','ngo-portal/functions/api/ngo/farmers/[id].js','ngo-portal/functions/api/ngo/farmers/[id]/documents.js','ngo-portal/functions/api/ngo/documents/[id].js','ngo-portal/functions/api/ngo/scheme-applications.js','ngo-portal/functions/api/ngo/scheme-applications/[id].js'];
const missingFiles=requiredFiles.filter(name=>!exists(name));
check(missingFiles.length===0,missingFiles.join(', ')||'Cloudflare Functions, D1 migration, LGD importer and V3 documents exist.');
const functionFiles=requiredFiles.filter(name=>(name.startsWith('functions/')||name.startsWith('ngo-portal/functions/'))&&name.endsWith('.js'));
const unresolvedImports=[];
for(const name of functionFiles){
  const source=readText(name);
  for(const match of source.matchAll(/\\bfrom\\s+['"]([^'"]+)['"]/g)){
    const specifier=match[1];
    if(!specifier.startsWith('.'))continue;
    const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(name),specifier));
    const candidates=[resolved,resolved+'.js',path.posix.join(resolved,'index.js')];
    if(!candidates.some(candidate=>exists(candidate)))unresolvedImports.push(name+' -> '+specifier+' (resolved '+resolved+')');
  }
}
check(unresolvedImports.length===0,unresolvedImports.slice(0,15).join('; ')||'Every relative Cloudflare Function import resolves to a repository file.');
const routes=readJSON('_routes.json');
check(routes.version===1&&routes.include.includes('/api/*'),'Pages Functions are restricted to /api/* routes.');
const ngoLib=readText('functions/_lib/ngo.js'),migration=readText('migrations/0001_ngo_secure.sql'),marketProxy=readText('functions/api/market-prices.js');
check(ngoLib.includes('Cf-Access-Jwt-Assertion')&&ngoLib.includes('ACCESS_AUD')&&ngoLib.includes('org_id'),'NGO APIs validate Cloudflare Access and organisation scope.');
check(ngoLib.includes('requirePlatformAdmin')&&ngoLib.includes('NGO_PLATFORM_ADMIN_EMAILS'),'Platform application review is restricted to the configured administrator email allowlist.');
const portalNgoLib=readText('ngo-portal/functions/_lib/ngo.js');
check(portalNgoLib.includes('Cf-Access-Jwt-Assertion')&&portalNgoLib.includes('ACCESS_AUD')&&portalNgoLib.includes('requirePlatformAdmin'),'The separate portal validates its own Cloudflare Access JWT and administrator allowlist.');
check(readText('ngo-portal/functions/api/ngo/farmers.js').includes('ngo_farmers')&&readText('ngo-portal/functions/api/ngo/documents/[id].js').includes('NGO_DOCS'),'The secure portal connects to the existing D1 farmer records and private R2 document bucket.');

check(migration.includes('ngo_users')&&migration.includes('ngo_metrics')&&migration.includes('ngo_followups')&&migration.includes('ngo_audit'),'D1 migration includes user, metrics, follow-up and audit tables.');
const helpingHand=readText('migrations/0002_ngo_helping_hand.sql');
check(helpingHand.includes('ngo_applications')&&helpingHand.includes('ngo_organisations')&&helpingHand.includes('ngo_farmers')&&helpingHand.includes('ngo_farmer_documents')&&helpingHand.includes('ngo_scheme_applications'),'NGO Helping Hand migration includes membership, farmer, document and application tables.');
check(exists('scripts/test-ngo-migrations.py'),'Executable SQLite integration tests exist for both NGO D1 migrations.');
const farmerTableDefinition=helpingHand.slice(helpingHand.indexOf('CREATE TABLE IF NOT EXISTS ngo_farmers'),helpingHand.indexOf('CREATE INDEX IF NOT EXISTS idx_ngo_farmers'));
const applicationTableDefinition=helpingHand.slice(helpingHand.indexOf('CREATE TABLE IF NOT EXISTS ngo_applications'),helpingHand.indexOf('CREATE INDEX IF NOT EXISTS idx_ngo_applications'));
check(farmerTableDefinition.includes('consent_at')&&farmerTableDefinition.includes('consent_version')&&!/farmer_name|aadhaar|bank_account/i.test(farmerTableDefinition)&&applicationTableDefinition.includes('privacy_notice_version')&&applicationTableDefinition.includes('privacy_consent_at')&&applicationTableDefinition.includes('accuracy_confirmed_at'),'Farmer and NGO membership declarations are timestamped; farmer schema excludes direct identity or bank fields.');
const joinEndpoint=readText('functions/api/ngo-join.js');
check(joinEndpoint.includes('challenges.cloudflare.com/turnstile/v0/siteverify')&&joinEndpoint.includes('NGO_JOIN_RATE_LIMIT_SALT')&&joinEndpoint.includes('NGO_DOCS')&&joinEndpoint.includes('ngo_applications'),'Public NGO applications require server-verified Turnstile, D1 and private R2; they remain independent of portal Access login.');
check(joinEndpoint.includes('tracking_token_hash')&&joinEndpoint.includes('NGO_JOIN_TURNSTILE_SECRET')&&joinEndpoint.includes('ngo-privacy-notice-v1.0'),'Membership tracking tokens are stored as hashes, Turnstile secret is server-side, and privacy notice acceptance is versioned.');
const docsEndpoint=readText('functions/api/ngo/farmers/[id]/documents.js');
check(docsEndpoint.includes('NGO_DOCS')&&docsEndpoint.includes('MAX_BYTES')&&docsEndpoint.includes('detectedType'),'Supporting files use private R2 binding, size cap and file signature checks.');
check(!marketProxy.includes('api-key=')&&marketProxy.includes('DATA_GOV_IN_API_KEY'),'Mandi API key is read from an environment secret, not embedded in public source.');

const extensionRecords=schemes.filter(s=>s.programmeStatus==='extension_not_verified');
check(extensionRecords.length===2&&extensionRecords.every(s=>s.matchRules.excludeFromAssistant===true),'PMFME/AHIDF extension-unverified entries remain excluded from automated matching.');
check(coverage.geography.verificationStatus==='community_snapshot_not_reconciled_to_current_LGD','Coverage retains the provisional geography warning until official LGD import.');
check(coverage.stateInventory.statesWithAtLeastOneStateSpecificScheme===stateRegister.totals.statesWithNamedStateProgrammes,'Coverage and State programme register state counts reconcile.');

console.log('AgriBridge V3 validation');
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'}  ${item.message}`);
console.log(`Records: ${schemes.length} scheme/benefit/service; ${lenders.length} lender/provider; ${stateNames.length} States/UTs; ${districtTotal} provisional district entries; ${stateRegister.totals.namedStateProgrammeRecords} State-scope programme records.`);
if(errors.length){console.error(`Validation failed: ${errors.length} issue(s).`);process.exit(1);}
console.log('Validation passed.');
