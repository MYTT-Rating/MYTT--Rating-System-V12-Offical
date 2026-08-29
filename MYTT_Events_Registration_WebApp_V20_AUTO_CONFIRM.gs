/*************************************************
 * MYTT EVENTS & REGISTRATION — WEB APP
 * Spreadsheet: 1WFX7yzKVeu4qVx86MFl6LPPo7yf075tHmsZldO9Rpsk
 *************************************************/

const EVENTS_SPREADSHEET_ID =
  "1WFX7yzKVeu4qVx86MFl6LPPo7yf075tHmsZldO9Rpsk";

const EVENTS_SHEETS = {
  EVENTS: "Events",
  REGISTRATIONS: "Event Registrations"
};

const EVENT_SUBMISSION_TTL_SECONDS = 600;


/***********************
 * WEB APP — GET
 ***********************/
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = cleanEventText(params.action);

  if (action === "admin") {
    return buildOrganizerAdminPage();
  }

  const callback = cleanEventText(params.callback)
    .replace(/[^A-Za-z0-9_$\.]/g, "");

  let payload;

  try {
    if (action === "events") {
      payload = {
        source: "MYTT_EVENTS_WEB_APP",
        status: "ok",
        events: getUpcomingEvents()
      };
    } else if (action === "registrations") {
      payload = getPublicEventRegistrations(cleanEventText(params.eventId));
    } else if (action === "status") {
      payload = getCachedRegistrationStatus(cleanEventText(params.id));
    } else {
      payload = {
        source: "MYTT_EVENTS_WEB_APP",
        status: "ok",
        message: "MYTT Events API"
      };
    }
  } catch (error) {
    payload = {
      source: "MYTT_EVENTS_WEB_APP",
      status: "error",
      message: error && error.message
        ? error.message
        : "Unexpected MYTT Events error."
    };
  }

  return createJsonpResponse(payload, callback);
}


/***********************
 * WEB APP — POST
 ***********************/
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let submissionId = "";

  try {
    if (!e || !e.parameter) {
      submissionId = Utilities.getUuid();
      return respondRegistration(submissionId, {
        status: "error",
        message: "Missing registration data."
      });
    }

    submissionId = cleanEventText(e.parameter.submissionId) || Utilities.getUuid();

    const cached = getCachedRegistrationStatus(submissionId);
    if (cached && cached.status !== "pending") {
      return createWebsiteResponse(cached);
    }

    const eventId = cleanEventText(e.parameter.eventId);
    const playerName = cleanEventText(e.parameter.playerName);
    const myttId = cleanEventText(e.parameter.myttId);
    const category = cleanEventText(e.parameter.category);
    const doublesPartner = cleanEventText(e.parameter.doublesPartner);
    const contactNumber = cleanEventText(e.parameter.contactNumber);
    const notes = cleanEventText(e.parameter.notes);

    if (!eventId) {
      return respondRegistration(submissionId, {
        status: "error",
        message: "Please select an event."
      });
    }

    if (!playerName) {
      return respondRegistration(submissionId, {
        status: "error",
        message: "Player Name is required."
      });
    }

    if (!category) {
      return respondRegistration(submissionId, {
        status: "error",
        message: "Please select a registration category."
      });
    }

    if (!contactNumber) {
      return respondRegistration(submissionId, {
        status: "error",
        message: "Contact Number is required."
      });
    }

    if (category.toLowerCase().includes("double") && !doublesPartner) {
      return respondRegistration(submissionId, {
        status: "error",
        message: "Please enter your Doubles Partner."
      });
    }

    const ss = SpreadsheetApp.openById(EVENTS_SPREADSHEET_ID);
    const eventsSheet = ss.getSheetByName(EVENTS_SHEETS.EVENTS);
    const registrationsSheet = ss.getSheetByName(EVENTS_SHEETS.REGISTRATIONS);

    if (!eventsSheet) throw new Error("Cannot find sheet: Events");
    if (!registrationsSheet) throw new Error("Cannot find sheet: Event Registrations");

    const event = getEventById(eventsSheet, registrationsSheet, eventId);

    if (!event) {
      return respondRegistration(submissionId, {
        status: "error",
        message: "This MYTT event could not be found."
      });
    }

    if (event.effectiveStatus === "Full") {
      return respondRegistration(submissionId, {
        status: "full",
        message: "This event is currently full."
      });
    }

    if (event.effectiveStatus === "Closed" || event.effectiveStatus === "Completed") {
      return respondRegistration(submissionId, {
        status: "closed",
        message: "Registration for this event is closed."
      });
    }

    if (event.effectiveStatus === "Upcoming") {
      return respondRegistration(submissionId, {
        status: "closed",
        message: "Registration for this event has not opened yet."
      });
    }

    const duplicate = findExistingRegistration(
      registrationsSheet,
      eventId,
      playerName,
      myttId,
      contactNumber
    );

    if (duplicate.found) {
      return respondRegistration(submissionId, {
        status: "rejected",
        message: "A registration for this player already exists for this event."
      });
    }

    registrationsSheet.appendRow([
      new Date(),
      event.eventId,
      event.eventName,
      playerName,
      myttId,
      category,
      doublesPartner,
      contactNumber,
      notes,
      "Confirmed",
      submissionId
    ]);

    const updatedEvent = getEventById(eventsSheet, registrationsSheet, eventId);

    return respondRegistration(submissionId, {
      status: "accepted",
      message: "Registration confirmed. Your place has been reserved for this event.",
      eventId: event.eventId,
      eventName: event.eventName,
      spotsFilled: updatedEvent ? updatedEvent.spotsFilled : event.spotsFilled + 1,
      capacity: event.capacity
    });
  } catch (error) {
    console.error(error);
    return respondRegistration(submissionId, {
      status: "error",
      message: error && error.message
        ? error.message
        : "Unexpected event registration error."
    });
  } finally {
    lock.releaseLock();
  }
}


