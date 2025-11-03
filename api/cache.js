// /api/cache.js
import fetch from "node-fetch";

let cachedData = null;
let cachedTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1h

const AIRTABLE_API_KEY = "patCagDMpXwNLGyQu.ed05d2b62289d165c562eed44a9e04b7f424b708179f288461a499caebe77ac4";
const BASE_ID = "app5DoZKkIuqd6Quo";
const TABLE_ID = "tblcLGQDcypZPFbZA";

// Helper pour sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Géocodeur Nominatim
async function geocode(address, geoCache) {
  const key = address.trim().toLowerCase();
  if (geoCache[key]) return geoCache[key];

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "VercelServer/1.0" } });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geoCache[key] = coords;
      return coords;
    }
  } catch (e) {
    console.warn("Géocodage KO:", address, e);
  }
  return null;
}

// Récupérer tous les records Airtable
async function fetchAllRecords() {
  const baseUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
  let offset = null;
  const all = [];
  while (true) {
    const url = new URL(baseUrl);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const data = await res.json();
    if (data.error) throw new Error(`${data.error.type || ""} ${data.error.message || ""}`);

    (data.records || []).forEach((r) => all.push(r));
    if (!data.offset) break;
    offset = data.offset;
  }
  return all;
}

// Endpoint handler
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Retourner cache si encore valide
  if (cachedData && Date.now() - cachedTime < CACHE_DURATION) {
    return res.status(200).json(cachedData);
  }

  try {
    const records = await fetchAllRecords();
    const geoCache = {}; // cache temporaire pour cette génération
    const results = [];

    for (const rec of records) {
      const f = rec.fields || {};
      let address = f["adresse complète"] || `${f["ADRESSE"] || ""}, ${f["VILLE"] || ""} ${f["CODE POSTAL"] || ""}`.trim();
      if (address && !/france|belgique|espagne|italie|suisse|allemagne|luxembourg|portugal/i.test(address)) {
        address += ", France";
      }

      if (address && address !== ", France") {
        const coords = await geocode(address, geoCache);
        await sleep(900); // éviter rate-limit Nominatim

        results.push({
          name: f["AGENCE "] || "Sans nom",
          address,
          type: f["TYPE AGENCE"] || "",
          direction: f["DIRECTION D'AGENCE"] || "",
          mail: f["MAIL CONTACT LEAD "] || "",
          site: f["LIEN SITE WEB "] || "",
          avis: f["URL Avis Google"] || "",
          coords,
        });
      } else {
        results.push({
          name: f["AGENCE "] || "Sans nom",
          address: null,
          coords: null,
        });
      }
    }

    cachedData = results;
    cachedTime = Date.now();

    return res.status(200).json(results);
  } catch (err) {
    console.error("Erreur fetch/cache:", err);
    return res.status(500).json({ error: err.message });
  }
}
