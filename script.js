const state = {
  coins: [],
  filteredCoins: [],
  portfolio: JSON.parse(localStorage.getItem("portfolio") || "[]"),
  alerts: JSON.parse(localStorage.getItem("alerts") || "[]"),
  trades: JSON.parse(localStorage.getItem("trades") || "[]"),
  lang: localStorage.getItem("lang") || "EN"
};

const coinIds = ["bitcoin", "ethereum", "dogecoin", "solana", "binancecoin", "ripple", "cardano", "avalanche-2", "chainlink", "polkadot", "tron", "litecoin", "polygon-ecosystem-token", "uniswap", "near", "aptos", "arbitrum", "optimism", "internet-computer", "stellar"];

const $ = (id) => document.getElementById(id);
const money = (num) => Number(num || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Number(num) < 1 ? 6 : 2 });
const compact = (num) => Number(num || 0).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
const pct = (num) => `${Number(num || 0).toFixed(2)}%`;

function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2600);
}

async function safeJson(url, fallbackUrl) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("primary failed");
    return await res.json();
  } catch (_) {
    const res = await fetch(fallbackUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("fallback failed");
    return await res.json();
  }
}

async function loadMarket() {
  $("lastUpdated").textContent = "syncing";
  const fallback = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds.join(",")}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`;
  const data = await safeJson("/.netlify/functions/market", fallback);
  state.coins = Array.isArray(data) ? data : data.coins || [];
  state.filteredCoins = state.coins;
  renderAll();
  $("lastUpdated").textContent = new Date().toLocaleTimeString();
  checkAlerts();
}

async function loadTrending() {
  try {
    const data = await safeJson("/.netlify/functions/trending", "https://api.coingecko.com/api/v3/search/trending");
    const items = data.coins || data.trending || [];
    $("trendList").innerHTML = items.slice(0, 7).map((item, index) => {
      const coin = item.item || item;
      return `<div><strong>${index + 1}. ${coin.name || coin.symbol || "Asset"}</strong><br><span class="muted">${(coin.symbol || "").toUpperCase()} · rank ${coin.market_cap_rank || "--"}</span></div>`;
    }).join("") || `<div>No trend data yet</div>`;
  } catch (_) {
    $("trendList").innerHTML = `<div>Trend data will load after deploy.</div>`;
  }
}

async function loadNews() {
  $("newsList").innerHTML = `<div class="news-item">Loading research feed...</div>`;
  try {
    const res = await fetch("/.netlify/functions/news", { cache: "no-store" });
    if (!res.ok) throw new Error("news failed");
    const data = await res.json();
    const items = data.items || [];
    renderNews(items);
  } catch (_) {
    renderNews([
      { title: "Bitcoin market watches liquidity and ETF flows", summary: "Monitor volume, price structure and major macro events before entering short-term positions." },
      { title: "Altcoin risk remains sensitive to BTC dominance", summary: "Smaller assets can move faster, but usually carry higher drawdown risk and lower liquidity." },
      { title: "DEX workflows need research before execution", summary: "A stronger crypto workflow connects market intelligence, risk checks and trade planning before order placement." }
    ]);
  }
}

function renderNews(items) {
  $("newsList").innerHTML = items.slice(0, 8).map((item) => `
    <article class="news-item">
      <h3>${item.title || "Market update"}</h3>
      <p>${item.summary || item.description || "No summary available."}</p>
      ${item.url ? `<a class="action-btn" href="${item.url}" target="_blank" rel="noopener">Read</a>` : ""}
    </article>
  `).join("");
}

function renderAll() {
  renderCards();
  renderTable();
  fillSelects();
  renderSignals();
  renderConverter();
  renderPortfolio();
  renderAlerts();
  renderTrades();
  renderRisk();
}

function renderCards() {
  const top = state.coins.slice(0, 8);
  $("coinCards").innerHTML = top.map((coin) => `
    <div class="coin-card">
      <div class="coin-icon">${coin.symbol?.[0]?.toUpperCase() || "$"}</div>
      <div>
        <h3>${coin.name}</h3>
        <strong>${money(coin.current_price)}</strong>
        <small class="${coin.price_change_percentage_24h >= 0 ? "green" : "red"}">${pct(coin.price_change_percentage_24h)}</small>
      </div>
    </div>
  `).join("");
}

function renderTable() {
  const rows = state.filteredCoins.map((coin, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><img src="${coin.image}" alt=""> <strong>${coin.name}</strong> <span class="muted">${coin.symbol.toUpperCase()}</span></td>
      <td>${money(coin.current_price)}</td>
      <td class="${coin.price_change_percentage_24h >= 0 ? "green" : "red"}">${pct(coin.price_change_percentage_24h)}</td>
      <td>${money(coin.market_cap)}</td>
      <td>${money(coin.total_volume)}</td>
      <td><button class="action-btn" data-watch="${coin.id}">Watch</button></td>
    </tr>
  `).join("");
  $("marketRows").innerHTML = rows || `<tr><td colspan="7">No coin found</td></tr>`;
  document.querySelectorAll("[data-watch]").forEach(btn => btn.addEventListener("click", () => addWatch(btn.dataset.watch)));
}

