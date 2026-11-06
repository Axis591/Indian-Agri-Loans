import { jsonResponse, readJsonBody, requireSameOrigin, sha256Hex } from "../_lib/ngo.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const orgTypes = new Set(["Trust","Registered Society","Section 8 Company","FPO / Cooperative","SHG Federation","Community-based organisation","Other"]);
const text = (value, max) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const randomHex = (bytes = 24) => {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return [...data].map(x => x.toString(16).padStart(2, "0")).join("");
};

export async function onRequestGet({ env }) {
  const ready = Boolean(env.NGO_DB && env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD && env.NGO_PLATFORM_ADMIN_EMAILS && env.NGO_JOIN_TURNSTILE_SITE_KEY && env.NGO_JOIN_TURNSTILE_SECRET && env.NGO_JOIN_RATE_LIMIT_SALT);
  return jsonResponse({
    enabled: ready,
    siteKey: ready ? String(env.NGO_JOIN_TURNSTILE_SITE_KEY) : "",
    message: ready ? "Applications are open." : "The NGO application form is awaiting secure administrator setup."
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  if (!env.NGO_DB || !env.NGO_JOIN_TURNSTILE_SITE_KEY || !env.NGO_JOIN_TURNSTILE_SECRET || !env.NGO_JOIN_RATE_LIMIT_SALT) {
    return jsonResponse({ error: "The secure NGO application service is not configured yet.", code: "NGO_JOIN_NOT_CONFIGURED" }, 503);
  }
  if (request.method !== "POST" || !/^application\/json/i.test(request.headers.get("Content-Type") || "")) {
    return jsonResponse({ error: "Submit the form using the supported JSON request." }, 415);
  }
  const body = await readJsonBody(request, 16000);
  if (!body.ok) return jsonResponse({ error: body.error }, 400);
  const v = body.value || {};
  const allowed = new Set(["orgName","orgType","registrationNumber","registrationYear","state","district","districtsServed","website","contactName","contactRole","contactEmail","contactPhone","workSummary","privacyAccepted","accuracyAccepted","captchaToken","websiteField"]);
  if (Object.keys(v).some(k => !allowed.has(k))) return jsonResponse({ error: "The form contains unsupported fields." }, 400);
  if (text(v.websiteField, 200)) return jsonResponse({ error: "The submission could not be accepted." }, 400);

  const orgName = text(v.orgName, 160), orgType = text(v.orgType, 60);
  const registrationNumber = text(v.registrationNumber || "Not registered / community group", 100);
  const registrationYear = v.registrationYear === "" || v.registrationYear == null ? null : Number(v.registrationYear);
  const state = text(v.state, 80), district = text(v.district, 80);
  const districtsServed = text(v.districtsServed, 1200);
  const website = text(v.website, 240);
  const contactName = text(v.contactName, 100), contactRole = text(v.contactRole, 100);
  const contactEmail = text(v.contactEmail, 254).toLowerCase();
  const contactPhone = text(v.contactPhone, 24).replace(/[\s()-]/g, "");
  const workSummary = text(v.workSummary, 2000);
  if (orgName.length < 3 || !orgTypes.has(orgType) || state.length < 2 || district.length < 2 ||
      contactName.length < 2 || contactRole.length < 2 || !emailPattern.test(contactEmail) ||
      !/^\+?[0-9]{10,13}$/.test(contactPhone) || districtsServed.length < 2 || workSummary.length < 40 ||
      (registrationYear !== null && (!Number.isInteger(registrationYear) || registrationYear < 1900 || registrationYear > new Date().getFullYear())) ||
      v.privacyAccepted !== true || v.accuracyAccepted !== true) {
    return jsonResponse({ error: "Complete all required fields and confirm the privacy and accuracy declarations." }, 400);
  }
  if (website) {
    try { const u = new URL(website); if (!["https:","http:"].includes(u.protocol)) throw new Error(); }
    catch { return jsonResponse({ error: "Enter a valid organisation website URL or leave it blank." }, 400); }
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = await sha256Hex(String(env.NGO_JOIN_RATE_LIMIT_SALT) + ":" + ip);
  const rate = await env.NGO_DB.prepare(
    "INSERT INTO ngo_join_rate_limits (ip_hash, window_start, attempts) VALUES (?, ?, 1) ON CONFLICT(ip_hash) DO UPDATE SET attempts = CASE WHEN ngo_join_rate_limits.window_start < excluded.window_start THEN 1 ELSE ngo_join_rate_limits.attempts + 1 END, window_start = excluded.window_start RETURNING attempts"
  ).bind(ipHash, day).first();
  if (Number(rate?.attempts || 0) > 5) return jsonResponse({ error: "Too many applications were submitted from this connection today. Please try again tomorrow." }, 429);

  const captchaToken = text(v.captchaToken, 4096);
  if (!captchaToken) return jsonResponse({ error: "Complete the anti-spam verification before submitting." }, 400);
  const captchaBody = new URLSearchParams({ secret: String(env.NGO_JOIN_TURNSTILE_SECRET), response: captchaToken, remoteip: ip });
  let captcha;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: captchaBody });
    captcha = await response.json();
  } catch {
    return jsonResponse({ error: "Anti-spam verification is temporarily unavailable. Please retry." }, 503);
  }
  if (!captcha?.success || captcha.action !== "ngo_join" ||
      captcha.hostname !== new URL(request.url).hostname) {
    return jsonResponse({ error: "Anti-spam verification failed. Please verify again." }, 400);
  }

  const existing = await env.NGO_DB.prepare(
    "SELECT id FROM ngo_applications WHERE lower(contact_email) = lower(?) AND status IN ('pending','needs_info') LIMIT 1"
  ).bind(contactEmail).first();
  if (existing) return jsonResponse({ error: "An application from this email is already awaiting review. Use its tracking code and token to check status." }, 409);

  const id = crypto.randomUUID();
  const suffix = randomHex(3).toUpperCase();
  const applicationCode = "AGH-" + day.replace(/-/g, "") + "-" + suffix;
  const trackingToken = randomHex(32);
  const tokenHash = await sha256Hex(trackingToken);
  try {
    await env.NGO_DB.prepare(
      "INSERT INTO ngo_applications (id, application_code, tracking_token_hash, org_name, org_type, registration_number, registration_year, state_name, district_name, districts_served, website, contact_name, contact_role, contact_email, contact_phone, work_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, applicationCode, tokenHash, orgName, orgType, registrationNumber, registrationYear, state, district, districtsServed, website, contactName, contactRole, contactEmail, contactPhone, workSummary).run();
  } catch {
    return jsonResponse({ error: "The application could not be saved. Please retry later." }, 500);
  }
  return jsonResponse({
    submitted: true,
    applicationCode,
    trackingToken,
    message: "Your application has been submitted for manual verification. Save the tracking code and private token now; the token is shown only once."
  }, 201);
}
