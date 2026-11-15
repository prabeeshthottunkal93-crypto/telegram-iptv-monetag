# Telegram IPTV Monetag Mini App

Starter project for playing authorized HLS/M3U8 streams inside a Telegram Mini App, with optional video pre-roll and a clearly labeled, user-clickable Monetag SmartLink.

## Files
- index.html — Mini App page
- style.css — responsive layout
- app.js — HLS playback and ad flow
- config.js — ad settings
- channels.json — editable channel list

## Configure channels
Edit channels.json and add only streams you own or are authorized to redistribute:
[
  {"name":"My channel","category":"News","streamUrl":"https://example.com/live/index.m3u8","description":"Example"}
]
Streams may be offline, geo-restricted, or block browser playback through CORS.

## Configure ads
Edit config.js. Set videoAdUrl to a direct MP4/WebM video ad that you own or are licensed to display. Monetag SmartLink is a separate clickable sponsor link, not a video commercial. Do not force redirects or fake clicks.

## Publish with GitHub Pages
1. Open repository Settings → Pages.
2. Select Deploy from a branch.
3. Choose main and /(root), then Save.
4. Wait for the HTTPS site URL to appear.

## Connect Telegram
Use @BotFather to configure the Mini App/menu button URL to your GitHub Pages URL. Never put your Telegram bot token in this public repository or browser JavaScript.

## Limitations
GitHub Pages is static hosting, not a streaming server. HLS.js requires stream servers to permit browser access. True mid-roll ad insertion into a live stream requires an ad insertion system or broadcaster ad feed; this starter supports pre-roll video ads. Follow broadcaster, Telegram, GitHub, and Monetag policies.