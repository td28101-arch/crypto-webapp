async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`request failed ${res.status}`);
  return res.json();
}

exports.handler = async function () {
  try {
    const data = await fetchJson("https://api.coingecko.com/api/v3/search/trending");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=120" },
      body: JSON.stringify(data)
    };
  } catch (_) {
    return { statusCode: 200, body: JSON.stringify({ coins: [] }) };
  }
};
