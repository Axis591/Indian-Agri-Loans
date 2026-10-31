const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const RESPONSE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
};

function respond(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), { status, headers: { ...RESPONSE_HEADERS, ...headers } });
}

function safeFilter(value) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, 100);
}

export async function onRequestGet({ request, env }) {
  const apiKey = env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    return respond({
      error: "Live mandi data is not activated yet.",
      code: "DATA_GOV_IN_API_KEY_REQUIRED",
      setup: "Add DATA_GOV_IN_API_KEY in Cloudflare Pages environment variables, then redeploy."
    }, 503);
  }

  const incoming = new URL(request.url);
  const state = safeFilter(incoming.searchParams.get("state"));
  const district = safeFilter(incoming.searchParams.get("district"));
  const commodity = safeFilter(incoming.searchParams.get("commodity"));
  const limit = Math.min(100, Math.max(1, Number.parseInt(incoming.searchParams.get("limit") || "40", 10) || 40));
  const resourceId = String(env.MANDI_RESOURCE_ID || RESOURCE_ID).trim();
  if (!/^[0-9a-f-]{36}$/i.test(resourceId)) return respond({ error: "Mandi resource ID configuration is invalid." }, 503);

  const upstream = new URL("https://api.data.gov.in/resource/" + resourceId);
  upstream.searchParams.set("api-key", apiKey);
  upstream.searchParams.set("format", "json");
  upstream.searchParams.set("limit", String(limit));
  upstream.searchParams.set("offset", "0");
  upstream.searchParams.set("fields", "state,district,market,commodity,variety,grade,arrival_date,min_price,max_price,modal_price");
  if (state) upstream.searchParams.set("filters[state]", state);
  if (district) upstream.searchParams.set("filters[district]", district);
  if (commodity) upstream.searchParams.set("filters[commodity]", commodity);

  try {
    const response = await fetch(upstream.toString(), {
      headers: { "Accept": "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!response.ok) {
      return respond({
        error: "The official OGD mandi feed could not be retrieved.",
        code: "UPSTREAM_DATA_UNAVAILABLE",
        upstreamStatus: response.status,
        source: "https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi"
      }, 502);
    }
    const data = await response.json();
    const rows = Array.isArray(data.records) ? data.records : [];
    const normalized = rows.map((row) => ({
      state: row.state || row.State || "",
      district: row.district || row.District || "",
      market: row.market || row.Market || "",
      commodity: row.commodity || row.Commodity || "",
      variety: row.variety || row.Variety || "",
      grade: row.grade || row.Grade || "",
      arrivalDate: row.arrival_date || row.arrivalDate || row.Arrival_Date || "",
      minPrice: Number(row.min_price ?? row.minPrice ?? row.Min_Price),
      maxPrice: Number(row.max_price ?? row.maxPrice ?? row.Max_Price),
      modalPrice: Number(row.modal_price ?? row.modalPrice ?? row.Modal_Price)
    }));
    const valid = normalized.filter((row) => row.market && row.commodity && Number.isFinite(row.modalPrice));
    return respond({
      source: "data.gov.in — Directorate of Marketing & Inspection / AGMARKNET",
      sourceUrl: "https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi",
      resourceId,
      retrievedAt: new Date().toISOString(),
      count: valid.length,
      total: Number(data.total || data.count || valid.length),
      filters: { state, district, commodity },
      records: valid
    });
  } catch (error) {
    return respond({ error: "The official mandi feed could not be reached. Try again later.", code: "UPSTREAM_NETWORK_ERROR" }, 502);
  }
}
