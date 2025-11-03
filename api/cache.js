// /api/cache.js

let cachedData = null;
let cachedTime = 0;
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*"); // ou ton domaine spécifique
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  const now = Date.now();

  // Renvoi cache si valide
  if (cachedData && (now - cachedTime < CACHE_DURATION)) {
    return res.status(200).json(cachedData);
  }

  // Vérification de la variable d'environnement
  if (!process.env.AIRTABLE_API_KEY) {
    console.error("❌ AIRTABLE_API_KEY non définie !");
    return res.status(500).json({ error: "AIRTABLE_API_KEY non définie !" });
  }

  const BASE_ID = "app5DoZKkIuqd6Quo";      // Ton Base ID
  const TABLE_ID = "tblcLGQDcypZPFbZA";     // Ton Table ID
  const AIRTABLE_TOKEN = "patCagDMpXwNLGyQu.ed05d2b62289d165c562eed44a9e04b7f424b708179f288461a499caebe77ac4";

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

  console.log("🔹 Appel Airtable URL:", url);

  
  //console.log("🔹 Utilisation clé:", process.env.AIRTABLE_API_KEY.slice(0, 8) + "...");

  try {
    const airtableRes = await fetch(url, {
      headers: {
        //Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`
      Authorization: `Bearer ${AIRTABLE_TOKEN}`

      }
    });

    console.log("🔹 Status Airtable:", airtableRes.status);

    const data = await airtableRes.json();
    console.log("🔹 Réponse Airtable:", data);

    if (!airtableRes.ok) {
      return res.status(airtableRes.status).json({ error: data.error || "Erreur Airtable" });
    }

    // Mise à jour du cache
    cachedData = data;
    cachedTime = now;

    return res.status(200).json(data);

  } catch (err) {
    console.error("❌ Erreur fetch Airtable:", err);
    return res.status(500).json({ error: err.message });
  }
}