function renderSignals() {
  const avg = state.coins.slice(0, 10).reduce((sum, c) => sum + Number(c.price_change_percentage_24h || 0), 0) / Math.max(1, state.coins.slice(0, 10).length);
  const rising = state.coins.filter(c => c.price_change_percentage_24h > 0).length;
  const btc = state.coins.find(c => c.id === "bitcoin");
  $("marketPulse").textContent = avg > 1.2 ? "Bullish" : avg < -1.2 ? "Bearish" : "Neutral";
  $("signalList").innerHTML = `
    <div class="signal"><span>Top 10 average</span><strong class="${avg >= 0 ? "green" : "red"}">${pct(avg)}</strong></div>
    <div class="signal"><span>Coins rising</span><strong>${rising}/${state.coins.length}</strong></div>
    <div class="signal"><span>BTC 24h move</span><strong class="${(btc?.price_change_percentage_24h || 0) >= 0 ? "green" : "red"}">${pct(btc?.price_change_percentage_24h)}</strong></div>
  `;
}

function fillSelects() {
  const options = state.coins.map(c => `<option value="${c.id}">${c.name} (${c.symbol.toUpperCase()})</option>`).join("");
  ["convertCoin", "portfolioCoin", "alertCoin", "tradeFrom", "tradeTo", "riskCoin"].forEach(id => {
    const el = $(id);
    if (el && el.options.length !== state.coins.length) el.innerHTML = options;
  });
  if ($("tradeTo") && !$("tradeTo").dataset.ready) {
    $("tradeTo").value = "ethereum";
    $("tradeTo").dataset.ready = "1";
  }
}

function renderConverter() {
  const coin = state.coins.find(c => c.id === $("convertCoin")?.value) || state.coins[0];
  const amount = Number($("convertAmount")?.value || 0);
  if ($("convertResult")) $("convertResult").textContent = `${amount} ${coin?.symbol?.toUpperCase() || ""} ≈ ${money(amount * (coin?.current_price || 0))}`;
}

function addWatch(id) {
  const coin = state.coins.find(c => c.id === id);
  if (!coin) return;
  toast(`${coin.name} added to watchlist`);
}

function renderPortfolio() {
  const totalValue = state.portfolio.reduce((sum, h) => {
    const coin = state.coins.find(c => c.id === h.id);
    return sum + (coin?.current_price || 0) * h.qty;
  }, 0);
  const totalCost = state.portfolio.reduce((sum, h) => sum + h.cost * h.qty, 0);
  const pnl = totalValue - totalCost;
  $("portfolioSummary").innerHTML = state.portfolio.length ? `Value: <strong>${money(totalValue)}</strong><br>P/L: <strong class="${pnl >= 0 ? "green" : "red"}">${money(pnl)}</strong>` : "Portfolio empty";
  $("portfolioList").innerHTML = state.portfolio.map((h, idx) => {
    const coin = state.coins.find(c => c.id === h.id);
    const val = (coin?.current_price || 0) * h.qty;
    const pnlItem = val - h.cost * h.qty;
    return `<div><strong>${coin?.name || h.id}</strong> · ${h.qty}<br><span class="${pnlItem >= 0 ? "green" : "red"}">${money(pnlItem)}</span> <button class="action-btn" data-remove-holding="${idx}">Remove</button></div>`;
  }).join("");
  document.querySelectorAll("[data-remove-holding]").forEach(btn => btn.addEventListener("click", () => {
    state.portfolio.splice(Number(btn.dataset.removeHolding), 1);
    localStorage.setItem("portfolio", JSON.stringify(state.portfolio));
    renderPortfolio();
  }));
}

