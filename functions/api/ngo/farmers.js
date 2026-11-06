import { auditNgo, auditSafeRef, jsonResponse, readJsonBody, requireNgoUser, requireSameOrigin } from "../../_lib/ngo.js";

const profiles = new Set(["owner","tenant","women_farmer","women_shg","mixed_shg","fpo","entrepreneur","allied"]);
const lands = new Set(["owner","tenant","sharecropper","group","landless"]);
const activities = new Set(["crop","dairy","fisheries","poultry","horticulture","machinery","irrigation","storage","processing","allied","agri-enterprise","group-business"]);
const needs = new Set(["all","grant","subsidy","loan","insurance","institution"]);
const seasons = new Set(["kharif","rabi","zaid","perennial","unknown"]);
const irrigationTypes = new Set(["irrigated","rainfed","mixed","unknown"]);
const clean = (v,n) => String(v ?? "").trim().replace(/\s+/g," ").slice(0,n);

export async function onRequestGet(context) {
  const auth = await requireNgoUser(context);
  if (!auth.ok) return auth.response;
  const rows = await context.env.NGO_DB.prepare(
    "SELECT f.id, f.farmer_ref, f.state_name, f.district_name, f.profile_type, f.land_status, f.activity, f.support_need, f.crop_name, f.land_area, f.land_area_unit, f.season, f.irrigation, f.consent_at, f.created_at, (SELECT COUNT(*) FROM ngo_farmer_documents d WHERE d.farmer_id = f.id AND d.org_id = f.org_id) AS document_count FROM ngo_farmers f WHERE f.org_id = ? ORDER BY f.created_at DESC LIMIT 300"
  ).bind(auth.user.org_id).all();
  return jsonResponse({ farmers: rows.results || [] });
}

export async function onRequestPost(context) {
  const auth = await requireNgoUser(context, ["admin","editor"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  const body = await readJsonBody(context.request, 10000);
  if (!body.ok) return jsonResponse({ error: body.error }, 400);
  const v = body.value || {};
  const allowed = new Set(["farmerRef","state","district","profileType","landStatus","activity","supportNeed","cropName","landArea","landAreaUnit","season","irrigation","consent"]);
  if (Object.keys(v).some(k => !allowed.has(k))) return jsonResponse({ error: "Unsupported farmer profile fields. Personal identity data is not accepted." }, 400);
  const farmerRef = clean(v.farmerRef,40);
  const state = clean(v.state,80), district = clean(v.district,80);
  const profileType = clean(v.profileType,30), landStatus = clean(v.landStatus,30);
  const activity = clean(v.activity,30), supportNeed = clean(v.supportNeed,20);
  const cropName = clean(v.cropName,80);
  const landArea = v.landArea === "" || v.landArea == null ? null : Number(v.landArea);
  const landAreaUnit = clean(v.landAreaUnit,10);
  const season = clean(v.season,20), irrigation = clean(v.irrigation,20);
  if (!auditSafeRef(farmerRef) || /\d{10,}/.test(farmerRef) ||
      state.length < 2 || district.length < 2 || !profiles.has(profileType) || !lands.has(landStatus) ||
      !activities.has(activity) || !needs.has(supportNeed) || !["acre","hectare"].includes(landAreaUnit) ||
      (landArea !== null && (!Number.isFinite(landArea) || landArea <= 0 || landArea > 10000)) ||
      !seasons.has(season) || !irrigationTypes.has(irrigation) || v.consent !== true) {
    return jsonResponse({ error: "Complete the required characteristics and confirm the farmer consent statement. Use an anonymous reference code only." }, 400);
  }
  if (/(aadhaar|uid|pan|phone|mobile|bank|account|ifsc|passport|voter|@)/i.test(cropName)) return jsonResponse({ error: "Enter a crop or commodity name only; do not put personal identifiers in this field." }, 400);
  const id = crypto.randomUUID();
  const consentAt = new Date().toISOString();
  try {
    await context.env.NGO_DB.prepare(
      "INSERT INTO ngo_farmers (id, org_id, farmer_ref, state_name, district_name, profile_type, land_status, activity, support_need, crop_name, land_area, land_area_unit, season, irrigation, consent_at, consent_version, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agribridge-farmer-consent-v1', ?, ?)"
    ).bind(id, auth.user.org_id, farmerRef, state, district, profileType, landStatus, activity, supportNeed, cropName, landArea, landAreaUnit, season, irrigation, consentAt, auth.user.email, auth.user.email).run();
  } catch {
    return jsonResponse({ error: "That anonymous reference already exists in your organisation, or the profile could not be saved." }, 409);
  }
  await auditNgo(context.env, auth.user, "farmer.profile_created", "ngo_farmer", id);
  return jsonResponse({ saved: true, id, farmerRef, consentAt }, 201);
}