/***********************
 * ORGANIZER QUICK ADD
 ***********************/
function verifyOrganizerAdminKey(adminKey) {
  const configured = cleanEventText(
    PropertiesService.getScriptProperties().getProperty("MYTT_ADMIN_KEY")
  );

  if (!configured) {
    throw new Error("Organizer access has not been configured yet.");
  }

  if (cleanEventText(adminKey) !== configured) {
    throw new Error("Invalid organizer key.");
  }
}

function getOrganizerEvents(adminKey) {
  verifyOrganizerAdminKey(adminKey);
  return getUpcomingEvents();
}

function organizerBulkAdd(adminKey, eventId, category, namesText) {
  verifyOrganizerAdminKey(adminKey);

  const cleanEventId = cleanEventText(eventId);
  const cleanCategory = cleanEventText(category) || "Singles";
  const rawText = String(namesText || "");

  if (!cleanEventId) throw new Error("Please select an event.");
  if (!rawText.trim()) throw new Error("Paste at least one player name.");

  const parsed = [];
  const seenInput = {};

  rawText.split(/\r?\n/).forEach(function(line) {
    let item = cleanEventText(line)
      .replace(/^\s*(?:[-•*]|\d+[.)-])\s*/, "")
      .trim();

    if (!item) return;

    let playerName = item;
    let myttId = "";
    const pipe = item.lastIndexOf("|");

    if (pipe > 0) {
      playerName = cleanEventText(item.slice(0, pipe));
      myttId = cleanEventText(item.slice(pipe + 1));
    }

    if (!playerName) return;

    const key = normalizeEventKey(myttId || playerName);
    if (seenInput[key]) return;
    seenInput[key] = true;

    parsed.push({
      playerName: playerName,
      myttId: myttId
    });
  });

  if (!parsed.length) {
    throw new Error("No valid player names were found.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.openById(EVENTS_SPREADSHEET_ID);
    const eventsSheet = ss.getSheetByName(EVENTS_SHEETS.EVENTS);
    const registrationsSheet = ss.getSheetByName(EVENTS_SHEETS.REGISTRATIONS);

    if (!eventsSheet) throw new Error("Cannot find sheet: Events");
    if (!registrationsSheet) throw new Error("Cannot find sheet: Event Registrations");

    const event = getEventById(eventsSheet, registrationsSheet, cleanEventId);
    if (!event) throw new Error("This MYTT event could not be found.");

    if (event.effectiveStatus === "Closed" || event.effectiveStatus === "Completed") {
      throw new Error("This event is closed.");
    }

    const activeStatuses = {
      confirmed: true,
      approved: true,
      accepted: true,
      pending: true,
      "": true
    };

    const existingNames = {};
    const existingIds = {};
    const lastRow = registrationsSheet.getLastRow();

    if (lastRow >= 2) {
      registrationsSheet
        .getRange(2, 1, lastRow - 1, 11)
        .getValues()
        .forEach(function(row) {
          if (normalizeEventKey(row[1]) !== normalizeEventKey(cleanEventId)) return;

          const status = cleanEventText(row[9]).toLowerCase();
          if (!activeStatuses[status]) return;

          const name = normalizeEventKey(row[3]);
          const id = normalizeEventKey(row[4]);

          if (name) existingNames[name] = true;
          if (id) existingIds[id] = true;
        });
    }

    let available = event.capacity > 0
      ? Math.max(0, Number(event.capacity) - Number(event.spotsFilled || 0))
      : Number.MAX_SAFE_INTEGER;

    const added = [];
    const skipped = [];
    const full = [];

    parsed.forEach(function(player) {
      const nameKey = normalizeEventKey(player.playerName);
      const idKey = normalizeEventKey(player.myttId);

      if (existingNames[nameKey] || (idKey && existingIds[idKey])) {
        skipped.push(player.playerName);
        return;
      }

      if (available <= 0) {
        full.push(player.playerName);
        return;
      }

      registrationsSheet.appendRow([
        new Date(),
        event.eventId,
        event.eventName,
        player.playerName,
        player.myttId,
        cleanCategory,
        "",
        "",
        "Organizer Quick Add",
        "Confirmed",
        "ADMIN-" + Utilities.getUuid()
      ]);

      existingNames[nameKey] = true;
      if (idKey) existingIds[idKey] = true;
      available -= 1;
      added.push(player.playerName);
    });

    const updated = getEventById(eventsSheet, registrationsSheet, cleanEventId);

    return {
      status: "ok",
      eventId: event.eventId,
      eventName: event.eventName,
      added: added,
      skipped: skipped,
      full: full,
      spotsFilled: updated ? updated.spotsFilled : event.spotsFilled + added.length,
      capacity: event.capacity
    };
  } finally {
    lock.releaseLock();
  }
}