function renderAlerts() {
  $("alertList").innerHTML = state.alerts.map((a, idx) => `<div><strong>${a.id}</strong> ${a.direction} ${money(a.price)} <button class="action-btn" data-remove-alert="${idx}">Remove</button></div>`).join("") || `<div>No alerts yet</div>`;
  document.querySelectorAll("[data-remove-alert]").forEach(btn => btn.addEventListener("click", () => {
    state.alerts.splice(Number(btn.dataset.removeAlert), 1);
    localStorage.setItem("alerts", JSON.stringify(state.alerts));
    renderAlerts();
  }));
}

function checkAlerts() {
  state.alerts.forEach(a => {
    const coin = state.coins.find(c => c.id === a.id);
    if (!coin || a.done) return;
    const hit = a.direction === "above" ? coin.current_price >= a.price : coin.current_price <= a.price;
    if (hit) {
      a.done = true;
      toast(`Alert hit: ${coin.name} is ${a.direction} ${money(a.price)}`);
    }
  });
  localStorage.setItem("alerts", JSON.stringify(state.alerts));
  renderAlerts();
}

function renderTradeEstimate() {
  const from = state.coins.find(c => c.id === $("tradeFrom")?.value);
  const to = state.coins.find(c => c.id === $("tradeTo")?.value);
  const amount = Number($("tradeAmount")?.value || 0);
  const out = from && to ? (amount * from.current_price) / to.current_price : 0;
  if ($("tradeEstimate")) $("tradeEstimate").innerHTML = `Estimate: <strong>${out.toFixed(6)} ${to?.symbol?.toUpperCase() || ""}</strong>`;
}

function renderTrades() {
  $("tradeHistory").innerHTML = state.trades.map(t => `<div>${t.time} · ${t.amount} ${t.from} → ${t.to} · estimate ${t.estimate}</div>`).join("") || `<div>No trade plans yet</div>`;
  renderTradeEstimate();
}

function renderRisk() {
  const id = $("riskCoin")?.value;
  const coin = state.coins.find(c => c.id === id) || state.coins[0];
  if (!coin || !$("riskResult")) return;
  const volRisk = Math.min(40, Math.abs(coin.price_change_percentage_24h || 0) * 2.5);
  const liqRisk = coin.total_volume > 1000000000 ? 8 : coin.total_volume > 100000000 ? 18 : 30;
  const capRisk = coin.market_cap > 10000000000 ? 8 : coin.market_cap > 1000000000 ? 18 : 30;
  const score = Math.round(volRisk + liqRisk + capRisk);
  const label = score < 35 ? "Lower" : score < 60 ? "Medium" : "High";
  $("riskResult").innerHTML = `<h3 class="${score < 35 ? "green" : score < 60 ? "orange" : "red"}">${label} Risk · ${score}/100</h3><p>Volatility, liquidity and market cap are checked using latest market data.</p>`;
}


