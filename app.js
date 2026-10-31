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
const fallbackStatesPromise = fetch('geography-fallback.json').then(r => r.json());
const districtSource = 'https://raw.githubusercontent.com/CodingMation/indian-states-districts/main/data/india_states_districts.json';
let records = [];
let lenders = [];
let portals = {};
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
  try{
    const response=await fetch(districtSource,{cache:'no-cache'});
    if(!response.ok) throw new Error('district source unavailable');
    const raw=await response.json();
    geography=raw.map(s=>({code:s.code,name:s.name,districts:s.districts||[]}));
    geographyLive=true;
  }catch(error){
    const states=await fallbackStatesPromise;
    // Keep the district arrays bundled in geography-fallback.json.
    geography=states.map(s=>({code:s.code,name:s.name,districts:Array.isArray(s.districts)?s.districts:[]}));
    const wb=geography.find(s=>s.code==='WB');
    if(wb && !wb.districts.length) wb.districts=wbFallbackDistricts.map(name=>({name}));
    geographyLive=false;
  }
  const liveLabel=document.querySelector('.live-label');
  if(liveLabel) liveLabel.innerHTML='<i></i> '+(geographyLive?'LIVE DISTRICT DATA':'OFFLINE DISTRICT DATA');
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
function profileMatch(record,profile){ return profile==='all'||record.profiles.includes(profile); }
function typeClass(type){return type==='grant'?'grant':type==='loan'?'loan':type==='insurance'?'insurance':type==='informal'?'informal':type==='institution'?'institution':'subsidy';}
function typeLabel(type){return ({grant:'GRANT / DBT',loan:'LOAN / CREDIT',subsidy:'SUBSIDY / INTEREST SUPPORT',insurance:'INSURANCE',informal:'INFORMAL · RISK',institution:'ACCESS POINT'})[type]||type.toUpperCase();}
function providerLabel(kinds=[]){const labels={'central-government':'CENTRAL GOVT','state-government':'STATE GOVT','public-bank':'PUBLIC BANK','private-bank':'PRIVATE BANK','small-finance-bank':'SMALL FINANCE BANK','rrb':'RRB','cooperative':'COOPERATIVE / PACS','regulated-nbfc':'REGULATED NBFC','local-body':'PANCHAYAT / BLOCK','informal':'INFORMAL'};return [...new Set(kinds)].map(k=>labels[k]||k.toUpperCase()).join(' · ')||'PROVIDER NOT TAGGED';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function card(record){
  const state=stateSelect.value;
  const district=districtSelect.value;
  const scope=record.scope==='national'?'PAN INDIA':record.scope==='district'?'DISTRICT MATCH':record.scope==='local'?'LOCAL CHANNEL':'STATE SCHEME';
  const amount=escapeHtml(record.amount);
  const rate=record.rate?`<div class="meta-cell"><small>INTEREST / SUPPORT</small><span>${escapeHtml(record.rate)}</span></div>`:'';
  return `<article class="scheme-card">
    <div class="card-top"><div class="card-category"><span class="pill ${typeClass(record.type)}">${typeLabel(record.type)}</span><span class="pill">${escapeHtml(record.category)}</span><span class="pill provider-pill">${escapeHtml(providerLabel(record.providerKinds))}</span></div><span class="scope-mini">${scope}</span></div>
    <h4>${escapeHtml(record.name)}</h4><p class="scheme-summary">${escapeHtml(record.summary)}</p>
    <div class="amount-row"><small>AMOUNT / CREDIT QUANTUM</small><strong>${amount}</strong><em>${escapeHtml(record.amountNote)}</em></div>
    <div class="card-meta"><div class="meta-cell"><small>WHO MAY QUALIFY</small><span>${escapeHtml(record.eligibility.split('.')[0])}</span></div><div class="meta-cell"><small>APPLICATION ROUTE</small><span>${escapeHtml(record.process[0])}</span></div>${rate}</div>
    <div class="card-actions"><span class="evidence">Official source linked</span><button class="details-btn" data-details="${record.id}">View process</button><a class="apply-btn" href="${escapeHtml(record.application)}" target="_blank" rel="noopener">Official link ↗</a></div>
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
  $('#results').querySelectorAll('[data-details]').forEach(btn=>btn.addEventListener('click',()=>showDetails(btn.dataset.details)));
  renderLocalAccess();
  renderDirectory();
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
  return '<article class="lender-card"><div class="card-category"><span class="pill">'+cats+'</span><span class="pill">'+escapeHtml(l.scopeLabel||'PAN INDIA')+'</span></div><h4>'+escapeHtml(l.name)+'</h4><div class="lender-product">'+escapeHtml(l.product||'Agriculture finance')+'</div><p>'+escapeHtml(l.summary)+'</p><div class="lender-facts"><div class="lender-fact"><small>AMOUNT / LIMIT</small><b>'+amount+'</b></div><div class="lender-fact"><small>INTEREST / PRICING</small><b>'+price+'</b></div><div class="lender-fact"><small>ELIGIBLE BORROWER</small><b>'+escapeHtml(l.borrower||'Subject to product criteria')+'</b></div><div class="lender-fact"><small>AVAILABILITY</small><b>'+escapeHtml(l.availability||'Branch and appraisal dependent')+'</b></div></div><div class="lender-footer"><small>'+escapeHtml(l.reviewNote||'Check the product page for current terms.')+'</small><div class="lender-buttons"><button class="details-btn" data-lender-details="'+escapeHtml(l.id)+'">Process & documents</button><a class="apply-btn" href="'+escapeHtml(l.applyUrl||l.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(l.applyLabel||'Apply / enquire')+' ↗</a></div></div></article>';
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
  const terms=l.terms?'<div class="detail-section"><h4>Loan terms</h4><p>'+escapeHtml(l.terms)+'</p></div>':'';
  const docs=l.documents?.length?'<div class="detail-section"><h4>Typical documents</h4><ul>'+makeList(l.documents)+'</ul></div>':'';
  const steps=l.process?.length?'<div class="detail-section"><h4>How to apply</h4><ol>'+makeList(l.process)+'</ol></div>':'';
  const sources=(l.sources||[]).map(s=>'<a href="'+escapeHtml(s.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(s.label)+' ↗</a>').join(' ');
  $('#dialog-body').innerHTML='<div class="detail-section"><h4>Loan amount / facility</h4><p><b>'+escapeHtml(l.amount||'Not published')+'</b><br>'+escapeHtml(l.amountNote||'Final amount depends on lender appraisal and current policy.')+'</p></div><div class="detail-section"><h4>Purpose</h4><p>'+escapeHtml(l.purpose||l.summary)+'</p></div><div class="detail-section"><h4>Eligibility</h4><p>'+escapeHtml(l.eligibility||l.borrower||'Subject to lender policy.')+'</p></div>'+terms+docs+steps+'<div class="detail-caution"><b>Important:</b> '+escapeHtml(l.caution||'Confirm current APR, fees, security, repayment schedule and Key Fact Statement before accepting a loan.')+'</div><div class="dialog-links"><a href="'+escapeHtml(l.applyUrl||l.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Apply / enquire ↗</a><a href="'+escapeHtml(l.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Official product source ↗</a></div><div class="detail-section"><h4>Source register</h4><p>'+sources+'</p></div><p style="font-size:8px;color:#929b94;margin-top:12px">Last reviewed: '+escapeHtml(l.reviewDate||'31 Oct 2026')+'. Rates, eligibility, fees, geography and sanctions can change; verify directly with the provider.</p>';
  $('#detail-dialog').showModal();
}

function scopeRank(r){return r.scope==='district'?0:r.scope==='state'?1:r.scope==='national'?2:3;}
function showDetails(id){
  const r=records.find(x=>x.id===id);if(!r)return;
  $('#dialog-kicker').textContent=`${typeLabel(r.type)} · ${r.category}`;
  $('#dialog-title').textContent=r.name;
  const steps=r.process.map(x=>`<li>${escapeHtml(x)}</li>`).join('');
  $('#dialog-body').innerHTML=`
    <div class="detail-section"><h4>Financial value</h4><p><b>${escapeHtml(r.amount)}</b><br>${escapeHtml(r.amountNote)}</p></div>
    <div class="detail-section"><h4>What it provides</h4><p>${escapeHtml(r.summary)}</p></div>
    <div class="detail-section"><h4>Eligibility</h4><p>${escapeHtml(r.eligibility)}</p></div>
    <div class="detail-section"><h4>How to apply</h4><ol>${steps}</ol></div>
    ${r.rate?`<div class="detail-section"><h4>Interest / financial terms</h4><p>${escapeHtml(r.rate)}</p></div>`:''}
    <div class="detail-caution"><b>Important:</b> ${escapeHtml(r.caution)}</div>
    <div class="dialog-links"><a href="${escapeHtml(r.application)}" target="_blank" rel="noopener">Application / official route ↗</a><a href="${escapeHtml(r.source)}" target="_blank" rel="noopener">Source: ${escapeHtml(r.sourceLabel)} ↗</a></div>
    <p style="font-size:8px;color:#929b94;margin-top:12px">Source review: ${escapeHtml(r.sourceDate)} · Final eligibility, loan amount, interest and approval remain with the implementing authority/lender.</p>`;
  $('#detail-dialog').showModal();
}
function updateCoverageList(){
  const list=stateNames();
  $('#state-count').textContent=`${list.length} States & UTs`;
  $('#state-coverage-list').innerHTML=list.map(name=>`<div class="state-row"><span>${escapeHtml(name)}</span><b class="${normalizedName(name)==='west bengal'?'wb':''}">${normalizedName(name)==='west bengal'?'PARTIAL · SOURCED':'NATIONAL ONLY'}</b></div>`).join('');
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
  render();
}).catch(err=>{
  console.error(err);
  $('#results').innerHTML='<div class="empty-state"><h3>Directory data could not be loaded</h3><p>Check that the project is being served from its root folder and that schemes.json is available.</p></div>';
});
stateSelect.addEventListener('change',()=>populateDistricts());
districtSelect.addEventListener('change',render);
profileSelect.addEventListener('change',render);
typeSelect.addEventListener('change',render);
providerSelect.addEventListener('change',render);
sortSelect.addEventListener('change',render);
['directory-search','directory-type','directory-provider'].forEach(id=>$('#'+id)?.addEventListener('input',renderDirectory));
$('#directory-type')?.addEventListener('change',renderDirectory);
$('#directory-provider')?.addEventListener('change',renderDirectory);
$('#reset-filters').addEventListener('click',()=>{stateSelect.value='West Bengal';profileSelect.value='all';typeSelect.value='all';providerSelect.value='all';sortSelect.value='relevance';populateDistricts('Paschim Medinipur');});
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{switchView(btn.dataset.view);if(btn.dataset.view==='directory')renderDirectory();}));
$('#dialog-close').addEventListener('click',()=>$('#detail-dialog').close());
$('#detail-dialog').addEventListener('click',e=>{if(e.target===$('#detail-dialog'))$('#detail-dialog').close();});
