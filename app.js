const $ = (selector) => document.querySelector(selector);
const stateSelect = $('#state-select');
const districtSelect = $('#district-select');
const profileSelect = $('#profile-select');
const typeSelect = $('#type-select');
const providerSelect = $('#provider-select');
const sortSelect = $('#sort-select');
const recordsPromise = fetch('schemes.json').then(r => { if(!r.ok) throw new Error('Could not load scheme data'); return r.json(); });
const lendersPromise = fetch('lenders.json').then(r => { if(!r.ok) throw new Error('Could not load lender data'); return r.json(); });
const portalsPromise = fetch('portals.json').then(r => { if(!r.ok) throw new Error('Could not load portal data'); return r.json(); });
const coveragePromise = fetch('coverage-v25.json').then(r => { if(!r.ok) throw new Error('Could not load V2.5 coverage register'); return r.json(); });
const fallbackStatesPromise = fetch('geography-fallback.json').then(r => r.json());
const lgdStaticPromise = fetch('lgd-geography.json').then(r => { if(!r.ok) throw new Error('No static LGD export'); return r.json(); });
const stateProgrammePromise = fetch('state-programme-register.json').then(r => { if(!r.ok) throw new Error('Could not load State programme research register'); return r.json(); });
let records = [];
let lenders = [];
let portals = {};
let coverageData = null;
let stateProgrammeData = null;
let geographySourceLabel = 'COMMUNITY SNAPSHOT';
let geography = [];
let geographyLive = false;
let selectedView = 'finance';

const wbFallbackDistricts = [
  'Alipurduar','Bankura','Birbhum','Cooch Behar','Dakshin Dinajpur','Darjeeling','Hooghly','Howrah','Jalpaiguri','Jhargram','Kalimpong','Kolkata','Malda','Murshidabad','Nadia','North 24 Parganas','Paschim Bardhaman','Paschim Medinipur','Purba Bardhaman','Purba Medinipur','Purulia','South 24 Parganas','Uttar Dinajpur'
];

