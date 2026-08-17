MYTT V19 - Event Auto-Confirm
Based on stable V18 Market Clean.

Website changes:
- Removed duplicate "Upcoming Matches" label; only "Upcoming MYTT Events" remains.
- Event registration now clearly states that successful registrations are confirmed immediately.
- Success state is now "Registration Confirmed".
- Accepted registrations refresh the Events list so capacity / spots remaining can update.
- Legacy pending/admin-review response wording is suppressed only after the server returns status=accepted.
- Market, Rank Journey, mobile bottom navigation, Singles/Doubles submission and Join MYTT approval flow are unchanged.

IMPORTANT DEPLOYMENT ORDER:
1. Deploy MYTT_Events_Registration_WebApp_V19_AUTO_CONFIRM.gs to the EXISTING Events Apps Script Web App first.
2. Keep the existing Web App deployment URL so the website action URL does not change.
3. Then upload the V19 website files.
4. Optional: run confirmExistingPendingRegistrations() once in Apps Script to convert old Event Registrations rows from Pending to Confirmed. This does not change capacity counts.
