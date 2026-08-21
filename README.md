# MYTT — Malaysia Table Tennis Rating System

Official source for **mytt.my**.

## Current architecture

- `index.html` — page structure, navigation, forms and MYTT endpoint configuration.
- `app.js` — player data, Singles/Doubles leaderboards, Events, profiles, match history and the canonical MYTT rank tier mapping.
- `style.css` — core desktop/mobile presentation.
- `site-overrides-v24.css` — consolidated late visual overrides retained from the historical inline CSS layer.
- `marketplace.js` + `marketplace-core-v23.js` — Gear Market client logic and lazy loading.
- `marketplace.css` + imported CSS modules — Market, Home mobile, Rank and compact Profile presentation.
- `mobile-polish-v23.css/js` — phone safe-area, form zoom prevention and compact Player Profile behaviour.
- `rank-badges-v22.css`, `home-rank-geometry.css`, `player-card-rank-badges-v1.css` — current Rank presentation only. Badge-to-tier mapping lives in `app.js`.
- `avatars/` and `rank-badges/` — website image assets.

## Backend reference files

- `MYTT_Events_Registration_WebApp_V20_AUTO_CONFIRM.gs` — Event registration backend reference.
- `MYTT_Gear_Market_WebApp.gs` — Gear Market backend reference, including 1–5 listing photos.

The live website talks to Google Sheets / Apps Script endpoints configured in `index.html`. When updating an existing Apps Script backend, edit the **existing deployment** so the current `/exec` URL remains unchanged unless a deliberate endpoint migration is planned.

## Current product behaviour

- Mobile bottom navigation: Home / Singles / Events / Doubles / More.
- Event registration confirms immediately when the event backend accepts it.
- Join MYTT registrations require admin review before the player profile is activated.
- Gear Market listings require admin review; approved listings can later be marked Sold or Rejected.
- Gear Market supports 1–5 photos per listing; Photo 1 is the listing cover.
- Phone form controls use 16px text to avoid iOS Safari focus zoom.
- Player Profile keeps the latest 10 Recent Matches visible and collapses only secondary sections on phones.

## Deployment

The site is published with GitHub Pages from this repository and the custom domain in `CNAME`.

For website-only changes, merge to `main`, wait for Pages deployment, then verify the affected desktop and mobile views. Do not redeploy a working Apps Script backend unless its `.gs` logic was intentionally changed.
