MYTT FINAL INTEGRATED — 16 AUG 2026

UPLOAD_TO_GITHUB
----------------
These are the website files to publish to the existing MYTT GitHub Pages repository.
Replace the matching files in the repository with the files from this folder.

Included website state:
- Mobile app-style page navigation
- Home Rank Journey directly under PLAY / COMPETE / IMPROVE / RANK
- Compact Home action buttons
- Compact mobile Events layout
- Integrated Rating Day event photo treatment for desktop + mobile
- Mobile leaderboard cards
- Compact horizontal mobile Player Cards
- Player tier icon treatment
- Players mobile search + two filters layout
- Market multi-photo and full-photo detail styling
- Join / Submit mobile hub
- Mobile modal close-button/header fix
- Mobile title alignment fixes
- Current rating highlight styling

BACKEND_REFERENCE
-----------------
Reference copies of the latest known Apps Script files used during this build.
Do NOT redeploy these simply because they are included here if your current deployed Web Apps are already working.

Important Singles note:
MYTT_Singles_Rating_WebApp_SCORE_TEXT_FIX.gs is the version that prevents 3-1 / 3-2 from being converted into Google Sheets dates.

Deployment:
1. Upload/replace the files inside UPLOAD_TO_GITHUB.
2. Commit changes.
3. Wait for GitHub Pages deployment.
4. Hard refresh mytt.my on desktop and mobile.
