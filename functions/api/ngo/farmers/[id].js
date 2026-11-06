import { auditNgo, jsonResponse, requireNgoUser, requireSameOrigin } from "../../../_lib/ngo.js";

export async function onRequestDelete(context) {
  const auth = await requireNgoUser(context, ["admin"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid farmer profile identifier." }, 400);
  const db = context.env.NGO_DB;
  const farmer = await db.prepare("SELECT id FROM ngo_farmers WHERE id = ? AND org_id = ? LIMIT 1").bind(id,auth.user.org_id).first();
  if (!farmer) return jsonResponse({ error: "Farmer profile not found." }, 404);
  const docs = await db.prepare("SELECT object_key FROM ngo_farmer_documents WHERE farmer_id = ? AND org_id = ?").bind(id,auth.user.org_id).all();
  if (context.env.NGO_DOCS) {
    for (const doc of docs.results || []) await context.env.NGO_DOCS.delete(doc.object_key);
  } else if ((docs.results || []).length) {
    return jsonResponse({ error: "The private document bucket is not configured; profile deletion was stopped to avoid leaving orphaned files." }, 503);
  }
  await db.batch([
    db.prepare("DELETE FROM ngo_farmer_documents WHERE farmer_id = ? AND org_id = ?").bind(id,auth.user.org_id),
    db.prepare("DELETE FROM ngo_scheme_applications WHERE farmer_id = ? AND org_id = ?").bind(id,auth.user.org_id),
    db.prepare("DELETE FROM ngo_farmers WHERE id = ? AND org_id = ?").bind(id,auth.user.org_id)
  ]);
  await auditNgo(context.env, auth.user, "farmer.profile_deleted", "ngo_farmer", id);
  return jsonResponse({ deleted: true });
}


export async function onRequestPatch(context) {
  const auth = await requireNgoUser(context, ["admin","editor"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid farmer profile identifier." }, 400);
  const body = await readJsonBody(context.request, 10000);
  if (!body.ok) return jsonResponse({ error: body.error }, 400);
  const v = body.value || {};
  const allowed = new Set(["farmerRef","state","district","profileType","landStatus","activity","supportNeed","cropName","landArea","landAreaUnit","season","irrigation","consent"]);
  if (Object.keys(v).some(k => !allowed.has(k))) return jsonResponse({ error: "Unsupported farmer profile fields. Personal identity data is not accepted." }, 400);
  const farmerRef = String(v.farmerRef || "").trim().replace(/\s+/g," ").slice(0,40);
  const state = String(v.state || "").trim().replace(/\s+/g," ").slice(0,80);
  const district = String(v.district || "").trim().replace(/\s+/g," ").slice(0,80);
  const profileType = String(v.profileType || "");
  const landStatus = String(v.landStatus || "");
  const activity = String(v.activity || "");
  const supportNeed = String(v.supportNeed || "");
  const cropName = String(v.cropName || "").trim().replace(/\s+/g," ").slice(0,80);
  const landArea = v.landArea === "" || v.landArea == null ? null : Number(v.landArea);
  const landAreaUnit = String(v.landAreaUnit || "");
  const season = String(v.season || "");
  const irrigation = String(v.irrigation || "");
  const validProfiles = new Set(["owner","tenant","women_farmer","women_shg","mixed_shg","fpo","entrepreneur","allied"]);
  const validLands = new Set(["owner","tenant","sharecropper","group","landless"]);
  const validActivities = new Set(["crop","dairy","fisheries","poultry","horticulture","machinery","irrigation","storage","processing","allied","agri-enterprise","group-business"]);
  const validNeeds = new Set(["all","grant","subsidy","loan","insurance","institution"]);
  const validSeasons = new Set(["kharif","rabi","zaid","perennial","unknown"]);
  const validIrrigation = new Set(["irrigated","rainfed","mixed","unknown"]);
  if (!auditSafeRef(farmerRef) || state.length < 2 || district.length < 2 ||
      !validProfiles.has(profileType) || !validLands.has(landStatus) ||
      !validActivities.has(activity) || !validNeeds.has(supportNeed) ||
      !["acre","hectare"].includes(landAreaUnit) ||
      (landArea !== null && (!Number.isFinite(landArea) || landArea <= 0 || landArea > 10000)) ||
      !validSeasons.has(season) || !validIrrigation.has(irrigation) || v.consent !== true ||
      /(aadhaar|uid|pan|phone|mobile|bank|account|ifsc|passport|voter|@)/i.test(cropName) || /\d{10,}/.test(cropName)) {
    return jsonResponse({ error: "Check the characteristics and confirm farmer consent again. Use only an anonymous case reference; no direct identifiers are accepted." }, 400);
  }
  try {
    const result = await context.env.NGO_DB.prepare(
      "UPDATE ngo_farmers SET farmer_ref = ?, state_name = ?, district_name = ?, profile_type = ?, land_status = ?, activity = ?, support_need = ?, crop_name = ?, land_area = ?, land_area_unit = ?, season = ?, irrigation = ?, consent_at = ?, consent_version = 'agribridge-farmer-consent-v1', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ? WHERE id = ? AND org_id = ?"
    ).bind(farmerRef,state,district,profileType,landStatus,activity,supportNeed,cropName,landArea,landAreaUnit,season,irrigation,new Date().toISOString(),auth.user.email,id,auth.user.org_id).run();
    if (!result.meta?.changes) return jsonResponse({ error: "Farmer profile not found in this organisation." },404);
  } catch {
    return jsonResponse({ error: "That anonymous reference may already exist, or the profile could not be updated." },409);
  }
  await auditNgo(context.env,auth.user,"farmer.profile_updated","ngo_farmer",id);
  return jsonResponse({ saved: true, id, farmerRef });
}