function normalizedName(s){ return String(s||'').toLowerCase().replace(/&/g,'and').replace(/[().']/g,'').replace(/\s+/g,' ').trim(); }
function stateNames(){ return geography.map(s => s.name).sort((a,b)=>a.localeCompare(b)); }
function stateEntry(name){ return geography.find(s=>normalizedName(s.name)===normalizedName(name)); }
function districtsFor(name){
  if(normalizedName(name)==='west bengal') return (stateEntry(name)?.districts||[]).map(d=>typeof d==='string'?d:d.name);
  const hit=stateEntry(name);
  return (hit?.districts||[]).map(d=>typeof d==='string'?d:d.name).sort((a,b)=>a.localeCompare(b));
}
function option(label,value){ const el=document.createElement('option');el.value=value;el.textContent=label;return el; }
function setOptions(node,values,selected){
  node.replaceChildren();
  values.forEach(value=>node.append(option(value,value)));
  if(selected && values.includes(selected)) node.value=selected;
  else if(values.length) node.value=values[0];
}

async function loadGeography(){
  const normalizeStates = (states) => (states||[]).map(s=>({code:s.code,name:s.name,districts:Array.isArray(s.districts)?s.districts:[]})).filter(s=>s.name&&s.districts.length);
  try{
    const response=await fetch('/api/geography',{cache:'no-store'});
    if(response.ok){
      const data=await response.json();
      if(data.configured&&Array.isArray(data.states)&&data.states.length>=28){
        geography=normalizeStates(data.states);geographySourceLabel='OFFICIAL LGD API';geographyLive=true;
      }
    }
  }catch(error){console.info('Official LGD API is not configured; checking downloaded LGD export.',error);}
  if(!geography.length){
    try{
      const data=await lgdStaticPromise;
      if(Array.isArray(data.states)&&data.states.length>=28){geography=normalizeStates(data.states);geographySourceLabel='OFFICIAL LGD CSV IMPORT';geographyLive=true;}
    }catch(error){console.info('No imported official LGD snapshot found; using the bundled community snapshot.',error);}
  }
  if(!geography.length){
    const states=await fallbackStatesPromise;
    geography=normalizeStates(states);
    const wb=geography.find(s=>s.code==='WB');
    if(wb&&!wb.districts.length)wb.districts=wbFallbackDistricts.map(name=>({name}));
    geographySourceLabel='COMMUNITY SNAPSHOT · LGD CHECK PENDING';geographyLive=false;
  }
  const liveLabel=document.querySelector('.live-label');
  if(liveLabel) liveLabel.innerHTML='<i></i> '+geographySourceLabel;
  const alertNode=$('#coverage-methodology-alert');
  if(alertNode&&geographyLive)alertNode.innerHTML='<b>Geography status:</b> '+escapeHtml(geographySourceLabel)+'. District and State codes were loaded from an official LGD-sourced dataset. Sub-district, village and local-body completeness depends on the imported resource set.';
  populateStates();
  updateCoverageList();
}
function populateStates(){
  const names=stateNames();
  const westBengal=names.find(n=>normalizedName(n)==='west bengal')||'West Bengal';
  setOptions(stateSelect,names,westBengal);
  populateDistricts('Paschim Medinipur');
}
function populateDistricts(preferred){
  const selectedState=stateSelect.value;
  const d=districtsFor(selectedState);
  const defaultName=(d.find(x=>normalizedName(x)==='paschim medinipur')||d[0]||'Select district');
  const selected=d.find(x=>normalizedName(x)===normalizedName(preferred))||defaultName;
  setOptions(districtSelect,d,selected);
  districtSelect.disabled=d.length===0;
  if(!d.length){districtSelect.replaceChildren(option('District list unavailable', ''));}
  render();
}
function applicable(record,state,district){
  const stateMatch=record.states==='all'||(Array.isArray(record.states)&&record.states.some(x=>normalizedName(x)===normalizedName(state)));
  if(!stateMatch) return false;
  if(record.scope==='district') return Array.isArray(record.districts)&&record.districts.some(x=>normalizedName(x)===normalizedName(district));
  if(record.districts==='all') return true;
  if(Array.isArray(record.districts)) return record.districts.some(x=>normalizedName(x)===normalizedName(district));
  return true;
}
function profileMatch(record,profile){ if(profile==='all')return true; if(record.profiles.includes(profile))return true; if(profile==='women_farmer')return record.profiles.some(x=>['owner','tenant','allied'].includes(x)); return false; }
function typeClass(type){return type==='grant'?'grant':type==='loan'?'loan':type==='insurance'?'insurance':type==='pension'?'pension':type==='informal'?'informal':type==='institution'?'institution':'subsidy';}
function typeLabel(type){return ({grant:'GRANT / DBT',loan:'LOAN / CREDIT',subsidy:'SUBSIDY / INTEREST SUPPORT',insurance:'INSURANCE',pension:'PENSION / SOCIAL SECURITY',informal:'INFORMAL · RISK',institution:'SERVICE / MARKET ACCESS'})[type]||type.toUpperCase();}
function providerLabel(kinds=[]){const labels={'central-government':'CENTRAL GOVT','state-government':'STATE GOVT','public-bank':'PUBLIC BANK','private-bank':'PRIVATE BANK','small-finance-bank':'SMALL FINANCE BANK','rrb':'RRB','cooperative':'COOPERATIVE / PACS','regulated-nbfc':'REGULATED NBFC','local-body':'PANCHAYAT / BLOCK','informal':'INFORMAL'};return [...new Set(kinds)].map(k=>labels[k]||k.toUpperCase()).join(' · ')||'PROVIDER NOT TAGGED';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function card(record){
  const state=stateSelect.value;
  const district=districtSelect.value;
  const scope=record.scope==='national'?'PAN INDIA':record.scope==='district'?'DISTRICT MATCH':record.scope==='local'?'LOCAL CHANNEL':'STATE SCHEME';
  const amount=escapeHtml(record.amount);
  const programmeStatus=record.programmeStatusLabel?'<span class="programme-status '+escapeHtml(record.programmeStatus||'')+'">'+escapeHtml(record.programmeStatusLabel)+'</span>':'';
  const applyLabel=escapeHtml(record.applicationLabel||'Official link');
  const rate=record.rate?`<div class="meta-cell"><small>INTEREST / SUPPORT</small><span>${escapeHtml(record.rate)}</span></div>`:'';
  return `<article class="scheme-card">
    <div class="card-top"><div class="card-category"><span class="pill ${typeClass(record.type)}">${typeLabel(record.type)}</span><span class="pill">${escapeHtml(record.category)}</span><span class="pill provider-pill">${escapeHtml(providerLabel(record.providerKinds))}</span></div><span class="scope-mini">${scope}</span></div>${programmeStatus}
    <h4>${escapeHtml(record.name)}</h4><p class="scheme-summary">${escapeHtml(record.summary)}</p>
    <div class="amount-row"><small>AMOUNT / CREDIT QUANTUM</small><strong>${amount}</strong><em>${escapeHtml(record.amountNote)}</em></div>
    <div class="card-meta"><div class="meta-cell"><small>WHO MAY QUALIFY</small><span>${escapeHtml(record.eligibility.split('.')[0])}</span></div><div class="meta-cell"><small>APPLICATION ROUTE</small><span>${escapeHtml(record.process[0])}</span></div>${rate}</div>
    <div class="card-actions"><span class="evidence">${escapeHtml(["official_portal_checked","official_dfs_guidance_checked","official_faq_checked_seasonal_notice_required","official_source_checked","official_source_checked_budget_implementation_caveat"].includes(record.verification?.status)?"Official source checked":"Source linked · recheck current rules")}</span><button class="details-btn" data-details="${record.id}">View process</button><a class="apply-btn" href="${escapeHtml(record.application)}" target="_blank" rel="noopener">${applyLabel} ↗</a></div>
  </article>`;
}
function render(){
  if(!records.length)return;
  const state=stateSelect.value;
  const district=districtSelect.value;
  const profile=profileSelect.value;
  const type=typeSelect.value;
  const provider=providerSelect.value;
  let matched=records.filter(r=>applicable(r,state,district)&&profileMatch(r,profile)&&(type==='all'||r.type===type)&&(provider==='all'||(r.providerKinds||[]).includes(provider)));
  if(sortSelect.value==='alpha') matched.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sortSelect.value==='amount') matched.sort((a,b)=>(a.amountStatus==='published'?0:1)-(b.amountStatus==='published'?0:1));
  else matched.sort((a,b)=>scopeRank(a)-scopeRank(b));
  $('#results').innerHTML=matched.map(card).join('');
  $('#results-count').textContent=matched.length;
  $('#metric-records').textContent=records.length+lenders.length;
  $('#empty-state').classList.toggle('hidden',matched.length!==0);
  $('#coverage-warning').classList.toggle('hidden',normalizedName(state)==='west bengal');
  if(normalizedName(state)!=='west bengal'){
    $('#coverage-warning').innerHTML=`<b>Coverage note for ${escapeHtml(state)}:</b> state portal links are listed below; state-specific scheme records and district notifications are still being independently curated. Lender products remain subject to branch availability and appraisal. An empty local list does not mean no scheme exists.`;
  }
  $('#location-summary').textContent=`Showing national and ${state} entries for ${district||'the selected district'}.`;
  updateAssistantLocation();
  $('#results').querySelectorAll('[data-details]').forEach(btn=>btn.addEventListener('click',()=>showDetails(btn.dataset.details)));
  renderLocalAccess();
  renderDirectory();
  if(coverageData) renderCoverageDetails(state);
}

function currentPortal(){
  return portals[stateSelect.value] || {
    state:stateSelect.value,
    agriculture:{label:'Official State Agriculture Department directory',url:'https://www.india.gov.in/category/agriculture-rural-environment/subcategory/research-marketing/details/departments-of-agriculture-of-states-and-union-territories',description:'Choose the selected State/UT to open its Agriculture Department website.'},
    scheme:{label:'myScheme State/UT finder',url:'https://www.myscheme.gov.in/',description:'Filter government schemes by State/UT, category and eligibility.'},
    districtDirectory:{label:'Official district website directory',url:'https://www.india.gov.in/directory/web-directory/districts'},
    localGovernance:{label:'eGramSwaraj / Panchayat directory',url:'https://egramswaraj.gov.in/'},
    cooperative:{label:'Kisan Rin Portal — cooperative and bank channels',url:'https://fasalrin.gov.in/'}
  };
}
function currentDistrictPortal(){
  const p=currentPortal();
  const direct=(p.districts||{})[districtSelect.value];
  if(direct) return {label:districtSelect.value+' District Administration',url:direct,description:'Direct district administration website listed by the State Government.'};
  return {label:districtSelect.value+' — official district website directory',url:p.districtDirectory?.url||'https://www.india.gov.in/directory/web-directory/districts',description:'Open the Government of India district web directory and choose '+districtSelect.value+' under '+stateSelect.value+'. This district host has not been separately validated in this register.'};
}
function safeLink(label,url){
  return '<a href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(label)+' ↗</a>';
}
function renderLocalAccess(){
  const node=$('#route-list');
  if(!node) return;
  const p=currentPortal();
  const d=currentDistrictPortal();
  const steps=[
    {title:'State Agriculture Department — '+stateSelect.value,copy:p.agriculture?.description||'Official department information and current scheme notices for the selected State/UT.',label:p.agriculture?.label||'Open state department',url:p.agriculture?.url},
    {title:'District Administration — '+districtSelect.value,copy:d.description,label:d.label,url:d.url},
    {title:(p.localGovernance?.label||'Panchayat / Block / local government')+' — '+districtSelect.value,copy:p.localGovernance?.description||'Use the local-government directory to identify the Gram Panchayat, block/BDO and local department contact. Panchayats do not offer one universal all-India farmer loan.',label:p.localGovernance?.linkLabel||'Open Panchayat portal',url:p.localGovernance?.url||'https://egramswaraj.gov.in/'},
    {title:p.cooperative?.label||'PACS / Cooperative bank / RRB — '+stateSelect.value,copy:p.cooperative?.description||'Use the State Cooperation Department or Kisan Rin Portal to identify banks and PACS. Confirm membership and local credit terms.',label:p.cooperative?.linkLabel||'Find credit channels',url:p.cooperative?.url||'https://fasalrin.gov.in/'},
    {title:p.scheme?.label||'State scheme application portal',copy:p.scheme?.description||'Check current application windows, eligibility, documents and district notifications.',label:p.scheme?.linkLabel||'Open scheme portal',url:p.scheme?.url||'https://www.myscheme.gov.in/'},
    {title:p.rrb?p.rrb.name+' — Regional Rural Bank':'RRB / rural bank discovery',copy:p.rrb?p.rrb.description:'No RRB is separately listed for this State/UT in the current DFS list. Use the national Kisan Rin Portal to identify eligible rural-bank channels.',label:p.rrb?'Open '+p.rrb.name:'Search rural-bank channels',url:p.rrb?p.rrb.url:'https://fasalrin.gov.in/'},
    {title:'KCC / commercial banks / regulated finance providers',copy:'Compare KCC, crop, allied and investment credit. Verify NBFC registration, APR, fees and Key Fact Statement before signing.',label:'Open Kisan Rin Portal',url:'https://fasalrin.gov.in/'}
  ];
  if(p.facilitation) steps.splice(4,0,{title:p.facilitation.label,copy:p.facilitation.description,label:'Open facilitation portal',url:p.facilitation.url});
  node.innerHTML=steps.map((s,i)=>'<div class="route-step"><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+escapeHtml(s.title)+'</b><small>'+escapeHtml(s.copy)+'</small></div>'+safeLink(s.label,s.url)+'</div>').join('');
}
function matchesLenderState(lender){
  return lender.states==='all'||(Array.isArray(lender.states)&&lender.states.some(s=>normalizedName(s)===normalizedName(stateSelect.value)));
}
function lenderCard(l){
  const amount=escapeHtml(l.amount||'Not published — confirm with lender');
  const price=escapeHtml(l.rate||'Rate not published on linked page');
  const cats=(l.providerKinds||[]).map(x=>providerLabel([x])).join(' · ');
  return '<article class="lender-card"><div class="card-category"><span class="pill">'+cats+'</span><span class="pill">'+escapeHtml(l.scopeLabel||'PAN INDIA')+'</span></div><h4>'+escapeHtml(l.name)+'</h4><div class="lender-product">'+escapeHtml(l.product||'Agriculture finance')+'</div>'+(l.sponsorBank?'<div class="lender-sponsor">Sponsor bank: '+escapeHtml(l.sponsorBank)+'</div>':'')+'<p>'+escapeHtml(l.summary)+'</p>'+(l.verificationNote?'<div class="lender-verification-note">'+escapeHtml(l.verificationNote)+'</div>':'')+(l.matchRules?.mustVerify?.length?'<div class="lender-match-note">Check: '+escapeHtml(l.matchRules.mustVerify[0])+'</div>':'')+'<div class="lender-facts"><div class="lender-fact"><small>AMOUNT / LIMIT</small><b>'+amount+'</b></div><div class="lender-fact"><small>INTEREST / PRICING</small><b>'+price+'</b></div><div class="lender-fact"><small>ELIGIBLE BORROWER</small><b>'+escapeHtml(l.borrower||'Subject to product criteria')+'</b></div><div class="lender-fact"><small>AVAILABILITY</small><b>'+escapeHtml(l.availability||'Branch and appraisal dependent')+'</b></div></div><div class="lender-footer"><small>'+escapeHtml(l.reviewNote||'Check the product page for current terms.')+'</small><div class="lender-buttons"><button class="details-btn" data-lender-details="'+escapeHtml(l.id)+'">Process & documents</button><a class="apply-btn" href="'+escapeHtml(l.applyUrl||l.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(l.applyLabel||'Apply / enquire')+' ↗</a></div></div></article>';
}
function renderDirectory(){
  if(!$('#directory-schemes')) return;
  const state=stateSelect.value, district=districtSelect.value;
  const query=normalizedName($('#directory-search')?.value||'');
  const type=$('#directory-type')?.value||'all';
  const provider=$('#directory-provider')?.value||'all';
  const schemeHits=records.filter(r=>{
    if(!applicable(r,state,district)||!profileMatch(r,profileSelect.value)) return false;
    if(type!=='all'&&r.type!==type) return false;
    if(!query) return true;
    return normalizedName([r.name,r.category,r.summary,r.eligibility,r.amount,(r.keywords||[]).join(' ')].join(' ')).includes(query);
  });
  $('#directory-location').textContent='Currently showing '+district+', '+state+'. National records are included where applicable; state/district entries are restricted to their stated coverage.';
  $('#directory-scheme-count').textContent=schemeHits.length;
  $('#directory-schemes').innerHTML=schemeHits.length?schemeHits.map(card).join(''):'<div class="no-directory-results">No matching scheme records are catalogued for this location yet. Open the State/District portals below to check current notices.</div>';
  $('#directory-schemes').querySelectorAll('[data-details]').forEach(btn=>btn.addEventListener('click',()=>showDetails(btn.dataset.details)));
  const lenderHits=lenders.filter(l=>{
    if(!matchesLenderState(l)) return false;
    if(provider!=='all'&&!(l.providerKinds||[]).includes(provider)) return false;
    if(!query) return true;
    return normalizedName([l.name,l.product,l.summary,l.borrower,l.purpose,(l.keywords||[]).join(' ')].join(' ')).includes(query);
  });
  $('#directory-lender-count').textContent=lenderHits.length;
  $('#lender-grid').innerHTML=lenderHits.length?lenderHits.map(lenderCard).join(''):'<div class="no-directory-results">No lender products match those filters. Try another provider category or search term.</div>';
  $('#lender-grid').querySelectorAll('[data-lender-details]').forEach(btn=>btn.addEventListener('click',()=>showLenderDetails(btn.dataset.lenderDetails)));
  const p=currentPortal(), d=currentDistrictPortal();
  const portalItems=[
    {type:'STATE AGRICULTURE DEPARTMENT',title:p.agriculture?.label||'Agriculture Department — '+state,description:p.agriculture?.description||'Official agriculture department portal for the selected State/UT.',url:p.agriculture?.url},
    {type:'STATE SCHEME / APPLY PORTAL',title:p.scheme?.label||'State scheme discovery',description:p.scheme?.description||'Current state applications, scheme windows and supporting documents.',url:p.scheme?.url},
    {type:'DISTRICT ADMINISTRATION',title:d.label,description:d.description,url:d.url},
    {type:'PANCHAYAT / BLOCK',title:p.localGovernance?.label||'Panchayat / Block directory',description:p.localGovernance?.description||'Find the local government office, Panchayat and BDO services for '+district+'.',url:p.localGovernance?.url||'https://egramswaraj.gov.in/'},
    {type:'REGIONAL RURAL BANK',title:p.rrb?.name||'No separately listed RRB for '+state,description:p.rrb?.description||'The current DFS list does not separately list an RRB for this State/UT. Use Kisan Rin Portal to identify other eligible bank/cooperative KCC channels.',url:p.rrb?.url||'https://fasalrin.gov.in/'},
    {type:'COOPERATIVE / PACS CREDIT',title:p.cooperative?.label||'Cooperative and KCC delivery channels',description:p.cooperative?.description||'Use the official bank/credit portal and confirm local PACS membership and credit terms.',url:p.cooperative?.url||'https://fasalrin.gov.in/'},
    {type:'NATIONAL SCHEME DISCOVERY',title:'myScheme — '+state,description:'Search Central and State/UT schemes by location, category and eligibility.',url:'https://www.myscheme.gov.in/'}
  ];
  if(p.facilitation) portalItems.splice(2,0,{type:'STATE FACILITATION CENTRE',title:p.facilitation.label,description:p.facilitation.description,url:p.facilitation.url});
  if(p.extra) p.extra.forEach(x=>portalItems.push({type:'ADDITIONAL STATE PORTAL',title:x.label,description:'Official linked State/UT agriculture, horticulture or market institution.',url:x.url}));
  $('#directory-portals').innerHTML=portalItems.map(x=>'<article class="portal-card"><div class="portal-type">'+escapeHtml(x.type)+'</div><h4>'+escapeHtml(x.title)+'</h4><p>'+escapeHtml(x.description)+'</p>'+safeLink('Open official portal',x.url)+'</article>').join('');
}
function showLenderDetails(id){
  const l=lenders.find(x=>x.id===id); if(!l) return;
  $('#dialog-kicker').textContent=(l.providerKinds||[]).map(x=>providerLabel([x])).join(' · ')+' · '+(l.product||'AGRICULTURE FINANCE');
  $('#dialog-title').textContent=l.name+' — '+l.product;
  const makeList=items=>Array.isArray(items)?items.map(x=>'<li>'+escapeHtml(x)+'</li>').join(''):'';
  const sponsor=l.sponsorBank?'<div class="detail-section"><h4>RRB sponsor bank</h4><p>'+escapeHtml(l.sponsorBank)+'</p></div>':'';
  const verification='<div class="detail-section"><h4>Product / geography verification</h4><p>'+escapeHtml(l.verificationNote||'Confirm the current product terms and local service area directly with the institution.')+'</p><p><b>Pricing:</b> '+escapeHtml(l.pricingStatus||'Reconfirm with lender')+'<br><b>District branch:</b> '+escapeHtml(l.branchCoverageStatus||'Not district verified')+'<br><b>Last reviewed:</b> '+escapeHtml(l.lastReviewed||l.reviewDate||'Not stated')+'</p></div>';
  const terms=l.terms?'<div class="detail-section"><h4>Loan terms</h4><p>'+escapeHtml(l.terms)+'</p></div>':'';
  const docs=l.documents?.length?'<div class="detail-section"><h4>Typical documents</h4><ul>'+makeList(l.documents)+'</ul></div>':'';
  const steps=l.process?.length?'<div class="detail-section"><h4>How to apply</h4><ol>'+makeList(l.process)+'</ol></div>':'';
  const sources=(l.sources||[]).map(s=>'<a href="'+escapeHtml(s.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(s.label)+' ↗</a>').join(' ');
  $('#dialog-body').innerHTML=sponsor+'<div class="detail-section"><h4>Loan amount / facility</h4><p><b>'+escapeHtml(l.amount||'Not published')+'</b><br>'+escapeHtml(l.amountNote||'Final amount depends on lender appraisal and current policy.')+'</p></div><div class="detail-section"><h4>Purpose</h4><p>'+escapeHtml(l.purpose||l.summary)+'</p></div><div class="detail-section"><h4>Eligibility</h4><p>'+escapeHtml(l.eligibility||l.borrower||'Subject to lender policy.')+'</p></div>'+verification+terms+docs+steps+'<div class="detail-caution"><b>Important:</b> '+escapeHtml(l.caution||'Confirm current APR, fees, security, repayment schedule and Key Fact Statement before accepting a loan.')+'</div><div class="dialog-links"><a href="'+escapeHtml(l.applyUrl||l.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Apply / enquire ↗</a><a href="'+escapeHtml(l.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Official product source ↗</a></div><div class="detail-section"><h4>Source register</h4><p>'+sources+'</p></div><p style="font-size:8px;color:#929b94;margin-top:12px">Last reviewed: '+escapeHtml(l.reviewDate||'31 Oct 2026')+'. Rates, eligibility, fees, geography and sanctions can change; verify directly with the provider.</p>';
  $('#detail-dialog').showModal();
}


function updateAssistantLocation(){
  const node=$('#assistant-location');
  if(node) node.textContent=stateSelect.value+' · '+districtSelect.value;
  const ns=$('#ngo-state'),nd=$('#ngo-district');
  if(ns&&geography.length)setOptions(ns,stateNames(),stateSelect.value);
  if(nd&&geography.length)setOptions(nd,districtsFor(stateSelect.value),districtSelect.value);
  if(typeof syncMarketLocation==='function')syncMarketLocation();
}
function potentialMatches(profile,land,activity,need){
  return records.filter(r=>{
    if(!applicable(r,stateSelect.value,districtSelect.value) || r.type==='informal' || r.matchRules?.excludeFromAssistant) return false;
    const rules=r.matchRules||{};
    const allowed=rules.profiles||r.profiles||[];
    const womenLandMatch=profile==='women_farmer'&&((land==='owner'&&allowed.includes('owner'))||((land==='tenant'||land==='sharecropper')&&allowed.includes('tenant'))||(land==='landless'&&allowed.includes('allied')));
    if(!allowed.includes(profile)&&!womenLandMatch) return false;
    if(Array.isArray(rules.landStatus) && !rules.landStatus.includes(land)) return false;
    if(activity!=='any' && Array.isArray(rules.activities) && !rules.activities.includes(activity)) return false;
    if(need!=='all' && Array.isArray(rules.supportNeeds) && !rules.supportNeeds.includes(need)) return false;
    return true;
  }).sort((a,b)=>scopeRank(a)-scopeRank(b));
}
function renderEligibilityCard(r){
  const docs=(r.documents||[]).map(x=>'<li>'+escapeHtml(x)+'</li>').join('');
  const checks=(r.matchRules?.mustVerify||['Check the latest official notification, applicant definition and district/season coverage']).map(x=>'<li>'+escapeHtml(x)+'</li>').join('');
  const verified=['official_portal_checked','official_dfs_guidance_checked','official_faq_checked_seasonal_notice_required','official_source_checked','official_source_checked_budget_implementation_caveat'].includes(r.verification?.status);
  const status=verified?'Official source checked':'Source linked · recheck current rules';
  const sourceDate=r.verification?.lastChecked||'Review required';
  return '<article class="eligibility-card"><div class="eligibility-card-top"><span class="pill '+typeClass(r.type)+'">'+typeLabel(r.type)+'</span><span class="match-status">'+status+'</span></div><h3>'+escapeHtml(r.name)+'</h3><p>'+escapeHtml(r.summary)+'</p><div class="eligibility-amount"><small>FINANCIAL SUPPORT</small><b>'+escapeHtml(r.amount)+'</b><span>'+escapeHtml(r.amountNote||'Final value depends on current scheme rules or lender assessment.')+'</span></div><div class="eligibility-two-col"><div><h4>Match note</h4><p>'+escapeHtml(r.matchRules?.status||'Applicant profile and selected location appear in the catalogue coverage.')+'</p></div><div><h4>Verify before applying</h4><ul>'+checks+'</ul></div></div><details class="checklist-details"><summary>View document checklist ('+(r.documents||[]).length+')</summary><ul>'+docs+'</ul></details><div class="eligibility-card-foot"><small>Source review: '+escapeHtml(sourceDate)+'</small><div><button class="details-btn" data-assistant-details="'+escapeHtml(r.id)+'">Full process</button><a class="apply-btn" href="'+escapeHtml(r.application)+'" target="_blank" rel="noopener noreferrer">Official application ↗</a></div></div></article>';
}
function potentialLenders(profile,land,activity,need){
  if(need!=='all'&&need!=='loan') return [];
  return lenders.filter(l=>{
    if(!matchesLenderState(l)) return false;
    const rules=l.matchRules||{};
    if(!Array.isArray(rules.profiles)||!rules.profiles.includes(profile)) return false;
    if(Array.isArray(rules.landStatus)&&!rules.landStatus.includes(land)) return false;
    if(activity!=='any'&&Array.isArray(rules.activities)&&!rules.activities.includes(activity)) return false;
    return true;
  });
}
function runEligibility(event){
  if(event) event.preventDefault();
  const profile=$('#elig-profile').value;
  const land=$('#elig-land').value;
  const activity=$('#elig-activity').value;
  const need=$('#elig-need').value;
  const matches=potentialMatches(profile,land,activity,need);
  const lenderMatches=potentialLenders(profile,land,activity,need);
  const output=$('#eligibility-output');
  let content='<div class="eligibility-results-head"><div><div class="section-kicker">POTENTIAL MATCHES · '+escapeHtml(stateSelect.value.toUpperCase())+'</div><h3>'+(matches.length+lenderMatches.length)+' possible support routes</h3><p>For '+escapeHtml(districtSelect.value)+'. These are catalogue matches, not approval or an official eligibility determination.</p></div><button type="button" class="secondary-action" id="elig-back-directory">Browse full directory</button></div>';
  if(matches.length){
    content+='<div class="eligibility-subhead"><div class="section-kicker">GOVERNMENT & INSTITUTIONAL SCHEME RECORDS</div></div><div class="eligibility-results-grid">'+matches.map(renderEligibilityCard).join('')+'</div>';
  }
  if(lenderMatches.length){
    content+='<div class="eligibility-subhead"><div class="section-kicker">BANK, RRB, COOPERATIVE, SFB & NBFC CREDIT ROUTES</div><p>These products are lender leads only. Verify branch availability, the exact product, rates, fees and your accepted borrower documents.</p></div><div class="lender-grid">'+lenderMatches.map(lenderCard).join('')+'</div>';
  }
  if(!matches.length&&!lenderMatches.length){
    content+='<div class="eligibility-empty"><b>No catalogue matches for this combination yet.</b><span>Try “Show all potential support”, or check the full State/District portal list. An empty result does not prove that no scheme or lender exists.</span></div>';
  }
  output.innerHTML=content;
  output.querySelectorAll('[data-assistant-details]').forEach(btn=>btn.addEventListener('click',()=>showDetails(btn.dataset.assistantDetails)));
  output.querySelectorAll('[data-lender-details]').forEach(btn=>btn.addEventListener('click',()=>showLenderDetails(btn.dataset.lenderDetails)));
  $('#elig-back-directory')?.addEventListener('click',()=>{switchView('directory');renderDirectory();});
}
function resetEligibility(){
  $('#elig-profile').value='owner';$('#elig-land').value='owner';$('#elig-activity').value='crop';$('#elig-need').value='all';
  $('#eligibility-output').innerHTML='<div class="eligibility-empty"><b>Your potential matches will appear here.</b><span>Choose the applicant and farm details, then select Find potential matches.</span></div>';
}
const ngoMetricKeys=['farmersReached','counsellingSessions','applicationsSubmitted','applicationsApproved','benefitsReceived','campsHeld','villagesReached'];
const ngoEmptyMetrics={farmersReached:0,counsellingSessions:0,applicationsSubmitted:0,applicationsApproved:0,benefitsReceived:0,campsHeld:0,villagesReached:0};
let ngoData={organisation:'',role:'',metrics:{...ngoEmptyMetrics},followups:[]};
let ngoBackendReady=false;
function showNGOStatus(title,message,code=''){
  const node=$('#ngo-workspace-status');if(!node)return;
  node.hidden=false;
  const signIn=['ACCESS_SIGN_IN_REQUIRED','NGO_USER_NOT_PROVISIONED','ACCESS_ASSERTION_INVALID'].includes(code)?'<a class="secondary-action" href="/api/ngo/workspace" target="_blank" rel="noopener">Open secure sign-in ↗</a>':'';
  const setup=code==='NGO_BACKEND_NOT_CONFIGURED'?'<a class="secondary-action" href="CLOUDFLARE_SETUP_V3.md" target="_blank">Open administrator setup guide ↗</a>':'';
  node.innerHTML='<div class="ngo-status-icon">🔐</div><div class="ngo-status-copy"><b>'+escapeHtml(title)+'</b><span>'+escapeHtml(message)+'</span></div><div class="ngo-status-actions">'+signIn+setup+'<button class="primary-action" type="button" id="ngo-status-refresh">Check again</button></div>';
  $('#ngo-status-refresh')?.addEventListener('click',loadNGOWorkspace);
}
function populateNGOSelectors(){
  const state=$('#ngo-state'),district=$('#ngo-district');if(!state||!district)return;
  setOptions(state,stateNames(),stateSelect.value);setOptions(district,districtsFor(state.value),districtSelect.value);
  state.addEventListener('change',()=>setOptions(district,districtsFor(state.value)));
}
function renderNGOWorkspace(){
  const ready=$('#ngo-workspace-ready');if(!ready)return;ready.hidden=!ngoBackendReady;if(!ngoBackendReady)return;
  const m=ngoData.metrics||ngoEmptyMetrics;
  ngoMetricKeys.forEach(k=>{const el=document.querySelector('[data-ngo-metric="'+k+'"]');if(el)el.value=Number(m[k])||0;});
  $('#ngo-reached-total').textContent=Number(m.farmersReached)||0;
  $('#ngo-app-total').textContent=Number(m.applicationsSubmitted)||0;
  $('#ngo-approval-rate').textContent=m.applicationsSubmitted?Math.round((m.applicationsApproved/m.applicationsSubmitted)*100)+'%':'—';
  $('#ngo-benefit-total').textContent=Number(m.benefitsReceived)||0;
  $('#ngo-org-label').textContent='Organisation: '+ngoData.organisation;$('#ngo-role-label').textContent='Role: '+ngoData.role;
  $('#ngo-sync-label').textContent=m.updatedAt?'Last saved '+new Date(m.updatedAt).toLocaleString('en-IN'):'Connected to secure database';
  const readonly=ngoData.role==='viewer';
  document.querySelectorAll('[data-ngo-metric]').forEach(el=>el.disabled=readonly);
  $('#ngo-save-metrics').disabled=readonly;
  $('#ngo-followup-form').querySelectorAll('input,select,button').forEach(el=>el.disabled=readonly);
  const list=$('#ngo-followup-list');
  if(!ngoData.followups.length){list.innerHTML='<div class="no-directory-results">No references added yet. Use an internal code only. Do not include any person-specific details.</div>';return;}
  list.innerHTML='<div class="ngo-table-wrap"><table class="ngo-table"><thead><tr><th>Internal reference</th><th>Location</th><th>Support route</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>'+ngoData.followups.map(x=>'<tr><td><b>'+escapeHtml(x.ref)+'</b></td><td>'+escapeHtml(x.district)+', '+escapeHtml(x.state)+'</td><td>'+escapeHtml(x.support)+'</td><td><span class="ngo-stage">'+escapeHtml(x.status)+'</span></td><td>'+escapeHtml(x.date)+'</td><td>'+(ngoData.role==='admin'?'<button class="ngo-remove" type="button" data-delete-ngo-ref="'+escapeHtml(x.id)+'" aria-label="Delete internal reference">×</button>':'')+'</td></tr>').join('')+'</tbody></table></div>';
  list.querySelectorAll('[data-delete-ngo-ref]').forEach(btn=>btn.addEventListener('click',()=>deleteNGOFollowup(btn.dataset.deleteNgoRef)));
}
async function loadNGOWorkspace(){
  showNGOStatus('Checking secure NGO workspace…','Connecting to the protected Cloudflare Access and D1 service.');
  try{
    const response=await fetch('/api/ngo/workspace',{credentials:'same-origin',cache:'no-store'});
    const contentType=response.headers.get('content-type')||'';
    const data=contentType.includes('application/json')?await response.json().catch(()=>({error:'The secure workspace returned invalid JSON.'})):{};
    if(!response.ok||!contentType.includes('application/json')){
      ngoBackendReady=false;$('#ngo-workspace-ready').hidden=true;
      const code=data.code||(response.status===401?'ACCESS_SIGN_IN_REQUIRED':'NGO_API_UNAVAILABLE');
      const title=code==='NGO_BACKEND_NOT_CONFIGURED'?'Secure workspace needs administrator setup':response.status===401?'Sign in with your organisation account':response.status===403?'Access is restricted to authorised NGO members':'Secure workspace unavailable';
      const detail=code==='NGO_BACKEND_NOT_CONFIGURED'?'D1, Access and environment variables are not yet configured. No NGO data is being saved. Required: '+(data.required||[]).join(' · '):(data.error||'The request could not be authorised.');
      showNGOStatus(title,detail,code);return;
    }
    ngoData={organisation:data.organisation,role:data.role,metrics:{...ngoEmptyMetrics,...(data.metrics||{})},followups:Array.isArray(data.followups)?data.followups:[]};
    ngoBackendReady=true;$('#ngo-workspace-status').hidden=true;renderNGOWorkspace();
  }catch(error){ngoBackendReady=false;$('#ngo-workspace-ready').hidden=true;showNGOStatus('Could not connect to secure workspace','Check the network and try again. This page does not save NGO data in local browser storage.');}
}
async function saveNGOMetrics(){
  if(!ngoBackendReady||ngoData.role==='viewer')return;
  const payload={};ngoMetricKeys.forEach(k=>{const el=document.querySelector('[data-ngo-metric="'+k+'"]');payload[k]=Math.max(0,Math.min(10000000,Math.floor(Number(el?.value)||0)));});
  if(payload.applicationsApproved>payload.applicationsSubmitted){$('#ngo-save-status').textContent='Approved applications cannot exceed submitted applications.';return;}
  const button=$('#ngo-save-metrics');button.disabled=true;$('#ngo-save-status').textContent='Saving securely…';
  try{const response=await fetch('/api/ngo/metrics',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Could not save the metrics.');$('#ngo-save-status').textContent=data.message||'Saved to organisation database.';await loadNGOWorkspace();}
  catch(error){$('#ngo-save-status').textContent=error.message;}
  finally{button.disabled=false;}
}
async function addNGOFollowup(event){
  event.preventDefault();if(!ngoBackendReady||ngoData.role==='viewer')return;
  const ref=$('#ngo-ref').value.trim().replace(/[^A-Za-z0-9_-]/g,'-').replace(/-+/g,'-').slice(0,40);
  const payload={ref,state:$('#ngo-state').value,district:$('#ngo-district').value,support:$('#ngo-support').value,status:$('#ngo-case-status').value};
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/.test(ref)){$('#ngo-save-status').textContent='Use 3–40 characters: letters, numbers, hyphens or underscores.';return;}
  const button=$('#ngo-followup-form button[type="submit"]');button.disabled=true;
  try{const response=await fetch('/api/ngo/followups',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Could not add the follow-up reference.');$('#ngo-ref').value='';$('#ngo-save-status').textContent='Reference saved in the organisation database.';await loadNGOWorkspace();}
  catch(error){$('#ngo-save-status').textContent=error.message;}
  finally{button.disabled=false;}
}
async function deleteNGOFollowup(id){
  if(!ngoBackendReady||ngoData.role!=='admin'||!confirm('Delete this internal follow-up reference from the organisation database?'))return;
  try{const response=await fetch('/api/ngo/followups/'+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Delete failed.');await loadNGOWorkspace();}
  catch(error){$('#ngo-save-status').textContent=error.message;}
}
function exportNGOCSV(){
  if(!ngoBackendReady)return;
  const rows=[['Internal reference','State','District','Support route','Status','Date'],...ngoData.followups.map(x=>[x.ref,x.state,x.district,x.support,x.status,x.date])];
  const quote=x=>{let value=String(x??'');if(/^\s*[=+@-]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';};
  const csv=rows.map(row=>row.map(quote).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='agribridge-organisation-followups.csv';link.click();URL.revokeObjectURL(url);
}
function initNGOWorkspace(){
  populateNGOSelectors();
  $('#ngo-save-metrics')?.addEventListener('click',saveNGOMetrics);
  $('#ngo-followup-form')?.addEventListener('submit',addNGOFollowup);
  $('#ngo-export')?.addEventListener('click',exportNGOCSV);
  $('#ngo-refresh')?.addEventListener('click',loadNGOWorkspace);
  loadNGOWorkspace();
}

const inrMoney=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value)||0);
function calculateMonthlyIrr(netReceived,emi,months){
  if(!(netReceived>0)||!(emi>=0)||!(months>0))return null;
  const npv=rate=>{let value=netReceived;for(let month=1;month<=months;month++)value-=emi/Math.pow(1+rate,month);return value;};
  if(Math.abs(npv(0))<0.0001)return 0;
  let low=0,high=1;while(npv(high)<0&&high<100)high*=2;if(npv(high)<0)return null;
  for(let i=0;i<100;i++){const mid=(low+high)/2;if(npv(mid)>0)high=mid;else low=mid;}
  return (1+(low+high)/2)**12-1;
}
function computeLoanOffer(principal,months,method,annualRate,feePercent,otherFees){
  const monthlyRate=annualRate/1200;let emi=0,totalInterest=0;
  if(method==='flat'){totalInterest=principal*(annualRate/100)*(months/12);emi=(principal+totalInterest)/months;}
  else if(monthlyRate===0){emi=principal/months;}
  else{const factor=Math.pow(1+monthlyRate,months);emi=principal*monthlyRate*factor/(factor-1);totalInterest=emi*months-principal;}
  const processingFee=principal*feePercent/100,fees=processingFee+otherFees,netReceived=principal-fees,repayments=emi*months;
  const effectiveRate=calculateMonthlyIrr(netReceived,emi,months);
  return {emi,totalInterest,processingFee,fees,netReceived,repayments,allInCost:repayments+fees-principal,effectiveApr:effectiveRate===null?null:effectiveRate*100};
}
function renderLoanComparison(){
  const principal=Number($('#loan-principal')?.value),months=Number($('#loan-tenure')?.value),method=$('#loan-method')?.value||'reducing';
  const rates=[Number($('#offer-a-rate')?.value),Number($('#offer-b-rate')?.value)],feeRates=[Number($('#offer-a-fee')?.value),Number($('#offer-b-fee')?.value)],otherFees=[Number($('#offer-a-other')?.value),Number($('#offer-b-other')?.value)];
  const output=$('#loan-comparison-output');if(!output)return;
  if(!(principal>=1000&&principal<=100000000)||!(months>=1&&months<=360)||[...rates,...feeRates,...otherFees].some(x=>!Number.isFinite(x)||x<0)||rates.some(x=>x>60)||feeRates.some(x=>x>20)||feeRates.some((fee,i)=>principal*fee/100+otherFees[i]>=principal)){output.innerHTML='<div class="loan-calc-placeholder error">Enter a principal from ₹1,000 to ₹10 crore, tenure 1–360 months, annual rate 0–60%, processing fee 0–20% and non-negative charges.</div>';return;}
  const offers=[computeLoanOffer(principal,months,method,rates[0],feeRates[0],otherFees[0]),computeLoanOffer(principal,months,method,rates[1],feeRates[1],otherFees[1])];
  const rows=offers.map((o,i)=>'<article class="loan-result-card"><div class="loan-result-head"><b>Offer '+(i?'B':'A')+'</b><span>'+escapeHtml(method==='flat'?'Flat rate':'Reducing balance')+'</span></div><div class="loan-result-emi"><small>ESTIMATED MONTHLY EMI</small><strong>'+inrMoney(o.emi)+'</strong></div><div class="loan-result-lines"><div><span>Net amount credited</span><b>'+inrMoney(o.netReceived)+'</b></div><div><span>Total interest (before fees)</span><b>'+inrMoney(o.totalInterest)+'</b></div><div><span>Upfront fees / charges</span><b>'+inrMoney(o.fees)+'</b></div><div><span>Total repayment</span><b>'+inrMoney(o.repayments)+'</b></div><div><span>All-in financing cost</span><b>'+inrMoney(o.allInCost)+'</b></div><div class="apr-line"><span>Estimated effective annual APR</span><b>'+(o.effectiveApr===null?'Not calculable':o.effectiveApr.toFixed(2)+'%')+'</b></div></div></article>').join('');
  const difference=Math.abs(offers[0].allInCost-offers[1].allInCost),winner=offers[0].allInCost<=offers[1].allInCost?'A':'B';
  output.innerHTML='<div class="loan-results-summary"><b>Comparison result:</b> Offer '+winner+' has the lower estimated all-in financing cost by '+inrMoney(difference)+' over '+months+' months, assuming the entered fees and repayment method.</div><div class="loan-result-grid">'+rows+'</div>';
}
function initLoanComparator(){
  $('#calculate-loans')?.addEventListener('click',renderLoanComparison);
  ['loan-principal','loan-tenure','loan-method','offer-a-rate','offer-a-fee','offer-a-other','offer-b-rate','offer-b-fee','offer-b-other'].forEach(id=>$('#'+id)?.addEventListener('change',renderLoanComparison));
  renderLoanComparison();
}
function syncMarketLocation(){
  const state=$('#market-state'),district=$('#market-district');if(!state||!district||!geography.length)return;
  setOptions(state,stateNames(),stateSelect.value);setOptions(district,districtsFor(state.value),districtSelect.value);
}
function renderMandiPrices(records,meta={}){
  const node=$('#market-price-results');if(!node)return;
  if(!records||!records.length){node.innerHTML='<div class="market-price-placeholder">No records were returned for these filters. Try a broader commodity spelling, remove the district filter or open the official AGMARKNET portal.</div>';return;}
  const sorted=[...records].sort((a,b)=>String(b.arrivalDate||'').localeCompare(String(a.arrivalDate||'')));
  node.innerHTML='<div class="market-results-top"><b>'+sorted.length+' mandi price records</b><span>Retrieved '+escapeHtml(new Date(meta.retrievedAt||Date.now()).toLocaleString('en-IN'))+'</span></div><div class="market-price-table-wrap"><table class="market-price-table"><thead><tr><th>Market</th><th>Commodity / variety</th><th>Arrival date</th><th>Min (₹/q)</th><th>Modal (₹/q)</th><th>Max (₹/q)</th></tr></thead><tbody>'+sorted.map(x=>'<tr><td><b>'+escapeHtml(x.market)+'</b><small>'+escapeHtml(x.district)+', '+escapeHtml(x.state)+'</small></td><td>'+escapeHtml(x.commodity)+'<small>'+escapeHtml([x.variety,x.grade].filter(Boolean).join(' · '))+'</small></td><td>'+escapeHtml(x.arrivalDate||'—')+'</td><td>'+inrMoney(x.minPrice)+'</td><td><b>'+inrMoney(x.modalPrice)+'</b></td><td>'+inrMoney(x.maxPrice)+'</td></tr>').join('')+'</tbody></table></div>';
}
async function loadMandiPrices(event){
  if(event)event.preventDefault();
  const status=$('#market-price-status'),button=$('#market-search-button');if(!status)return;
  const params=new URLSearchParams(),state=$('#market-state')?.value||stateSelect.value,district=$('#market-district')?.value||'',commodity=$('#market-commodity')?.value.trim()||'',limit=$('#market-limit')?.value||'40';
  if(state)params.set('state',state);if(district)params.set('district',district);if(commodity)params.set('commodity',commodity);params.set('limit',limit);
  if(button)button.disabled=true;status.textContent='Requesting published daily mandi records from the official OGD dataset…';
  try{
    const response=await fetch('/api/market-prices?'+params.toString(),{cache:'no-store'});
    const data=await response.json().catch(()=>({error:'The market price service returned an unreadable response.'}));
    if(!response.ok){const detail=data.code==='DATA_GOV_IN_API_KEY_REQUIRED'?'The server-side OGD API key is not configured yet. The key is intentionally not stored in this page. Open the Cloudflare setup guide or use the official source below.':(data.error||'Mandi data is temporarily unavailable.');status.textContent=detail;$('#market-price-results').innerHTML='<div class="market-price-placeholder">Live feed unavailable. Use the official AGMARKNET / OGD source link below or enable the server secret in Cloudflare.</div>';return;}
    status.textContent='Source: '+(data.source||'Official daily mandi dataset')+' · '+(data.total??data.count??data.records?.length??0)+' matching records in the source response. Not every mandi reports every commodity every day.';
    renderMandiPrices(data.records||[],data);
  }catch(error){status.textContent='Could not connect to the mandi data service. Try again later.';}
  finally{if(button)button.disabled=false;}
}
function initMarketPrices(){
  syncMarketLocation();
  $('#market-price-form')?.addEventListener('submit',loadMandiPrices);
  $('#market-state')?.addEventListener('change',()=>setOptions($('#market-district'),districtsFor($('#market-state').value)));
}

function scopeRank(r){return r.scope==='district'?0:r.scope==='state'?1:r.scope==='national'?2:3;}
function showDetails(id){
  const r=records.find(x=>x.id===id);if(!r)return;
  $('#dialog-kicker').textContent=`${typeLabel(r.type)} · ${r.category}`;
  $('#dialog-title').textContent=r.name;
  const steps=r.process.map(x=>`<li>${escapeHtml(x)}</li>`).join('');
  const docs=(r.documents||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('');
  const verification=r.verification?.note||'Confirm the latest official order, scheme window and district notification before applying.';
  const extraSources=(r.sources||[]).map(s=>`<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)} ↗</a>`).join(' ');
  const validity=r.programmeStatusLabel?`<div class="detail-section"><h4>Application status</h4><p><b>${escapeHtml(r.programmeStatusLabel)}</b></p></div>`:'';
  $('#dialog-body').innerHTML=`
    <div class="detail-section"><h4>Financial value</h4><p><b>${escapeHtml(r.amount)}</b><br>${escapeHtml(r.amountNote)}</p></div>
    <div class="detail-section"><h4>What it provides</h4><p>${escapeHtml(r.summary)}</p></div>
    <div class="detail-section"><h4>Eligibility</h4><p>${escapeHtml(r.eligibility)}</p></div>
    <div class="detail-section"><h4>How to apply</h4><ol>${steps}</ol></div>
    <div class="detail-section"><h4>Typical document checklist</h4><ul>${docs}</ul></div>
    ${validity}
    <div class="detail-section"><h4>Source / verification status</h4><p>${escapeHtml(verification)}</p>${extraSources?`<p>${extraSources}</p>`:''}</div>
    ${r.rate?`<div class="detail-section"><h4>Interest / financial terms</h4><p>${escapeHtml(r.rate)}</p></div>`:''}
    <div class="detail-caution"><b>Important:</b> ${escapeHtml(r.caution)}</div>
    <div class="dialog-links"><a href="${escapeHtml(r.application)}" target="_blank" rel="noopener">${escapeHtml(r.applicationLabel||'Application / official route')} ↗</a><a href="${escapeHtml(r.source)}" target="_blank" rel="noopener">Source: ${escapeHtml(r.sourceLabel)} ↗</a></div>
    <p style="font-size:8px;color:#929b94;margin-top:12px">Source review: ${escapeHtml(r.sourceDate)} · Final eligibility, loan amount, interest and approval remain with the implementing authority/lender.</p>`;
  $('#detail-dialog').showModal();
}

function renderStateWorkstreams(stateName){
  const node=$('#state-workstream-register');if(!node)return;
  if(!stateProgrammeData){node.innerHTML='<p>State programme research register is loading or unavailable.</p>';return;}
  const row=stateProgrammeData.states.find(x=>normalizedName(x.stateUT)===normalizedName(stateName));
  if(!row){node.innerHTML='<p>No State research record is available in the register.</p>';return;}
  $('#state-workstream-title').textContent=row.stateUT+' · nine workstreams';
  const linked=(row.workstreams||[]).filter(x=>x.status==='partial_source_linked').length;
  $('#state-workstream-count').textContent=linked+' / '+(row.workstreams||[]).length+' workstreams source-linked';
  node.innerHTML='<div class="state-workstream-summary"><b>'+row.namedSchemeRecordCount+' named State-specific records</b><span>'+escapeHtml(row.notes)+'</span></div><div class="state-workstream-grid">'+(row.workstreams||[]).map(w=>{
    const isLinked=w.status==='partial_source_linked';
    const ids=(w.recordIds||[]).map(id=>{const rec=records.find(r=>r.id===id);return rec?'<a href="#" data-workstream-record="'+escapeHtml(id)+'">'+escapeHtml(rec.name)+'</a>':'';}).filter(Boolean).join(', ');
    const evidence=w.evidenceUrl?'<a class="workstream-source" href="'+escapeHtml(w.evidenceUrl)+'" target="_blank" rel="noopener">Official source ↗</a>':'';
    return '<article class="state-workstream-card"><div class="state-workstream-card-head"><b>'+escapeHtml(w.label)+'</b><span class="state-workstream-status '+(isLinked?'linked':'pending')+'">'+(isLinked?'PARTIAL · SOURCED':'RESEARCH PENDING')+'</span></div>'+(ids?'<div class="state-workstream-records">'+ids+'</div>':'<p>No named State-specific programme record in this release.</p>')+'<small>'+escapeHtml(w.nextAction)+'</small>'+evidence+'</article>';
  }).join('')+'</div>';
  node.querySelectorAll('[data-workstream-record]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();showDetails(link.dataset.workstreamRecord);}));
}
function renderCoverageDetails(stateName){
  if(!coverageData)return;
  const row=coverageData.states.find(x=>normalizedName(x.stateUT)===normalizedName(stateName));
  if(!row)return;
  $('#coverage-selected-state').textContent=row.stateUT;
  $('#coverage-district-count').textContent=row.communityDistrictSnapshotCount+' district snapshot entries';
  $('#coverage-selected-detail').innerHTML='<div class="coverage-selected-grid">'+
    '<div><small>STATE AGRICULTURE PORTAL</small><b>'+(row.agricultureDepartmentUrl?'<a href="'+escapeHtml(row.agricultureDepartmentUrl)+'" target="_blank" rel="noopener">Open State/UT portal ↗</a>':'Not mapped')+'</b></div>'+
    '<div><small>STATE-SPECIFIC SCHEME RECORDS</small><b>'+row.stateSchemeRecordCount+' · '+escapeHtml(row.stateSchemeInventoryStatus.replaceAll('_',' '))+'</b></div>'+
    '<div><small>DIRECT DISTRICT WEBSITE LINKS</small><b>'+row.directDistrictWebsitesMapped+' / '+row.communityDistrictSnapshotCount+'</b></div>'+
    '<div><small>REGIONAL RURAL BANK</small><b>'+(row.rrb?escapeHtml(row.rrb.name):'No separate RRB listed in current DFS list')+'</b></div>'+
    '<div><small>LENDER CATALOGUE ENTRIES</small><b>'+row.lenderCatalogueEnquiryEntries+' · branch presence not verified</b></div>'+
    '<div><small>BLOCK / PANCHAYAT INVENTORY</small><b>Official LGD mapping pending or incomplete</b></div></div>'+
    '<p class="coverage-detail-note">'+escapeHtml(row.recordsStatusNote)+' The district list below uses the current geography source label: '+escapeHtml(geographySourceLabel)+'.</p>';
  $('#coverage-district-list').innerHTML=(row.districts||[]).map(d=>{
    const hasDirect=Boolean(d.directDistrictWebsite),hasScheme=(d.districtProgrammeRecordIds||[]).length>0;
    return '<div class="coverage-district-row"><div><b>'+escapeHtml(d.name)+'</b><small>'+(hasScheme?'District programme: '+escapeHtml(d.districtProgrammeRecordIds.join(', ')):'No district-specific programme record catalogued')+'</small></div><span class="coverage-district-status '+(hasScheme?'mapped':'pending')+'">'+(hasScheme?'PROGRAMME RECORD':'RESEARCH PENDING')+'</span><a href="'+escapeHtml(d.districtWebsiteDiscoveryUrl)+'" target="_blank" rel="noopener">'+(hasDirect?'District site ↗':'Official directory ↗')+'</a><button type="button" class="coverage-inspect-district" data-coverage-district="'+escapeHtml(d.name)+'">Use location</button></div>';
  }).join('');
  $('#coverage-district-list').querySelectorAll('[data-coverage-district]').forEach(btn=>btn.addEventListener('click',()=>{
    stateSelect.value=row.stateUT;populateDistricts(btn.dataset.coverageDistrict);switchView('finance');
  }));
  renderStateWorkstreams(row.stateUT);
}
function updateCoverageList(){
  if(!coverageData)return;
  const rows=coverageData.states||[],query=normalizedName($('#coverage-search')?.value||''),found=rows.filter(x=>normalizedName(x.stateUT).includes(query));
  $('#state-count').textContent=rows.length+' States & UTs';
  $('#coverage-scheme-count').textContent=coverageData.nationalCatalogue.schemeRecordCount;
  $('#coverage-lender-count').textContent=coverageData.nationalCatalogue.lenderProductRecordCount;
  $('#coverage-state-record-count').textContent=coverageData.stateInventory.statesWithAtLeastOneStateSpecificScheme;
  $('#coverage-v25-stats').innerHTML='<article><small>STATES & UNION TERRITORIES</small><strong>'+coverageData.geography.stateAndUTCount+'</strong><span>State/UT portal register</span></article><article><small>DISTRICT ENTRIES</small><strong>'+coverageData.geography.districtEntryCount+'</strong><span>'+escapeHtml(geographySourceLabel)+'</span></article><article><small>SCHEME / BENEFIT RECORDS</small><strong>'+coverageData.nationalCatalogue.schemeRecordCount+'</strong><span>Central + State-specific records</span></article><article><small>LENDER / FINANCE ENTRIES</small><strong>'+coverageData.nationalCatalogue.lenderProductRecordCount+'</strong><span>Product catalogue · branch checks pending</span></article>';
  $('#state-coverage-list').innerHTML=found.map(x=>{
    const stateStatus=x.stateSchemeRecordCount?'PARTIAL · SOURCED':'PORTAL LINKED · RESEARCH PENDING';
    const cls=x.stateSchemeRecordCount?'wb':'pending';
    return '<div class="state-row-v25"><div><b>'+escapeHtml(x.stateUT)+'</b><small>'+x.communityDistrictSnapshotCount+' district entries · '+x.directDistrictWebsitesMapped+' direct district sites</small></div><span class="state-coverage-status '+cls+'">'+stateStatus+'</span><span class="state-rrb">'+(x.rrb?escapeHtml(x.rrb.name):'No separate RRB listed')+'</span><button type="button" class="secondary-action" data-coverage-state="'+escapeHtml(x.stateUT)+'">Inspect</button></div>';
  }).join('');
  $('#state-coverage-list').querySelectorAll('[data-coverage-state]').forEach(btn=>btn.addEventListener('click',()=>renderCoverageDetails(btn.dataset.coverageState)));
  const selected=rows.find(x=>normalizedName(x.stateUT)===normalizedName(stateSelect.value))||rows[0];
  if(selected)renderCoverageDetails(selected.stateUT);
}
function switchView(view){
  selectedView=view;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}

Promise.all([recordsPromise,lendersPromise,portalsPromise,loadGeography()]).then(([data,lenderData,portalData])=>{
  records=data;
  lenders=lenderData;
  portals=portalData;
  initNGOWorkspace();
  render();
  initLoanComparator();
  initMarketPrices();
  coveragePromise.then(data=>{coverageData=data;updateCoverageList();}).catch(error=>console.warn('Coverage register could not be loaded',error));
  stateProgrammePromise.then(data=>{stateProgrammeData=data;renderStateWorkstreams(stateSelect.value);}).catch(error=>console.warn('State programme research register could not be loaded',error));
}).catch(err=>{
  console.error(err);
  $('#results').innerHTML='<div class="empty-state"><h3>Directory data could not be loaded</h3><p>Check that the project is being served from its root folder and that schemes.json is available.</p></div>';
});
stateSelect.addEventListener('change',()=>{populateDistricts();resetEligibility();});
districtSelect.addEventListener('change',()=>{resetEligibility();render();});
profileSelect.addEventListener('change',render);
typeSelect.addEventListener('change',render);
providerSelect.addEventListener('change',render);
sortSelect.addEventListener('change',render);
['directory-search','directory-type','directory-provider'].forEach(id=>$('#'+id)?.addEventListener('input',renderDirectory));
$('#directory-type')?.addEventListener('change',renderDirectory);
$('#directory-provider')?.addEventListener('change',renderDirectory);
$('#reset-filters').addEventListener('click',()=>{stateSelect.value='West Bengal';profileSelect.value='all';typeSelect.value='all';providerSelect.value='all';sortSelect.value='relevance';populateDistricts('Paschim Medinipur');});
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{switchView(btn.dataset.view);if(btn.dataset.view==='directory')renderDirectory();if(btn.dataset.view==='assistant'||btn.dataset.view==='ngo')updateAssistantLocation();}));
$('#dialog-close').addEventListener('click',()=>$('#detail-dialog').close());
$('#detail-dialog').addEventListener('click',e=>{if(e.target===$('#detail-dialog'))$('#detail-dialog').close();});

$('#eligibility-form')?.addEventListener('submit',runEligibility);
$('#elig-reset')?.addEventListener('click',resetEligibility);
$('#coverage-search')?.addEventListener('input',updateCoverageList);