function initWaveMusicPlayer() {
  const player = $("waveMusicPlayer");
  const audio = $("waveAudio");
  const playBtn = $("musicPlay");
  const prevBtn = $("musicPrev");
  const nextBtn = $("musicNext");
  const seek = $("musicSeek");
  const current = $("musicCurrent");
  const duration = $("musicDuration");
  const volume = $("musicVolume");
  const fileInput = $("musicFile");
  const defaultBtn = $("musicDefault");
  const muteBtn = $("musicMute");
  const repeatBtn = $("musicRepeat");
  const collapseBtn = $("musicCollapse");
  const trackName = $("musicTrackName");
  const statusText = $("musicStatusText");
  const playlist = $("musicPlaylist");
  const demoBtn = $("demoModeBtn");
  const demoOverlay = $("demoOverlay");
  const demoOverlayText = $("demoOverlayText");
  if (!player || !audio) return;

  const tracks = [
    { title: "SoSoValue Wave 2", src: "audio/SoSoValue Wave 2.mp3", note: "Built for Wave 2 demo experience" },
    { title: "Market Signal", src: "audio/Market Signal.mp3", note: "Fast trading section energy" },
    { title: "On-chain Night", src: "audio/On-chain Night.mp3", note: "ValueChain cyber xianxia mood" },
    { title: "Crypto Disco", src: "audio/Crypto Disco.mp3", note: "90s disco crypto anthem" }
  ];
  let trackIndex = Math.max(0, tracks.findIndex(t => t.src === localStorage.getItem("waveMusicTrack")));
  let repeat = localStorage.getItem("waveMusicRepeat") === "true";
  let demoTimer = null;
  let overlayTimer = null;
  const demoSteps = [
    { section: "market", text: "Market intelligence: live prices, signals and watchlist" },
    { section: "features", text: "Tool layer: converter, risk scanner, portfolio and trade plan" },
    { section: "whitepapers", text: "Research layer: explain the logic behind the crypto workflow" },
    { section: "about", text: "Official ecosystem links: SoSoValue, SoDEX and SSI" }
  ];
  let demoStep = 0;

  const fmt = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const showDemoOverlay = (text) => {
    if (!demoOverlay || !demoOverlayText) return;
    demoOverlayText.textContent = text;
    demoOverlay.classList.add("show");
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => demoOverlay.classList.remove("show"), 2600);
  };

  const setTrack = (index, autoPlay = false) => {
    trackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[trackIndex];
    audio.src = track.src;
    trackName.textContent = track.title;
    if (statusText) statusText.textContent = track.note;
    if (playlist) playlist.value = track.src;
    localStorage.setItem("waveMusicTrack", track.src);
    audio.load();
    if (autoPlay) tryPlay();
  };

  const setPlayingUI = () => {
    const active = !audio.paused;
    player.classList.toggle("playing", active);
    document.body.classList.toggle("music-active", active);
    playBtn.textContent = active ? "❚❚" : "▶";
  };

  const tryPlay = async () => {
    try {
      await audio.play();
      setPlayingUI();
    } catch (_) {
      if (statusText) statusText.textContent = "Default track not found. Open an MP3 file or click again.";
      toast("Open MP3 if the default track is not uploaded");
    }
  };

  const activateSection = (sectionId) => {
    const link = document.querySelector(`[data-section="${sectionId}"]`);
    if (link) link.click();
    const section = $(sectionId);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const stopDemo = () => {
    clearInterval(demoTimer);
    demoTimer = null;
    if (demoBtn) {
      demoBtn.classList.remove("active");
      demoBtn.textContent = "Demo Mode";
    }
    if (demoOverlay) demoOverlay.classList.remove("show");
    toast("Demo Mode stopped");
  };

  const startDemo = () => {
    player.classList.remove("collapsed");
    if (audio.paused) tryPlay();
    if (demoBtn) {
      demoBtn.classList.add("active");
      demoBtn.textContent = "Stop Demo";
    }
    demoStep = 0;
    const runStep = () => {
      const step = demoSteps[demoStep % demoSteps.length];
      activateSection(step.section);
      showDemoOverlay(step.text);
      toast(step.text);
      demoStep += 1;
    };
    runStep();
    clearInterval(demoTimer);
    demoTimer = setInterval(runStep, 5200);
  };

  audio.volume = Number(localStorage.getItem("waveMusicVolume") || 0.75);
  if (volume) volume.value = audio.volume;
  if (repeatBtn) repeatBtn.textContent = repeat ? "Repeat On" : "Repeat";
  setTrack(trackIndex, false);

  playBtn.addEventListener("click", () => audio.paused ? tryPlay() : audio.pause());
  prevBtn?.addEventListener("click", () => setTrack(trackIndex - 1, true));
  nextBtn?.addEventListener("click", () => setTrack(trackIndex + 1, true));
  playlist?.addEventListener("change", () => {
    const index = tracks.findIndex(t => t.src === playlist.value);
    setTrack(index >= 0 ? index : 0, true);
  });
  audio.addEventListener("play", setPlayingUI);
  audio.addEventListener("pause", setPlayingUI);
  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = fmt(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    current.textContent = fmt(audio.currentTime);
    seek.value = audio.duration ? String((audio.currentTime / audio.duration) * 100) : "0";
  });
  audio.addEventListener("ended", () => repeat ? setTrack(trackIndex, true) : setTrack(trackIndex + 1, true));
  seek.addEventListener("input", () => {
    if (audio.duration) audio.currentTime = (Number(seek.value) / 100) * audio.duration;
  });
  volume?.addEventListener("input", () => {
    audio.volume = Number(volume.value);
    audio.muted = false;
    muteBtn.textContent = "Mute";
    localStorage.setItem("waveMusicVolume", String(audio.volume));
  });
  muteBtn?.addEventListener("click", () => {
    audio.muted = !audio.muted;
    muteBtn.textContent = audio.muted ? "Unmute" : "Mute";
  });
  repeatBtn?.addEventListener("click", () => {
    repeat = !repeat;
    localStorage.setItem("waveMusicRepeat", String(repeat));
    repeatBtn.textContent = repeat ? "Repeat On" : "Repeat";
    toast(repeat ? "Repeat enabled" : "Repeat disabled");
  });
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    audio.src = URL.createObjectURL(file);
    trackName.textContent = file.name.replace(/\.(mp3|wav|m4a|aac|ogg)$/i, "");
    if (statusText) statusText.textContent = "Local MP3 loaded from your computer";
    audio.load();
    toast("MP3 loaded");
    tryPlay();
  });
  defaultBtn?.addEventListener("click", () => setTrack(0, true));
  collapseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    player.classList.toggle("collapsed");
  });
  player.addEventListener("click", (e) => {
    if (player.classList.contains("collapsed") && e.target === player) player.classList.remove("collapsed");
  });
  demoBtn?.addEventListener("click", () => demoTimer ? stopDemo() : startDemo());
  audio.addEventListener("error", () => {
    if (statusText) statusText.textContent = "Default track missing. Use Open MP3 or add files in /audio.";
  });
}

