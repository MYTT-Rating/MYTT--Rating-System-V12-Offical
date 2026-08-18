MYTT V20 - Mobile Usability & Performance
Based on V19 Event Auto-Confirm + stable V18 Market Clean.

MOBILE UI CHANGES
- Compact app-style header on phones; the redundant hamburger navigation is hidden.
- Existing bottom navigation remains unchanged: Home / Singles / Events / Doubles / More.
- Key small text on Home, Rank Journey, player cards and Market is more readable.
- Event hero summary labels are enlarged without changing the approved red/black visual direction.
- Event facts (Time / Venue / Format / Total Spots) change from four tiny columns to a 2 x 2 grid on phones.
- All phone form inputs/selects/textareas use at least 16px text to prevent iPhone Safari auto-zoom.

EVENT REGISTRATION CHANGES
- Singles-only events automatically set Category = Singles and hide the unnecessary Category selector.
- Doubles-only events similarly auto-select Doubles; mixed events keep the selector.
- Optional Notes are collapsed behind '+ Add a note'.
- Confirm Registration action is sticky at the bottom of the Event modal on phones.
- Event registration remains instant-confirmation (no Event admin approval).
- Join MYTT profile registration still requires admin review.
- Market listings still require admin review.

PERFORMANCE CHANGES
- Core page data loads in parallel instead of one request after another.
- On phones, Doubles leaderboard data is deferred until the Doubles page is opened.
- Match history warms in the background and is refreshed when relevant.
- Market backend loading is deferred until the Market page is opened on phones.
- 60-second refreshes are page-aware and pause when the tab is hidden.
- Event art compressed:
  event-paddle.png ~175 KB -> event-paddle.webp ~23 KB
  event-pro-art.png ~982 KB -> event-pro-art.webp ~92 KB
- Duplicate legacy footer removed.

BACKEND
- V20 does not change the Event backend logic from V19.
- If MYTT_Events_Registration_WebApp_V19_AUTO_CONFIRM.gs is already deployed to the existing Events Web App, do NOT redeploy it for V20.
- If it has not been deployed yet, use the backend file included in the V20 Complete Update before uploading the website.

DEPLOYMENT
1. If V19 Event Auto-Confirm backend is already live: upload/replace the V20 website files only.
2. If V19 Event Auto-Confirm backend is NOT live: deploy the included Events Apps Script to the EXISTING deployment first, preserving its URL.
3. Upload all files from the V20 website ZIP to the GitHub Pages repository root, replacing the prior website files.
4. Wait for GitHub Pages deployment to turn green, then hard-refresh the site once.
5. Test on phone: Home, Events, Event Register, Singles, Doubles, More, Players and Market.

SMALL CLEANUP
- Added the favicon / Apple touch icon files already referenced by index.html, so those requests no longer 404.
