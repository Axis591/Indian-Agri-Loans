const $ = (selector) => document.querySelector(selector);
const stateSelect = $('#state-select');
const districtSelect = $('#district-select');
const profileSelect = $('#profile-select');
const typeSelect = $('#type-select');
const providerSelect = $('#provider-select');
const sortSelect = $('#sort-select');
const recordsPromise = fetch('schemes.json').then(r => { if(!r.ok) throw new Error('Could not load scheme data'); return r.json(); });
const fallbackStatesPromise = fetch('geography-fallback.json').then(r => r.json());
const districtSource = 'https://raw.githubusercontent.com/CodingMation/indian-states-districts/main/data/india_states_districts.json';
let records = [];
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
    geography=states.map(s=>({code:s.code,name:s.name,districts:[]}));
    const wb=geography.find(s=>s.code==='WB');
    if(wb) wb.districts=wbFallbackDistricts.map(name=>({name}));
    geographyLive=false;
  }
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
function providerLabel(kinds=[]){const labels={'central-government':'CENTRAL GOVT','state-government':'STATE GOVT','public-bank':'PUBLIC BANK','private-bank':'PRIVATE BANK','rrb':'RRB','cooperative':'COOPERATIVE / PACS','regulated-nbfc':'REGULATED NBFC / MFI / SFB','local-body':'PANCHAYAT / BLOCK','informal':'INFORMAL'};return [...new Set(kinds)].map(k=>labels[k]||k.toUpperCase()).join(' · ')||'PROVIDER NOT TAGGED';}
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
  $('#metric-records').textContent=records.length;
  $('#empty-state').classList.toggle('hidden',matched.length!==0);
  $('#coverage-warning').classList.toggle('hidden',normalizedName(state)==='west bengal');
  if(normalizedName(state)!=='west bengal'){
    $('#coverage-warning').innerHTML=`<b>Coverage note for ${escapeHtml(state)}:</b> national programmes and lender routes are shown where relevant. State-specific schemes, district notifications, local cooperative societies and panchayat-level grants for this state have not yet been independently curated in this release. Do not interpret an empty local list as proof that no scheme exists.`;
  }
  $('#location-summary').textContent=`Showing national and ${state} entries for ${district||'the selected state'}.`;
  $('#results').querySelectorAll('[data-details]').forEach(btn=>btn.addEventListener('click',()=>showDetails(btn.dataset.details)));
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

Promise.all([recordsPromise,loadGeography()]).then(([data])=>{
  records=data;
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
$('#reset-filters').addEventListener('click',()=>{stateSelect.value='West Bengal';profileSelect.value='all';typeSelect.value='all';providerSelect.value='all';sortSelect.value='relevance';populateDistricts('Paschim Medinipur');});
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
$('#dialog-close').addEventListener('click',()=>$('#detail-dialog').close());
$('#detail-dialog').addEventListener('click',e=>{if(e.target===$('#detail-dialog'))$('#detail-dialog').close();});