function buildOrganizerAdminPage() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MYTT Organizer Quick Add</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#08090b;color:#f5f5f5;font-family:Inter,Arial,sans-serif}.wrap{max-width:680px;margin:0 auto;padding:28px 18px 52px}.brand{font-weight:900;font-size:28px;letter-spacing:-.03em}.sub{color:#9ea3ad;margin:5px 0 28px}.card{background:#121418;border:1px solid #252932;border-radius:20px;padding:18px;box-shadow:0 12px 36px rgba(0,0,0,.28)}label{display:block;margin:14px 0 7px;font-weight:800;font-size:13px;color:#d5d7dc}input,select,textarea,button{width:100%;font:inherit;border-radius:12px}input,select,textarea{background:#0b0d10;color:#fff;border:1px solid #30343d;padding:13px 14px;font-size:16px}textarea{min-height:210px;resize:vertical;line-height:1.5}button{border:0;padding:14px 16px;font-weight:900;cursor:pointer}.primary{background:#e03131;color:#fff;margin-top:14px}.secondary{background:#22262d;color:#fff;margin-top:10px}.muted{font-size:12px;color:#8e949e;line-height:1.5}.status{margin-top:14px;padding:13px;border-radius:12px;background:#0b0d10;display:none;white-space:pre-wrap;line-height:1.45}.status.show{display:block}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.count{font-size:13px;color:#b8bdc6;margin-top:8px}@media(max-width:560px){.grid{grid-template-columns:1fr}.wrap{padding-top:20px}.card{padding:15px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">MYTT Organizer</div>
  <div class="sub">Quick Add players from your group list</div>
  <div class="card">
    <label>Organizer Key</label>
    <input id="key" type="password" autocomplete="current-password" placeholder="Enter organizer key">
    <button class="secondary" id="load">Unlock &amp; Load Events</button>

    <div id="panel" hidden>
      <div class="grid">
        <div>
          <label>Event</label>
          <select id="event"></select>
        </div>
        <div>
          <label>Category</label>
          <select id="category"><option>Singles</option><option>Doubles</option></select>
        </div>
      </div>
      <div class="count" id="count"></div>
      <label>Players</label>
      <textarea id="players" placeholder="1. Yong&#10;2. Shin&#10;3. Joe&#10;&#10;Optional MYTT ID:&#10;Yong | MYTT0001"></textarea>
      <div class="muted">One player per line. Numbered lists are accepted automatically. Optional format: Name | MYTT ID.</div>
      <button class="primary" id="add">Add Players</button>
    </div>

    <div class="status" id="status"></div>
  </div>
