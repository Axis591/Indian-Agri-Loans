const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...extraHeaders }
  });
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJsonPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

let cachedJwks = null;
let cachedJwksUntil = 0;

async function getAccessKey(domain, kid) {
  const now = Date.now();
  if (!cachedJwks || cachedJwksUntil < now) {
    const response = await fetch(domain + "/cdn-cgi/access/certs", {
      headers: { "Accept": "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!response.ok) throw new Error("Could not retrieve Access signing keys");
    cachedJwks = await response.json();
    cachedJwksUntil = now + 5 * 60 * 1000;
  }
  const jwk = (cachedJwks.keys || []).find((item) => item.kid === kid && item.kty === "RSA");
  if (!jwk) {
    cachedJwks = null;
    cachedJwksUntil = 0;
    throw new Error("Unknown Access signing key");
  }
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function verifyAccessJwt(token, teamDomain, expectedAudience) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("Malformed Access assertion");
  const header = decodeJsonPart(parts[0]);
  const payload = decodeJsonPart(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Access assertion");
  if (payload.iss !== teamDomain) throw new Error("Access issuer mismatch");
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.includes(expectedAudience)) throw new Error("Access audience mismatch");
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp <= now) throw new Error("Access assertion expired");
  if (payload.nbf && payload.nbf > now + 30) throw new Error("Access assertion not active");
  const key = await getAccessKey(teamDomain, header.kid);
  const verified = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!verified) throw new Error("Invalid Access signature");
  return payload;
}

export async function requireNgoUser(context, allowedRoles = ["admin", "editor", "viewer"]) {
  const { request, env } = context;
  if (!env.NGO_DB || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return {
      ok: false,
      response: jsonResponse({
        error: "NGO backend is not configured.",
        code: "NGO_BACKEND_NOT_CONFIGURED",
        required: ["D1 binding NGO_DB", "ACCESS_TEAM_DOMAIN", "ACCESS_AUD", "Cloudflare Access application for /api/ngo/*"]
      }, 503)
    };
  }

  const teamDomain = String(env.ACCESS_TEAM_DOMAIN).replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(teamDomain)) {
    return { ok: false, response: jsonResponse({ error: "Cloudflare Access team domain is invalid." }, 503) };
  }

  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!assertion) {
    return { ok: false, response: jsonResponse({ error: "Cloudflare Access sign-in is required.", code: "ACCESS_SIGN_IN_REQUIRED" }, 401) };
  }

  let payload;
  try {
    payload = await verifyAccessJwt(assertion, teamDomain, env.ACCESS_AUD);
  } catch (error) {
    return { ok: false, response: jsonResponse({ error: "Access authentication failed.", code: "ACCESS_ASSERTION_INVALID" }, 403) };
  }

  const email = String(payload.email || "").trim().toLowerCase();
  if (!email || email.length > 254) {
    return { ok: false, response: jsonResponse({ error: "The Access identity did not provide a valid email." }, 403) };
  }

  const user = await env.NGO_DB.prepare(
    "SELECT email, org_id, role, active FROM ngo_users WHERE email = ? AND active = 1 LIMIT 1"
  ).bind(email).first();

  if (!user) {
    return { ok: false, response: jsonResponse({ error: "This verified account is not enabled for an AgriBridge NGO organisation.", code: "NGO_USER_NOT_PROVISIONED" }, 403) };
  }
  if (!allowedRoles.includes(user.role)) {
    return { ok: false, response: jsonResponse({ error: "Your organisation role does not allow this operation." }, 403) };
  }
  return { ok: true, user };
}

export async function auditNgo(env, user, eventType, recordType, recordId = null) {
  await env.NGO_DB.prepare(
    "INSERT INTO ngo_audit (id, org_id, actor_email, event_type, record_type, record_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), user.org_id, user.email, eventType, recordType, recordId).run();
}

export async function readJsonBody(request, maxBytes = 10000) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) return { ok: false, error: "Request body exceeds the allowed size." };
  const text = await request.text();
  if (text.length > maxBytes) return { ok: false, error: "Request body exceeds the allowed size." };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "Request body must be valid JSON." };
  }
}

export function validMetricValue(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10000000;
}

export function auditSafeRef(value) {
  if (typeof value !== "string") return false;
  const ref = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/.test(ref)) return false;
  if (/(?:\d[\s-]?){10,}/.test(ref)) return false;
  if (/(aadhaar|uid|pan|phone|mobile|bank|account|ifsc|passport|voter)/i.test(ref)) return false;
  return true;
}


export async function requirePlatformAdmin(context) {
  const { request, env } = context;
  if (!env.NGO_DB || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.NGO_PLATFORM_ADMIN_EMAILS) {
    return { ok: false, response: jsonResponse({ error: "Platform administrator access is not configured.", code: "NGO_PLATFORM_ADMIN_NOT_CONFIGURED" }, 503) };
  }
  const teamDomain = String(env.ACCESS_TEAM_DOMAIN).replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(teamDomain)) return { ok: false, response: jsonResponse({ error: "Cloudflare Access team domain is invalid." }, 503) };
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!assertion) return { ok: false, response: jsonResponse({ error: "Cloudflare Access sign-in is required.", code: "ACCESS_SIGN_IN_REQUIRED" }, 401) };
  let payload;
  try { payload = await verifyAccessJwt(assertion, teamDomain, env.ACCESS_AUD); }
  catch { return { ok: false, response: jsonResponse({ error: "Access authentication failed.", code: "ACCESS_ASSERTION_INVALID" }, 403) }; }
  const email = String(payload.email || "").trim().toLowerCase();
  const admins = String(env.NGO_PLATFORM_ADMIN_EMAILS).split(/[;,\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!email || !admins.includes(email)) return { ok: false, response: jsonResponse({ error: "Platform administrator access is restricted.", code: "PLATFORM_ADMIN_REQUIRED" }, 403) };
  return { ok: true, user: { email, role: "platform_admin" } };
}

export function requireSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function safeFilename(value) {
  return String(value || "document").replace(/[\\/\r\n"\x00-\x1f]/g, "_").slice(0, 120) || "document";
}
