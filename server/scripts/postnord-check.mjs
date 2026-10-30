const key = process.env.POSTNORD_API_KEY;
if (!key) {
  console.error("POSTNORD_API_KEY saknas i .env");
  process.exit(1);
}
const base = (
  process.env.POSTNORD_BASE_URL ?? "https://atapi2.postnord.com"
).replace(/\/+$/, "");
const to = (process.argv[2] ?? "").replace(/\s/g, "");
const from = process.env.SHOP_POSTAL_CODE ?? "11122";
if (!/^\d{5}$/.test(to)) {
  console.error("Ange ett postnummer: node ... postnord-check.mjs 12345");
  process.exit(1);
}

const spPaths = [
  process.env.POSTNORD_SERVICEPOINTS_PATH ??
    "/rest/businesslocation/v5/servicepoints/nearest/byaddress",
  "/rest/businesslocation/v5/servicepoint/findNearestByAddress.json",
];
const ttPath =
  process.env.POSTNORD_TRANSIT_PATH ??
  "/rest/transport/v2/transittime/addresstoaddress";

async function call(path, params) {
  const u = new URL(base + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("apikey", key);
  try {
    const res = await fetch(u, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text: text.replaceAll(key, "***") };
  } catch (e) {
    return { status: "FEL: " + e.name, json: null, text: "" };
  }
}

function shape(v, depth = 0, max = 4) {
  if (Array.isArray(v))
    return `[${v.length} st] ` + (v.length ? shape(v[0], depth, max) : "");
  if (v && typeof v === "object") {
    if (depth >= max) return "{…}";
    return (
      "{ " +
      Object.entries(v)
        .map(([k, x]) => `${k}: ${shape(x, depth + 1, max)}`)
        .join(", ") +
      " }"
    );
  }
  return typeof v === "string" ? JSON.stringify(v.slice(0, 40)) : String(v);
}

console.log(`Bas-URL: ${base}\nButikens postnummer: ${from}, kundens: ${to}\n`);

console.log("=== 1. OMBUD ===");
for (const p of spPaths) {
  const r = await call(p, {
    returnType: "json",
    countryCode: "SE",
    postalCode: to,
    numberOfServicePoints: "5",
  });
  console.log(`\nSökväg: ${p}\nHTTP-status: ${r.status}`);
  if (r.json) console.log("Form på svaret:\n" + shape(r.json));
  else console.log("Svar (början):", r.text.slice(0, 300));
}

console.log("\n=== 2. LEVERANSTID ===");
for (const code of [
  process.env.POSTNORD_SERVICE_CODE_PICKUP ?? "19",
  process.env.POSTNORD_SERVICE_CODE_HOME ?? "17",
]) {
  const start = new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })
    .replace(" ", "T")
    .slice(0, 16);
  const r = await call(ttPath, {
    startTime: start,
    serviceCodes: code,
    originPostalCode: from,
    originCountryCode: "SE",
    destinationPostalCode: to,
    destinationCountryCode: "SE",
  });
  console.log(`\nserviceCode ${code} -> HTTP ${r.status}`);
  if (r.json) console.log("Form på svaret:\n" + shape(r.json));
  else console.log("Svar (början):", r.text.slice(0, 300));
}
console.log(
  "\nKlart. Jämför sökvägar, parametrar och fältnamn ovan med portalens dokumentation.",
);
