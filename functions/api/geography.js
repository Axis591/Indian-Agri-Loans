const FALLBACK_RESOURCE = "";
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=3600",
  "X-Content-Type-Options": "nosniff"
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}
function keyOf(object, wanted) {
  const target = wanted.toLowerCase().replace(/[^a-z0-9]/g, "");
  const found = Object.keys(object).find((key) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === target);
  return found ? object[found] : "";
}
function clean(value) {
  return String(value || "").trim();
}

export async function onRequestGet({ env }) {
  const apiKey = env.DATA_GOV_IN_API_KEY;
  const resourceId = String(env.LGD_DISTRICT_RESOURCE_ID || FALLBACK_RESOURCE).trim();
  if (!apiKey || !resourceId) {
    return response({
      configured: false,
      code: "LGD_DISTRICT_API_NOT_CONFIGURED",
      message: "Official LGD district API is not activated. Use the monthly LGD CSV export import workflow or the bundled fallback.",
      officialCatalogue: "https://data.gov.in/catalog/local-government-directory-lgd"
    }, 503);
  }
  if (!/^[0-9a-f-]{36}$/i.test(resourceId)) return response({ configured: false, error: "LGD district resource ID is invalid." }, 503);

  const url = new URL("https://api.data.gov.in/resource/" + resourceId);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("offset", "0");

  try {
    const upstream = await fetch(url.toString(), { headers: { "Accept": "application/json" }, cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!upstream.ok) return response({ configured: false, error: "Official LGD API returned an error.", upstreamStatus: upstream.status }, 502);
    const data = await upstream.json();
    const rows = Array.isArray(data.records) ? data.records : [];
    const grouped = new Map();
    for (const row of rows) {
      const stateName = clean(keyOf(row, "stateNameEnglish") || keyOf(row, "state"));
      const stateCode = clean(keyOf(row, "stateCode"));
      const districtName = clean(keyOf(row, "districtNameEnglish") || keyOf(row, "district"));
      const districtCode = clean(keyOf(row, "districtCode"));
      if (!stateName || !districtName || !districtCode) continue;
      if (!grouped.has(stateName)) grouped.set(stateName, { code: stateCode, name: stateName, districts: [] });
      grouped.get(stateName).districts.push({ code: districtCode, name: districtName });
    }
    const states = [...grouped.values()].map((state) => ({
      ...state,
      districts: state.districts.sort((a, b) => a.name.localeCompare(b.name))
    })).sort((a, b) => a.name.localeCompare(b.name));
    if (!states.length) return response({ configured: false, error: "The configured LGD resource did not return the expected state/district code fields." }, 502);
    return response({
      configured: true,
      source: "Ministry of Panchayati Raj — Local Government Directory via data.gov.in",
      retrievedAt: new Date().toISOString(),
      stateCount: states.length,
      districtCount: states.reduce((n, state) => n + state.districts.length, 0),
      states
    });
  } catch (error) {
    return response({ configured: false, error: "Official LGD dataset could not be reached." }, 502);
  }
}
