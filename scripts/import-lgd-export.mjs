import fs from 'node:fs';
import path from 'node:path';

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i], next = text[i + 1];
    if (quoted) {
      if (c === '"' && next === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); if (row.some(x => String(x).trim())) rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  row.push(field); if (row.some(x => String(x).trim())) rows.push(row);
  if (quoted) throw new Error('CSV ends inside a quoted field.');
  if (!rows.length) throw new Error('CSV contains no rows.');
  const headers = rows.shift().map(x => String(x).trim().replace(/^\uFEFF/, ''));
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}
const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
function field(row, names) {
  const keys = Object.keys(row);
  const key = keys.find(k => names.map(norm).includes(norm(k)));
  return key ? String(row[key] ?? '').trim() : '';
}
function readOptional(file, label) {
  if (!file) return [];
  if (!fs.existsSync(file)) throw new Error(`${label} file not found: ${file}`);
  return parseCsv(fs.readFileSync(file, 'utf8'));
}
const args = Object.fromEntries(process.argv.slice(2).map((x, i, all) => x.startsWith('--') ? [x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : null).filter(Boolean));
if (!args.districts) {
  console.error('Usage: node scripts/import-lgd-export.mjs --districts <districts.csv> [--subdistricts <subdistricts.csv>] [--villages <villages.csv>] [--local-bodies <local-bodies.csv>] [--as-of YYYY-MM-DD] [--out lgd-geography.json]');
  process.exit(2);
}
const districtRows = readOptional(args.districts, 'Districts');
const subdistrictRows = readOptional(args.subdistricts, 'Sub-districts');
const villageRows = readOptional(args.villages, 'Villages');
const localBodyRows = readOptional(args['local-bodies'], 'Local bodies');
const states = new Map();
for (const row of districtRows) {
  const stateCode = field(row, ['stateCode', 'state_code']);
  const stateName = field(row, ['stateNameEnglish', 'stateName', 'state_name_english']);
  const districtCode = field(row, ['districtCode', 'district_code']);
  const districtName = field(row, ['districtNameEnglish', 'districtName', 'district_name_english']);
  if (!stateCode || !stateName || !districtCode || !districtName) throw new Error('District CSV must include stateCode, stateNameEnglish, districtCode and districtNameEnglish.');
  if (!states.has(stateCode)) states.set(stateCode, { code: stateCode, name: stateName, districts: new Map() });
  const state = states.get(stateCode);
  if (state.name !== stateName) throw new Error(`Conflicting state name for stateCode ${stateCode}.`);
  if (state.districts.has(districtCode)) throw new Error(`Duplicate LGD district code: ${districtCode}.`);
  state.districts.set(districtCode, { code: districtCode, name: districtName, subdistricts: [], villageCount: 0, localBodyCount: 0 });
}
const districtByCode = new Map();
for (const state of states.values()) for (const district of state.districts.values()) districtByCode.set(district.code, district);
const subdistrictsByCode = new Map();
for (const row of subdistrictRows) {
  const code = field(row, ['subdistrictCode', 'subDistrictCode', 'sub_district_code']);
  const name = field(row, ['subdistrictNameEnglish', 'subDistrictNameEnglish', 'subdistrictName']);
  const districtCode = field(row, ['districtCode', 'district_code']);
  if (!code || !name || !districtCode) continue;
  const district = districtByCode.get(districtCode);
  if (!district) continue;
  if (subdistrictsByCode.has(code)) throw new Error(`Duplicate LGD sub-district code: ${code}.`);
  const item = { code, name, villages: [], localBodies: [] };
  district.subdistricts.push(item); subdistrictsByCode.set(code, item);
}
const villageCodesBySubdistrict = new Map();
for (const row of villageRows) {
  const code = field(row, ['villageCode', 'village_code']);
  const name = field(row, ['villageNameEnglish', 'villageName', 'village_name_english']);
  const subCode = field(row, ['subdistrictCode', 'subDistrictCode', 'sub_district_code']);
  if (!code || !name || !subCode) continue;
  const parent = subdistrictsByCode.get(subCode);
  if (!parent) continue;
  if (!villageCodesBySubdistrict.has(subCode)) villageCodesBySubdistrict.set(subCode, new Set());
  const seen = villageCodesBySubdistrict.get(subCode);
  if (!seen.has(code)) { parent.villages.push({ code, name }); seen.add(code); }
}
for (const row of localBodyRows) {
  const code = field(row, ['localBodyCode', 'local_body_code']);
  const name = field(row, ['localBodyNameEnglish', 'localBodyName', 'local_body_name_english']);
  const districtCode = field(row, ['districtCode', 'district_code']);
  const subCode = field(row, ['subdistrictCode', 'subDistrictCode', 'sub_district_code']);
  if (!code || !name) continue;
  const parentDistrict = districtByCode.get(districtCode);
  if (parentDistrict) parentDistrict.localBodyCount += 1;
  const parentSub = subdistrictsByCode.get(subCode);
  if (parentSub) parentSub.localBodies.push({ code, name });
}
for (const state of states.values()) {
  for (const district of state.districts.values()) {
    district.villageCount = district.subdistricts.reduce((total, sub) => total + sub.villages.length, 0);
    district.subdistrictCount = district.subdistricts.length;
    district.subdistricts.sort((a, b) => a.name.localeCompare(b.name));
  }
}
const output = {
  schemaVersion: '1.0.0', source: 'Ministry of Panchayati Raj — Local Government Directory (LGD)',
  officialPortal: 'https://lgdirectory.gov.in/', officialOpenDataCatalog: 'https://data.gov.in/catalog/local-government-directory-lgd',
  asOf: String(args['as-of'] || new Date().toISOString().slice(0, 10)),
  stateCount: states.size, districtCount: [...states.values()].reduce((n, s) => n + s.districts.size, 0),
  subdistrictCount: [...states.values()].reduce((n, s) => n + [...s.districts.values()].reduce((m, d) => m + d.subdistrictCount, 0), 0),
  villageCount: [...states.values()].reduce((n, s) => n + [...s.districts.values()].reduce((m, d) => m + d.villageCount, 0), 0),
  localBodyCount: [...states.values()].reduce((n, s) => n + [...s.districts.values()].reduce((m, d) => m + d.localBodyCount, 0), 0),
  completeness: { districts: true, subdistricts: Boolean(args.subdistricts), villages: Boolean(args.villages), localBodies: Boolean(args['local-bodies']) },
  note: 'Official LGD codes imported from downloaded source CSVs. Some villages can be mapped to multiple local bodies; counts are based on distinct village codes per sub-district in this import.',
  states: [...states.values()].map(s => ({ code: s.code, name: s.name, districts: [...s.districts.values()].sort((a, b) => a.name.localeCompare(b.name)) })).sort((a, b) => a.name.localeCompare(b.name))
};
if (output.stateCount < 28 || output.districtCount < 500) throw new Error(`Unexpectedly incomplete LGD export (${output.stateCount} states, ${output.districtCount} districts).`);
const out = path.resolve(args.out || 'lgd-geography.json');
fs.writeFileSync(out, JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${out}`);
console.log(`LGD counts: ${output.stateCount} State/UT codes, ${output.districtCount} district codes, ${output.subdistrictCount} sub-districts, ${output.villageCount} villages, ${output.localBodyCount} local-body records.`);
console.log(`Completeness: ${JSON.stringify(output.completeness)}`);