function updateBrandClock() {
  const timeEl = $("brandTime");
  const dateEl = $("brandDate");
  if (!timeEl || !dateEl) return;
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const dateText = now.toLocaleDateString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  dateEl.textContent = `${dateText} • ${timeZone}`;
}

function initBrandClock() {
  updateBrandClock();
  setInterval(updateBrandClock, 1000);
}

function bindEvents() {
  document.querySelectorAll("[data-section]").forEach(el => el.addEventListener("click", (e) => {
    e.preventDefault();
    const target = el.dataset.section;
    document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active-section"));
    document.querySelectorAll(".nav-menu a").forEach(a => a.classList.remove("active"));
    $(target).classList.add("active-section");
    document.querySelectorAll(`[data-section="${target}"]`).forEach(a => a.classList.add("active"));
    history.replaceState(null, "", `#${target}`);
  }));
  document.querySelectorAll("[data-scroll]").forEach(btn => btn.addEventListener("click", () => $(btn.dataset.scroll).scrollIntoView({ behavior: "smooth" })));
  $("refreshBtn").addEventListener("click", () => loadMarket().then(() => toast("Market refreshed")));
  $("langBtn").addEventListener("click", () => {
    state.lang = state.lang === "EN" ? "VI" : "EN";
    localStorage.setItem("lang", state.lang);
    $("langBtn").textContent = state.lang;
    toast(state.lang === "VI" ? "Đã chuyển ngôn ngữ" : "Language switched");
  });
  $("coinSearch").addEventListener("input", e => {
    const q = e.target.value.toLowerCase().trim();
    state.filteredCoins = state.coins.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
    renderTable();
  });
  ["convertAmount", "convertCoin"].forEach(id => $(id).addEventListener("input", renderConverter));
  ["tradeFrom", "tradeTo", "tradeAmount"].forEach(id => $(id).addEventListener("input", renderTradeEstimate));
  $("addHolding").addEventListener("click", () => {
    const id = $("portfolioCoin").value, qty = Number($("portfolioQty").value), cost = Number($("portfolioCost").value);
    if (!qty || !cost) return toast("Enter quantity and buy price");
    state.portfolio.push({ id, qty, cost });
    localStorage.setItem("portfolio", JSON.stringify(state.portfolio));
    renderPortfolio();
    toast("Holding added");
  });
  $("addAlert").addEventListener("click", () => {
    const price = Number($("alertPrice").value);
    if (!price) return toast("Enter target price");
    state.alerts.push({ id: $("alertCoin").value, direction: $("alertDirection").value, price, done: false });
    localStorage.setItem("alerts", JSON.stringify(state.alerts));
    renderAlerts();
    toast("Alert saved");
  });
  $("connectWallet").addEventListener("click", async () => {
    if (!window.ethereum) return toast("Wallet extension not found");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      $("networkInfo").textContent = `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
      toast("Wallet connected");
    } catch (_) { toast("Wallet connection cancelled"); }
  });
  $("mockTrade").addEventListener("click", () => {
    const from = state.coins.find(c => c.id === $("tradeFrom").value);
    const to = state.coins.find(c => c.id === $("tradeTo").value);
    const amount = Number($("tradeAmount").value || 0);
    const estimate = from && to ? ((amount * from.current_price) / to.current_price).toFixed(6) : "0";
    state.trades.unshift({ time: new Date().toLocaleTimeString(), from: from.symbol.toUpperCase(), to: to.symbol.toUpperCase(), amount, estimate });
    state.trades = state.trades.slice(0, 8);
    localStorage.setItem("trades", JSON.stringify(state.trades));
    renderTrades();
    toast("Trade plan created");
  });
  $("loadNews").addEventListener("click", loadNews);
  if ($("copyOfficialLinks")) {
    $("copyOfficialLinks").addEventListener("click", async () => {
      const links = [
        "SoSoValue: https://m.sosovalue.com/",
        "SoSoValue Developer/API: https://m.sosovalue.com/developer",
        "SoSoValue Research: https://m.sosovalue.com/research/research",
        "SoDEX: https://sodex.com/",
        "SoDEX Docs: https://sodex.com/documentation",
        "SoDEX API: https://sodex.com/documentation/api/api",
        "SSI: https://ssi.sosovalue.com/",
        "SSI Docs: https://sosovalue.gitbook.io/sosovalue-indices"
      ].join("\n");
      try {
        await navigator.clipboard.writeText(links);
        toast("Official links copied");
      } catch (_) {
        toast("Copy not available on this browser");
      }
    });
  }
  $("riskCoin").addEventListener("input", renderRisk);
  document.querySelectorAll("[data-learn]").forEach(btn => btn.addEventListener("click", () => {
    const text = {
      marketcap: "Market cap = current price × circulating supply. It helps compare the size of different crypto assets.",
      volume: "Volume shows how much an asset was traded. Higher volume usually means stronger liquidity and easier execution.",
      risk: "Control risk by limiting position size, avoiding over-leverage, setting alerts and checking liquidity before trading.",
      dex: "A DEX lets users trade on-chain through wallets and smart contracts instead of a traditional centralized exchange."
    }[btn.dataset.learn];
    $("learnOutput").textContent = text;
  }));
}

async function init() {
  bindEvents();
  initBrandClock();
  initWaveMusicPlayer();
  $("langBtn").textContent = state.lang;
  await loadMarket();
  loadTrending();
  loadNews();
  setInterval(loadMarket, 60000);
  const hash = location.hash.replace("#", "");
  if (["market", "features", "whitepapers", "about"].includes(hash)) document.querySelector(`[data-section="${hash}"]`).click();
}

init().catch(() => toast("Market data is temporarily unavailable"));
