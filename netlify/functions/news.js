async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`request failed ${res.status}`);
  return res.json();
}

function normalizeItems(data) {
  const raw = data?.data || data?.items || data?.list || data?.news || [];
  if (!Array.isArray(raw)) return [];
  return raw.map(item => ({
    title: item.title || item.name || item.headline || "Market update",
    summary: item.summary || item.description || item.content || item.brief || "",
    url: item.url || item.link || ""
  }));
}

exports.handler = async function () {
  const baseUrl = process.env.SOSOVALUE_BASE_URL;
  const apiKey = process.env.SOSOVALUE_API_KEY;

  if (baseUrl && apiKey) {
    const candidates = ["/news", "/market/news", "/crypto/news", "/research/news"];
    for (const path of candidates) {
      try {
        const data = await fetchJson(`${baseUrl}${path}`, {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
        });
        const items = normalizeItems(data);
        if (items.length) return { statusCode: 200, body: JSON.stringify({ items }) };
      } catch (_) {}
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { title: "Bitcoin market watches liquidity and ETF flows", summary: "Monitor volume, price structure and major macro events before entering short-term positions." },
        { title: "Altcoin risk remains sensitive to BTC dominance", summary: "Smaller assets can move faster, but usually carry higher drawdown risk and lower liquidity." },
        { title: "On-chain workflow connects research and execution", summary: "A better crypto dashboard should combine market data, risk checks, alerts and trading preparation in one place." }
      ]
    })
  };
};
