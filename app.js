(() => {
  const cfg = window.TV_CONFIG || {};
  const player = document.getElementById("player"), adPanel = document.getElementById("ad-panel"), adVideo = document.getElementById("ad-video");
  const continueButton = document.getElementById("continue-button"), sponsorLink = document.getElementById("monetag-link"), message = document.getElementById("player-message"), channelsEl = document.getElementById("channels");
  const searchInput = document.getElementById("channel-search");
  const playerWrap = document.querySelector(".player-wrap");
  const rotateButton = document.getElementById("rotate-button");
  let hls = null, selectedStream = "", adFinished = false, allChannels = [];
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg) { tg.ready(); tg.expand(); document.getElementById("tg-status").textContent = "Telegram Mini App"; }

  rotateButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return; }
      if (playerWrap.requestFullscreen) await playerWrap.requestFullscreen();
      else if (tg && typeof tg.requestFullscreen === "function") tg.requestFullscreen();
      else { message.textContent = "Fullscreen is not supported here. Rotate your phone to landscape."; message.classList.remove("hide"); return; }
      if (screen.orientation && screen.orientation.lock) { try { await screen.orientation.lock("landscape"); } catch (_) {} }
    } catch (_) { message.textContent = "Enable Auto-rotate on your phone and try again."; message.classList.remove("hide"); }
  });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); });
  sponsorLink.href = cfg.monetagSmartLink || "#"; sponsorLink.hidden = !cfg.monetagSmartLink;

  function parseM3U(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    const result = []; let meta = null;
    for (const raw of lines) {
      const line = raw.trim(); if (!line) continue;
      if (line.startsWith("#EXTINF:")) {
        const comma = line.lastIndexOf(",");
        const attrs = line.slice(0, comma < 0 ? line.length : comma);
        const name = comma < 0 ? "Unknown channel" : line.slice(comma + 1).trim();
        const get = key => { const m = attrs.match(new RegExp('(?:^|\\s)' + key + '="([^"]*)"')); return m ? m[1] : ""; };
        meta = { name, category: get("group-title") || "Other", logo: get("tvg-logo"), description: get("tvg-country") || "" };
      } else if (line.startsWith("#")) {
        continue;
      } else if (/^https?:\/\//i.test(line)) {
        const ch = meta || { name: "Unnamed channel", category: "Other", logo: "", description: "" };
        result.push({ ...ch, streamUrl: line }); meta = null;
      }
    }
    return result;
  }

  function startStream(url) {
    if (!url) { message.textContent = "This channel has no playable stream URL."; message.classList.remove("hide"); return; }
    adPanel.hidden = true; adVideo.pause();
    if (hls) { hls.destroy(); hls = null; }
    player.pause(); player.removeAttribute("src"); player.load(); message.textContent = "Loading channel…"; message.classList.remove("hide");
    const isHls = /\.m3u8(?:$|[?#])/i.test(url) || /m3u8/i.test(url);
    if (!isHls) {
      player.src = url;
      player.addEventListener("loadedmetadata", () => { message.classList.add("hide"); player.play().catch(() => { message.textContent = "Press play to start the demo video."; message.classList.remove("hide"); }); }, { once: true });
      player.addEventListener("error", () => { message.textContent = "Unable to play this video. Try another stream."; message.classList.remove("hide"); }, { once: true });
    } else if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true }); hls.loadSource(url); hls.attachMedia(player);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { message.classList.add("hide"); player.play().catch(() => { message.textContent = "Press play to start the channel."; message.classList.remove("hide"); }); });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) { message.textContent = "Unable to play this stream. It may be offline, blocked, or incompatible."; message.classList.remove("hide"); hls.destroy(); hls = null; } });
    } else if (player.canPlayType("application/vnd.apple.mpegurl")) {
      player.src = url; player.addEventListener("loadedmetadata", () => player.play().catch(() => {}), { once: true });
    } else { message.textContent = "HLS playback is not supported in this browser."; message.classList.remove("hide"); }
  }

  function showAdsThenPlay(url) {
    selectedStream = url;
    if (!cfg.videoAdUrl) { startStream(url); return; }
    adFinished = false; continueButton.disabled = true; adPanel.hidden = false; adVideo.src = cfg.videoAdUrl; adVideo.currentTime = 0;
    adVideo.onended = () => { adFinished = true; continueButton.disabled = false; };
    adVideo.onerror = () => { document.getElementById("ad-caption").textContent = "The ad video could not load. You can continue to the channel."; continueButton.disabled = false; };
    if (!cfg.requireVideoAdCompletion) continueButton.disabled = false;
    adVideo.play().catch(() => { document.getElementById("ad-caption").textContent = "Tap play on the ad, or continue to the channel."; continueButton.disabled = false; });
    message.textContent = "Advertisement"; message.classList.remove("hide");
  }
  continueButton.addEventListener("click", () => { if (cfg.requireVideoAdCompletion && !adFinished) return; startStream(selectedStream); });

  function renderChannels() {
    const q = (searchInput.value || "").trim().toLowerCase();
    const visible = allChannels.filter(ch => [ch.name, ch.category, ch.description].join(" ").toLowerCase().includes(q));
    document.getElementById("channel-count").textContent = visible.length + " / " + allChannels.length + " channels";
    channelsEl.replaceChildren();
    if (!visible.length) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "No channels match your search."; channelsEl.append(p); return; }
    const fragment = document.createDocumentFragment();
    visible.forEach(ch => {
      const b = document.createElement("button"); b.className = "channel"; b.type = "button";
      const n = document.createElement("strong"); n.textContent = ch.name || "Untitled channel";
      const d = document.createElement("small"); d.textContent = [ch.category, ch.description].filter(Boolean).join(" · ");
      b.append(n, d); b.addEventListener("click", () => showAdsThenPlay(ch.streamUrl || "")); fragment.append(b);
    });
    channelsEl.append(fragment);
  }
  searchInput.addEventListener("input", renderChannels);

  const playlistUrl = cfg.playlistUrl || "https://iptv-org.github.io/iptv/index.m3u";
  fetch(playlistUrl).then(r => { if (!r.ok) throw new Error("Playlist request failed (" + r.status + ")."); return r.text(); })
    .then(text => {
      allChannels = [
        { name: "Demo Video – Flower", category: "Demo", description: "Sample MP4 video for testing playback", streamUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
        ...parseM3U(text)
      ];
      renderChannels();
    })
    .catch(err => {
      channelsEl.replaceChildren(); const p = document.createElement("p"); p.className = "muted";
      p.textContent = err.message + " The playlist host may block browser requests (CORS), or be temporarily unavailable. Try again later or configure a CORS-enabled playlist source.";
      channelsEl.append(p); document.getElementById("channel-count").textContent = "Unavailable";
    });
})();