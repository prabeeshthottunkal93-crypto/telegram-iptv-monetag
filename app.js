(() => {
  const cfg = window.TV_CONFIG || {};
  const player = document.getElementById("player"), adPanel = document.getElementById("ad-panel"), adVideo = document.getElementById("ad-video");
  const continueButton = document.getElementById("continue-button"), sponsorLink = document.getElementById("monetag-link"), message = document.getElementById("player-message"), channelsEl = document.getElementById("channels");
  let hls = null, selectedStream = "", adFinished = false;
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg) { tg.ready(); tg.expand(); document.getElementById("tg-status").textContent = "Telegram Mini App"; }
  sponsorLink.href = cfg.monetagSmartLink || "#"; sponsorLink.hidden = !cfg.monetagSmartLink;
  function startStream(url) {
    if (!url) { message.textContent = "This channel has no stream URL yet. Add an authorized M3U8 URL in channels.json."; message.classList.remove("hide"); return; }
    selectedStream = url; adPanel.hidden = true; adVideo.pause();
    if (hls) { hls.destroy(); hls = null; }
    player.pause(); player.removeAttribute("src"); player.load(); message.textContent = "Loading channel…"; message.classList.remove("hide");
    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({enableWorker:true}); hls.loadSource(url); hls.attachMedia(player);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { message.classList.add("hide"); player.play().catch(() => { message.textContent = "Press play to start the channel."; message.classList.remove("hide"); }); });
      hls.on(Hls.Events.ERROR, (_e,data) => { if (data.fatal) { message.textContent = "Unable to play this stream. It may be offline, blocked, or incompatible."; message.classList.remove("hide"); hls.destroy(); hls=null; } });
    } else if (player.canPlayType("application/vnd.apple.mpegurl")) { player.src=url; player.addEventListener("loadedmetadata",()=>player.play().catch(()=>{}),{once:true}); }
    else { message.textContent="HLS playback is not supported in this browser."; message.classList.remove("hide"); }
  }
  function showAdsThenPlay(url) {
    selectedStream=url;
    if (!cfg.videoAdUrl) { startStream(url); return; }
    adFinished=false; continueButton.disabled=true; adPanel.hidden=false; adVideo.src=cfg.videoAdUrl; adVideo.currentTime=0;
    adVideo.onended=()=>{adFinished=true;continueButton.disabled=false;};
    adVideo.onerror=()=>{document.getElementById("ad-caption").textContent="The ad video could not load. You can continue to the channel.";continueButton.disabled=false;};
    if (!cfg.requireVideoAdCompletion) continueButton.disabled=false;
    adVideo.play().catch(()=>{document.getElementById("ad-caption").textContent="Tap play on the ad, or continue to the channel.";continueButton.disabled=false;});
    message.textContent="Advertisement";message.classList.remove("hide");
  }
  continueButton.addEventListener("click",()=>{if(cfg.requireVideoAdCompletion&&!adFinished)return;startStream(selectedStream);});
  fetch("channels.json").then(r=>{if(!r.ok)throw new Error("Could not load channels.json");return r.json();}).then(channels=>{
    document.getElementById("channel-count").textContent=channels.length+" listed";channelsEl.innerHTML="";
    channels.forEach(ch=>{const b=document.createElement("button");b.className="channel";b.type="button";const n=document.createElement("strong");n.textContent=ch.name||"Untitled channel";const d=document.createElement("small");d.textContent=[ch.category,ch.description].filter(Boolean).join(" · ");b.append(n,d);b.addEventListener("click",()=>showAdsThenPlay(ch.streamUrl||""));channelsEl.append(b);});
  }).catch(err=>{channelsEl.innerHTML="";const p=document.createElement("p");p.className="muted";p.textContent=err.message;channelsEl.append(p);});
})();