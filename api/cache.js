let cachedData = null;
let cachedTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export default async function handler(req, res) {
  const now = Date.now();

  if (cachedData && (now - cachedTime < CACHE_DURATION)) {
    return res.status(200).json(cachedData);
  }

 const BASE_ID = "app5DoZKkIuqd6Quo";
const TABLE_ID = "tblcLGQDcypZPFbZA";

  const airtableRes = await fetch(
   `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    }
  );

  const data = await airtableRes.json();
  cachedData = data;
  cachedTime = now;

  return res.status(200).json(data);
}