</div>
<script>
const $=id=>document.getElementById(id),status=$('status'),panel=$('panel');
let events=[];
function show(msg,bad){status.textContent=msg;status.className='status show';status.style.border='1px solid '+(bad?'#7b2d2d':'#294c38')}
function key(){return $('key').value.trim()}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderEvents(list){events=Array.isArray(list)?list:[];$('event').innerHTML=events.map(e=>'<option value="'+esc(e.eventId)+'">'+esc(e.eventName)+' — '+esc(e.dateDisplay||e.date)+' ('+Number(e.spotsFilled||0)+'/'+Number(e.capacity||0)+')</option>').join('');panel.hidden=false;sessionStorage.setItem('myttOrganizerKey',key());syncCount();show(events.length?'Organizer access unlocked.':'Organizer access unlocked. No upcoming events found.',false)}
function fail(err){show(err&&err.message?err.message:String(err||'Request failed'),true)}
function syncCount(){const e=events.find(x=>x.eventId===$('event').value);$('count').textContent=e?(e.spotsFilled+' / '+e.capacity+' registered'):''}
$('event').addEventListener('change',syncCount);
$('load').onclick=()=>{if(!key())return show('Enter your organizer key first.',true);show('Loading events…',false);google.script.run.withSuccessHandler(renderEvents).withFailureHandler(fail).getOrganizerEvents(key())};
$('add').onclick=()=>{const names=$('players').value;if(!names.trim())return show('Paste at least one player name.',true);$('add').disabled=true;show('Adding players…',false);google.script.run.withSuccessHandler(r=>{const parts=['Added: '+r.added.length];if(r.added.length)parts.push(r.added.join(', '));if(r.skipped.length)parts.push('Already registered: '+r.skipped.join(', '));if(r.full.length)parts.push('Not added — event full: '+r.full.join(', '));parts.push('Now '+r.spotsFilled+' / '+r.capacity+' registered');show(parts.join('\n'),false);$('players').value='';const e=events.find(x=>x.eventId===r.eventId);if(e)e.spotsFilled=r.spotsFilled;const chosen=r.eventId;renderEvents(events);$('event').value=chosen;syncCount();$('add').disabled=false}).withFailureHandler(err=>{$('add').disabled=false;fail(err)}).organizerBulkAdd(key(),$('event').value,$('category').value,names)};
const saved=sessionStorage.getItem('myttOrganizerKey');if(saved)$('key').value=saved;
</script>
</body>
</html>`;

  return HtmlService
    .createHtmlOutput(html)
    .setTitle("MYTT Organizer Quick Add")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}


/***********************
 * PUBLIC REGISTRATION LIST
 ***********************/
function getPublicEventRegistrations(eventId) {
  if (!eventId) {
    return {
      source: "MYTT_EVENTS_WEB_APP",
      status: "error",
      message: "Event ID is required."
    };
  }

  const ss = SpreadsheetApp.openById(EVENTS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EVENTS_SHEETS.REGISTRATIONS);
  if (!sheet) throw new Error("Cannot find sheet: Event Registrations");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      source: "MYTT_EVENTS_WEB_APP",
      status: "ok",
      eventId: eventId,
      registrations: []
    };
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const target = normalizeEventKey(eventId);
  const activeStatuses = {
    confirmed: true,
    approved: true,
    accepted: true
  };
  const registrations = [];

  rows.forEach(function(row) {
    if (normalizeEventKey(row[1]) !== target) return;

    const status = cleanEventText(row[9]).toLowerCase();
    if (!activeStatuses[status]) return;

    registrations.push({
      playerName: cleanEventText(row[3]),
      myttId: cleanEventText(row[4]),
      category: cleanEventText(row[5])
    });
  });

  return {
    source: "MYTT_EVENTS_WEB_APP",
    status: "ok",
    eventId: eventId,
    registrations: registrations
  };
}


/***********************
 * UPCOMING EVENTS DATA
 ***********************/
function getUpcomingEvents() {
  const ss = SpreadsheetApp.openById(EVENTS_SPREADSHEET_ID);
  const eventsSheet = ss.getSheetByName(EVENTS_SHEETS.EVENTS);
  const registrationsSheet = ss.getSheetByName(EVENTS_SHEETS.REGISTRATIONS);

  if (!eventsSheet) throw new Error("Cannot find sheet: Events");
  if (!registrationsSheet) throw new Error("Cannot find sheet: Event Registrations");

  const lastRow = eventsSheet.getLastRow();
  if (lastRow < 2) return [];

  const data = eventsSheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const counts = buildRegistrationCounts(registrationsSheet);
  const timeZone = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  const today = startOfEventDay(new Date());
  const events = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const eventId = cleanEventText(row[0]);
    const eventName = cleanEventText(row[1]);

    if (!eventId || !eventName) continue;

    const eventDate = toEventDate(row[2]);
    const deadline = toEventDate(row[7]);
    const capacity = Math.max(0, Number(row[6]) || 0);
    const manualStatus = normalizeEventStatus(row[8]);
    const spotsFilled = counts[eventId] ? counts[eventId].active : 0;

    const eventObject = buildEventObject({
      eventId: eventId,
      eventName: eventName,
      eventDate: eventDate,
      time: row[3],
      venue: row[4],
      format: row[5],
      capacity: capacity,
      deadline: deadline,
      manualStatus: manualStatus,
      description: row[9],
      spotsFilled: spotsFilled,
      timeZone: timeZone,
      today: today
    });

    if (eventObject.effectiveStatus === "Completed") continue;
    events.push(eventObject);
  }

  events.sort(function(a, b) {
    return (a.sortTimestamp || 0) - (b.sortTimestamp || 0);
  });

  return events.map(function(event) {
    const copy = Object.assign({}, event);
    delete copy.sortTimestamp;
    return copy;
  });
}

function getEventById(eventsSheet, registrationsSheet, requestedEventId) {
  const lastRow = eventsSheet.getLastRow();
  if (lastRow < 2) return null;

  const data = eventsSheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const counts = buildRegistrationCounts(registrationsSheet);
  const ss = eventsSheet.getParent();
  const timeZone = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  const today = startOfEventDay(new Date());
  const target = normalizeEventKey(requestedEventId);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const eventId = cleanEventText(row[0]);

    if (normalizeEventKey(eventId) !== target) continue;

    const capacity = Math.max(0, Number(row[6]) || 0);
    const spotsFilled = counts[eventId] ? counts[eventId].active : 0;

    return buildEventObject({
      eventId: eventId,
      eventName: cleanEventText(row[1]),
      eventDate: toEventDate(row[2]),
      time: row[3],
      venue: row[4],
      format: row[5],
      capacity: capacity,
      deadline: toEventDate(row[7]),
      manualStatus: normalizeEventStatus(row[8]),
      description: row[9],
      spotsFilled: spotsFilled,
      timeZone: timeZone,
      today: today
    });
  }

  return null;
}

function buildEventObject(options) {
  const eventDate = options.eventDate;
  const deadline = options.deadline;
  const capacity = options.capacity;
  const spotsFilled = options.spotsFilled;

  const effectiveStatus = calculateEffectiveStatus(
    options.manualStatus,
    eventDate,
    deadline,
    capacity,
    spotsFilled,
    options.today
  );

  const spotsRemaining = capacity > 0
    ? Math.max(capacity - spotsFilled, 0)
    : null;

  return {
    eventId: options.eventId,
    eventName: options.eventName,
    date: formatEventDate(eventDate, options.timeZone, "yyyy-MM-dd"),
    dateDisplay: formatEventDate(eventDate, options.timeZone, "EEE, d MMM yyyy"),
    time: formatEventTime(options.time, options.timeZone),
    venue: cleanEventText(options.venue),
    format: cleanEventText(options.format),
    capacity: capacity,
    spotsFilled: spotsFilled,
    spotsRemaining: spotsRemaining,
    registrationDeadline: formatEventDate(deadline, options.timeZone, "yyyy-MM-dd"),
    registrationDeadlineDisplay: formatEventDate(deadline, options.timeZone, "d MMM yyyy"),
    manualStatus: options.manualStatus,
    effectiveStatus: effectiveStatus,
    description: cleanEventText(options.description),
    sortTimestamp: eventDate ? eventDate.getTime() : Number.MAX_SAFE_INTEGER
  };
}


/***********************
 * EVENT STATUS
 ***********************/
function calculateEffectiveStatus(
  manualStatus,
  eventDate,
  deadline,
  capacity,
  spotsFilled,
  today
) {
  const status = normalizeEventStatus(manualStatus);

  if (status === "Completed") return "Completed";

  if (eventDate && startOfEventDay(eventDate).getTime() < today.getTime()) {
    return "Completed";
  }

  if (status === "Closed") return "Closed";
  if (status === "Upcoming") return "Upcoming";

  if (deadline && startOfEventDay(deadline).getTime() < today.getTime()) {
    return "Closed";
  }

  if (status === "Full") return "Full";

  if (capacity > 0 && spotsFilled >= capacity) {
    return "Full";
  }

  if (status === "Open") return "Open";
  return "Upcoming";
}

function normalizeEventStatus(value) {
  const text = cleanEventText(value).toLowerCase();

  if (text === "open") return "Open";
  if (text === "full") return "Full";
  if (text === "closed") return "Closed";
  if (text === "completed") return "Completed";
  if (text === "upcoming" || text === "coming soon") return "Upcoming";

  return "";
}


/***********************
 * REGISTRATION COUNTS
 ***********************/
function buildRegistrationCounts(sheet) {
  const counts = {};
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return counts;

  const data = sheet
    .getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 11))
    .getValues();

  for (let i = 0; i < data.length; i++) {
    const eventId = cleanEventText(data[i][1]);
    if (!eventId) continue;

    const status = cleanEventText(data[i][9]).toLowerCase();

    if (!counts[eventId]) {
      counts[eventId] = {
        active: 0,
        approved: 0,
        pending: 0,
        waitlist: 0
      };
    }

    if (status === "approved" || status === "confirmed" || status === "accepted") {
      counts[eventId].approved++;
      counts[eventId].active++;
    } else if (status === "pending" || !status) {
      counts[eventId].pending++;
      counts[eventId].active++;
    } else if (status === "waitlist") {
      counts[eventId].waitlist++;
    }
  }

  return counts;
}


/***********************
 * DUPLICATE CHECK
 ***********************/
function findExistingRegistration(
  sheet,
  eventId,
  playerName,
  myttId,
  contactNumber
) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { found: false };

  const data = sheet
    .getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 11))
    .getValues();

  const eventKey = normalizeEventKey(eventId);
  const idKey = normalizeEventKey(myttId);
  const nameKey = normalizeEventKey(playerName);
  const contactKey = normalizeEventKey(contactNumber);

  for (let i = data.length - 1; i >= 0; i--) {
    const rowEvent = normalizeEventKey(data[i][1]);
    if (rowEvent !== eventKey) continue;

    const status = cleanEventText(data[i][9]).toLowerCase();
    if (status === "rejected" || status === "cancelled") continue;

    const rowMyttId = normalizeEventKey(data[i][4]);
    const rowPlayerName = normalizeEventKey(data[i][3]);
    const rowContact = normalizeEventKey(data[i][7]);

    if (idKey && rowMyttId && idKey === rowMyttId) {
      return { found: true };
    }

    if (
      nameKey &&
      contactKey &&
      nameKey === rowPlayerName &&
      contactKey === rowContact
    ) {
      return { found: true };
    }
  }

  return { found: false };
}


/***********************
 * ONE-TIME LEGACY MIGRATION
 ***********************/
function confirmExistingPendingRegistrations() {
  const ss = SpreadsheetApp.openById(EVENTS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EVENTS_SHEETS.REGISTRATIONS);

  if (!sheet) throw new Error("Cannot find sheet: Event Registrations");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const statusRange = sheet.getRange(2, 10, lastRow - 1, 1);
  const values = statusRange.getValues();
  let changed = 0;

  for (let i = 0; i < values.length; i++) {
    const status = cleanEventText(values[i][0]).toLowerCase();
    if (status === "pending" || !status) {
      values[i][0] = "Confirmed";
      changed++;
    }
  }

  if (changed > 0) statusRange.setValues(values);
  return changed;
}


/***********************
 * STATUS CACHE / RESPONSE
 ***********************/
function respondRegistration(submissionId, result) {
  const payload = Object.assign(
    {
      source: "MYTT_EVENTS_WEB_APP",
      submissionId: submissionId
    },
    result || {}
  );

  try {
    CacheService
      .getScriptCache()
      .put(
        "MYTT_EVENT_SUBMISSION_" + submissionId,
        JSON.stringify(payload),
        EVENT_SUBMISSION_TTL_SECONDS
      );
  } catch (error) {
    console.warn("Could not cache event submission status: " + error.message);
  }

  return createWebsiteResponse(payload);
}

function getCachedRegistrationStatus(submissionId) {
  const id = cleanEventText(submissionId);

  if (!id) {
    return {
      source: "MYTT_EVENTS_WEB_APP",
      submissionId: "",
      status: "pending",
      message: "MYTT is processing this registration."
    };
  }

  try {
    const cached = CacheService
      .getScriptCache()
      .get("MYTT_EVENT_SUBMISSION_" + id);

    if (cached) return JSON.parse(cached);
  } catch (error) {
    return {
      source: "MYTT_EVENTS_WEB_APP",
      submissionId: id,
      status: "error",
      message: "Could not read registration status."
    };
  }

  return {
    source: "MYTT_EVENTS_WEB_APP",
    submissionId: id,
    status: "pending",
    message: "MYTT is processing this registration."
  };
}

function createWebsiteResponse(payload) {
  const safeJson = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  const html =
    "<!doctype html>" +
    "<html><head><meta charset='utf-8'></head><body>" +
    "<script>" +
    "(function(){" +
    "var payload=" + safeJson + ";" +
    "try{window.top.postMessage(payload,'*');}catch(e){}" +
    "try{window.parent.postMessage(payload,'*');}catch(e){}" +
    "})();" +
    "<\\/script>" +
    "</body></html>";

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createJsonpResponse(payload, callback) {
  const safeJson = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + safeJson + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(safeJson)
    .setMimeType(ContentService.MimeType.JSON);
}


/***********************
 * DATE / TEXT HELPERS
 ***********************/
function toEventDate(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const text = cleanEventText(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    try {
      return Utilities.parseDate(
        text,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      );
    } catch (error) {}
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatEventDate(date, timeZone, pattern) {
  if (!date) return "";
  return Utilities.formatDate(date, timeZone, pattern);
}

function formatEventTime(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, "h:mm a");
  }

  return cleanEventText(value);
}

function startOfEventDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function cleanEventText(value) {
  return String(
    value === null || value === undefined
      ? ""
      : value
  )
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEventKey(value) {
  return cleanEventText(value).toLowerCase();
}
