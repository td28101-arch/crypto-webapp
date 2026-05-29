const coinIds = ["bitcoin", "ethereum", "dogecoin", "solana", "binancecoin", "ripple", "cardano", "avalanche-2", "chainlink", "polkadot", "tron", "litecoin", "polygon-ecosystem-token", "uniswap", "near", "aptos", "arbitrum", "optimism", "internet-computer", "stellar"];

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`request failed ${res.status}`);
  return res.json();
}

exports.handler = async function () {
  const fallbackUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds.join(",")}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`;

  try {
    const baseUrl = process.env.SOSOVALUE_BASE_URL;
    const apiKey = process.env.SOSOVALUE_API_KEY;
    if (baseUrl && apiKey) {
      try {
        const data = await fetchJson(`${baseUrl}/crypto/market`, {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
        });
        if (Array.isArray(data)) return { statusCode: 200, body: JSON.stringify(data) };
        if (Array.isArray(data?.data)) return { statusCode: 200, body: JSON.stringify(data.data) };
      } catch (_) {}
    }

    const fallback = await fetchJson(fallbackUrl);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=45" },
      body: JSON.stringify(fallback)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: "market unavailable" }) };
  }
};
