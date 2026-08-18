/*************************************************
 * MYTT EVENTS & REGISTRATION — WEB APP
 *
 * Spreadsheet:
 * 1WFX7yzKVeu4qVx86MFl6LPPo7yf075tHmsZldO9Rpsk
 *
 * Required sheets:
 * 1. Events
 * 2. Event Registrations
 *
 * Events columns:
 * A Event ID
 * B Event Name
 * C Date
 * D Time
 * E Venue
 * F Format
 * G Capacity
 * H Registration Deadline
 * I Status
 * J Description
 *
 * Event Registrations columns:
 * A Timestamp
 * B Event ID
 * C Event Name
 * D Player Name
 * E MYTT ID
 * F Category
 * G Doubles Partner
 * H Contact Number
 * I Notes
 * J Status
 * K Submission ID
 *************************************************/


/***********************
 * SETTINGS
 ***********************/

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

/**
 * Public endpoints:
 *
 * Upcoming events:
 * /exec?action=events&callback=myCallback
 *
 * Submission status:
 * /exec?action=status&id=<submissionId>&callback=myCallback
 */
function doGet(e) {
  const params =
    e && e.parameter
      ? e.parameter
      : {};

  const action =
    cleanEventText(
      params.action
    );

  const callback =
    cleanEventText(
      params.callback
    ).replace(
      /[^A-Za-z0-9_$\.]/g,
      ""
    );

  let payload;

  try {
    if (action === "events") {
      payload = {
        source: "MYTT_EVENTS_WEB_APP",
        status: "ok",
        events: getUpcomingEvents()
      };

    } else if (action === "status") {
      const submissionId =
        cleanEventText(
          params.id
        );

      payload =
        getCachedRegistrationStatus(
          submissionId
        );

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
      message:
        error && error.message
          ? error.message
          : "Unexpected MYTT Events error."
    };
  }

  return createJsonpResponse(
    payload,
    callback
  );
}


/***********************
 * WEB APP — POST
 ***********************/

/**
 * Website POST fields:
 *
 * submissionId
 * eventId
 * playerName
 * myttId
 * category
 * doublesPartner
 * contactNumber
 * notes
 */
function doPost(e) {
  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  let submissionId = "";

  try {
    if (!e || !e.parameter) {
      submissionId =
        Utilities.getUuid();

      return respondRegistration(
        submissionId,
        {
          status: "error",
          message:
            "Missing registration data."
        }
      );
    }

    submissionId =
      cleanEventText(
        e.parameter.submissionId
      ) ||
      Utilities.getUuid();

    /*
     * Idempotency protection:
     * browser/network retry with same submission ID
     * will not create a second registration.
     */
    const cached =
      getCachedRegistrationStatus(
        submissionId
      );

    if (
      cached &&
      cached.status !== "pending"
    ) {
      return createWebsiteResponse(
        cached
      );
    }

    const eventId =
      cleanEventText(
        e.parameter.eventId
      );

    const playerName =
      cleanEventText(
        e.parameter.playerName
      );

    const myttId =
      cleanEventText(
        e.parameter.myttId
      );

    const category =
      cleanEventText(
        e.parameter.category
      );

    const doublesPartner =
      cleanEventText(
        e.parameter.doublesPartner
      );

    const contactNumber =
      cleanEventText(
        e.parameter.contactNumber
      );

    const notes =
      cleanEventText(
        e.parameter.notes
      );

    if (!eventId) {
      return respondRegistration(
        submissionId,
        {
          status: "error",
          message:
            "Please select an event."
        }
      );
    }

    if (!playerName) {
      return respondRegistration(
        submissionId,
        {
          status: "error",
          message:
            "Player Name is required."
        }
      );
    }

    if (!category) {
      return respondRegistration(
        submissionId,
        {
          status: "error",
          message:
            "Please select a registration category."
        }
      );
    }

    if (!contactNumber) {
      return respondRegistration(
        submissionId,
        {
          status: "error",
          message:
            "Contact Number is required."
        }
      );
    }

    if (
      category
        .toLowerCase()
        .includes("double") &&
      !doublesPartner
    ) {
      return respondRegistration(
        submissionId,
        {
          status: "error",
          message:
            "Please enter your Doubles Partner."
        }
      );
    }

    const ss =
      SpreadsheetApp.openById(
        EVENTS_SPREADSHEET_ID
      );

    const eventsSheet =
      ss.getSheetByName(
        EVENTS_SHEETS.EVENTS
      );

    const registrationsSheet =
      ss.getSheetByName(
        EVENTS_SHEETS.REGISTRATIONS
      );

    if (!eventsSheet) {
      throw new Error(
        "Cannot find sheet: Events"
      );
    }

    if (!registrationsSheet) {
      throw new Error(
        "Cannot find sheet: Event Registrations"
      );
    }

    const event =
      getEventById(
        eventsSheet,
        registrationsSheet,
        eventId
      );

    if (!event) {
      return respondRegistration(
        submissionId,
        {
          status: "error",
          message:
            "This MYTT event could not be found."
        }
      );
    }

    if (event.effectiveStatus === "Full") {
      return respondRegistration(
        submissionId,
        {
          status: "full",
          message:
            "This event is currently full."
        }
      );
    }

    if (
      event.effectiveStatus === "Closed" ||
      event.effectiveStatus === "Completed"
    ) {
      return respondRegistration(
        submissionId,
        {
          status: "closed",
          message:
            "Registration for this event is closed."
        }
      );
    }

    if (
      event.effectiveStatus === "Upcoming"
    ) {
      return respondRegistration(
        submissionId,
        {
          status: "closed",
          message:
            "Registration for this event has not opened yet."
        }
      );
    }

    /*
     * Prevent the same player from registering twice
     * for the same event.
     */
    const duplicate =
      findExistingRegistration(
        registrationsSheet,
        eventId,
        playerName,
        myttId,
        contactNumber
      );

    if (duplicate.found) {
      return respondRegistration(
        submissionId,
        {
          status: "rejected",
          message:
            "A registration for this player already exists for this event."
        }
      );
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

    /*
     * Re-read counts after registration so the response
     * contains the latest capacity information.
     */
    const updatedEvent =
      getEventById(
        eventsSheet,
        registrationsSheet,
        eventId
      );

    return respondRegistration(
      submissionId,
      {
        status: "accepted",
        message:
          "Registration confirmed. Your place has been reserved for this event.",
        eventId:
          event.eventId,
        eventName:
          event.eventName,
        spotsFilled:
          updatedEvent
            ? updatedEvent.spotsFilled
            : event.spotsFilled + 1,
        capacity:
          event.capacity
      }
    );

  } catch (error) {
    console.error(error);

    return respondRegistration(
      submissionId,
      {
        status: "error",
        message:
          error && error.message
            ? error.message
            : "Unexpected event registration error."
      }
    );

  } finally {
    lock.releaseLock();
  }
}


/***********************
 * UPCOMING EVENTS DATA
 ***********************/

function getUpcomingEvents() {
  const ss =
    SpreadsheetApp.openById(
      EVENTS_SPREADSHEET_ID
    );

  const eventsSheet =
    ss.getSheetByName(
      EVENTS_SHEETS.EVENTS
    );

  const registrationsSheet =
    ss.getSheetByName(
      EVENTS_SHEETS.REGISTRATIONS
    );

  if (!eventsSheet) {
    throw new Error(
      "Cannot find sheet: Events"
    );
  }

  if (!registrationsSheet) {
    throw new Error(
      "Cannot find sheet: Event Registrations"
    );
  }

  const lastRow =
    eventsSheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const data =
    eventsSheet
      .getRange(
        2,
        1,
        lastRow - 1,
        10
      )
      .getValues();

  const counts =
    buildRegistrationCounts(
      registrationsSheet
    );

  const timeZone =
    ss.getSpreadsheetTimeZone() ||
    Session.getScriptTimeZone();

  const today =
    startOfEventDay(
      new Date()
    );

  const events = [];

  for (
    let i = 0;
    i < data.length;
    i++
  ) {
    const row =
      data[i];

    const eventId =
      cleanEventText(
        row[0]
      );

    const eventName =
      cleanEventText(
        row[1]
      );

    if (
      !eventId ||
      !eventName
    ) {
      continue;
    }

    const eventDate =
      toEventDate(
        row[2]
      );

    const deadline =
      toEventDate(
        row[7]
      );

    const capacity =
      Math.max(
        0,
        Number(row[6]) || 0
      );

    const manualStatus =
      normalizeEventStatus(
        row[8]
      );

    const spotsFilled =
      counts[eventId]
        ? counts[eventId].active
        : 0;

    const eventObject =
      buildEventObject({
        eventId:
          eventId,
        eventName:
          eventName,
        eventDate:
          eventDate,
        time:
          row[3],
        venue:
          row[4],
        format:
          row[5],
        capacity:
          capacity,
        deadline:
          deadline,
        manualStatus:
          manualStatus,
        description:
          row[9],
        spotsFilled:
          spotsFilled,
        timeZone:
          timeZone,
        today:
          today
      });

    /*
     * Upcoming events section should not show completed events.
     */
    if (
      eventObject.effectiveStatus ===
      "Completed"
    ) {
      continue;
    }

    events.push(
      eventObject
    );
  }

  events.sort(
    function(a, b) {
      const aTime =
        a.sortTimestamp || 0;

      const bTime =
        b.sortTimestamp || 0;

      return aTime - bTime;
    }
  );

  /*
   * Internal helper only; no need to expose it to browser.
   */
  return events.map(
    function(event) {
      const copy =
        Object.assign(
          {},
          event
        );

      delete copy.sortTimestamp;

      return copy;
    }
  );
}


function getEventById(
  eventsSheet,
  registrationsSheet,
  requestedEventId
) {
  const lastRow =
    eventsSheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const data =
    eventsSheet
      .getRange(
        2,
        1,
        lastRow - 1,
        10
      )
      .getValues();

  const counts =
    buildRegistrationCounts(
      registrationsSheet
    );

  const ss =
    eventsSheet
      .getParent();

  const timeZone =
    ss.getSpreadsheetTimeZone() ||
    Session.getScriptTimeZone();

  const today =
    startOfEventDay(
      new Date()
    );

  const target =
    normalizeEventKey(
      requestedEventId
    );

  for (
    let i = 0;
    i < data.length;
    i++
  ) {
    const row =
      data[i];

    const eventId =
      cleanEventText(
        row[0]
      );

    if (
      normalizeEventKey(
        eventId
      ) !== target
    ) {
      continue;
    }

    const capacity =
      Math.max(
        0,
        Number(row[6]) || 0
      );

    const spotsFilled =
      counts[eventId]
        ? counts[eventId].active
        : 0;

    return buildEventObject({
      eventId:
        eventId,
      eventName:
        cleanEventText(
          row[1]
        ),
      eventDate:
        toEventDate(
          row[2]
        ),
      time:
        row[3],
      venue:
        row[4],
      format:
        row[5],
      capacity:
        capacity,
      deadline:
        toEventDate(
          row[7]
        ),
      manualStatus:
        normalizeEventStatus(
          row[8]
        ),
      description:
        row[9],
      spotsFilled:
        spotsFilled,
      timeZone:
        timeZone,
      today:
        today
    });
  }

  return null;
}


function buildEventObject(options) {
  const eventDate =
    options.eventDate;

  const deadline =
    options.deadline;

  const capacity =
    options.capacity;

  const spotsFilled =
    options.spotsFilled;

  const effectiveStatus =
    calculateEffectiveStatus(
      options.manualStatus,
      eventDate,
      deadline,
      capacity,
      spotsFilled,
      options.today
    );

  const spotsRemaining =
    capacity > 0
      ? Math.max(
          capacity - spotsFilled,
          0
        )
      : null;

  return {
    eventId:
      options.eventId,

    eventName:
      options.eventName,

    date:
      formatEventDate(
        eventDate,
        options.timeZone,
        "yyyy-MM-dd"
      ),

    dateDisplay:
      formatEventDate(
        eventDate,
        options.timeZone,
        "EEE, d MMM yyyy"
      ),

    time:
      formatEventTime(
        options.time,
        options.timeZone
      ),

    venue:
      cleanEventText(
        options.venue
      ),

    format:
      cleanEventText(
        options.format
      ),

    capacity:
      capacity,

    spotsFilled:
      spotsFilled,

    spotsRemaining:
      spotsRemaining,

    registrationDeadline:
      formatEventDate(
        deadline,
        options.timeZone,
        "yyyy-MM-dd"
      ),

    registrationDeadlineDisplay:
      formatEventDate(
        deadline,
        options.timeZone,
        "d MMM yyyy"
      ),

    manualStatus:
      options.manualStatus,

    effectiveStatus:
      effectiveStatus,

    description:
      cleanEventText(
        options.description
      ),

    sortTimestamp:
      eventDate
        ? eventDate.getTime()
        : Number.MAX_SAFE_INTEGER
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
  const status =
    normalizeEventStatus(
      manualStatus
    );

  if (
    status === "Completed"
  ) {
    return "Completed";
  }

  if (
    eventDate &&
    startOfEventDay(
      eventDate
    ).getTime() <
      today.getTime()
  ) {
    return "Completed";
  }

  if (
    status === "Closed"
  ) {
    return "Closed";
  }

  if (
    status === "Upcoming"
  ) {
    return "Upcoming";
  }

  if (
    deadline &&
    startOfEventDay(
      deadline
    ).getTime() <
      today.getTime()
  ) {
    return "Closed";
  }

  if (
    status === "Full"
  ) {
    return "Full";
  }

  if (
    capacity > 0 &&
    spotsFilled >= capacity
  ) {
    return "Full";
  }

  /*
   * Blank status defaults to Upcoming for safety.
   * Explicit "Open" is required to accept registration.
   */
  if (
    status === "Open"
  ) {
    return "Open";
  }

  return "Upcoming";
}


function normalizeEventStatus(
  value
) {
  const text =
    cleanEventText(
      value
    ).toLowerCase();

  if (text === "open") {
    return "Open";
  }

  if (text === "full") {
    return "Full";
  }

  if (text === "closed") {
    return "Closed";
  }

  if (text === "completed") {
    return "Completed";
  }

  if (
    text === "upcoming" ||
    text === "coming soon"
  ) {
    return "Upcoming";
  }

  return "";
}


/***********************
 * REGISTRATION COUNTS
 ***********************/

/**
 * Active registration statuses that occupy a spot:
 * Confirmed / Approved
 * Pending (legacy registrations created before auto-confirm)
 *
 * Rejected / Cancelled / Waitlist do not occupy capacity.
 */
function buildRegistrationCounts(
  sheet
) {
  const counts = {};

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return counts;
  }

  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        Math.max(
          sheet.getLastColumn(),
          11
        )
      )
      .getValues();

  for (
    let i = 0;
    i < data.length;
    i++
  ) {
    const eventId =
      cleanEventText(
        data[i][1]
      );

    if (!eventId) {
      continue;
    }

    const status =
      cleanEventText(
        data[i][9]
      ).toLowerCase();

    if (!counts[eventId]) {
      counts[eventId] = {
        active: 0,
        approved: 0,
        pending: 0,
        waitlist: 0
      };
    }

    if (
      status === "approved" ||
      status === "confirmed"
    ) {
      counts[eventId].approved++;
      counts[eventId].active++;

    } else if (
      status === "pending" ||
      !status
    ) {
      counts[eventId].pending++;
      counts[eventId].active++;

    } else if (
      status === "waitlist"
    ) {
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
  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return {
      found: false
    };
  }

  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        Math.max(
          sheet.getLastColumn(),
          11
        )
      )
      .getValues();

  const eventKey =
    normalizeEventKey(
      eventId
    );

  const idKey =
    normalizeEventKey(
      myttId
    );

  const nameKey =
    normalizeEventKey(
      playerName
    );

  const contactKey =
    normalizeEventKey(
      contactNumber
    );

  for (
    let i = data.length - 1;
    i >= 0;
    i--
  ) {
    const rowEvent =
      normalizeEventKey(
        data[i][1]
      );

    if (
      rowEvent !== eventKey
    ) {
      continue;
    }

    const status =
      cleanEventText(
        data[i][9]
      ).toLowerCase();

    if (
      status === "rejected" ||
      status === "cancelled"
    ) {
      continue;
    }

    const rowMyttId =
      normalizeEventKey(
        data[i][4]
      );

    const rowPlayerName =
      normalizeEventKey(
        data[i][3]
      );

    const rowContact =
      normalizeEventKey(
        data[i][7]
      );

    /*
     * MYTT ID is the strongest duplicate key.
     * If no MYTT ID is supplied, use player name + contact.
     */
    if (
      idKey &&
      rowMyttId &&
      idKey === rowMyttId
    ) {
      return {
        found: true
      };
    }

    if (
      nameKey &&
      contactKey &&
      nameKey === rowPlayerName &&
      contactKey === rowContact
    ) {
      return {
        found: true
      };
    }
  }

  return {
    found: false
  };
}


/***********************
 * ONE-TIME LEGACY MIGRATION
 ***********************/

/**
 * Optional one-time helper after deploying V19.
 * Converts old Pending registrations into Confirmed so the sheet matches
 * the new no-admin-approval registration policy. Pending rows already occupy
 * event capacity, so this changes status wording only and does not alter spots.
 */
function confirmExistingPendingRegistrations() {
  const ss = SpreadsheetApp.openById(EVENTS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EVENTS_SHEETS.REGISTRATIONS);

  if (!sheet) {
    throw new Error("Cannot find sheet: Event Registrations");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 0;
  }

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

  if (changed > 0) {
    statusRange.setValues(values);
  }

  return changed;
}


/***********************
 * STATUS CACHE / RESPONSE
 ***********************/

function respondRegistration(
  submissionId,
  result
) {
  const payload =
    Object.assign(
      {
        source:
          "MYTT_EVENTS_WEB_APP",
        submissionId:
          submissionId
      },
      result || {}
    );

  try {
    CacheService
      .getScriptCache()
      .put(
        "MYTT_EVENT_SUBMISSION_" +
        submissionId,
        JSON.stringify(
          payload
        ),
        EVENT_SUBMISSION_TTL_SECONDS
      );

  } catch (error) {
    console.warn(
      "Could not cache event submission status: " +
      error.message
    );
  }

  return createWebsiteResponse(
    payload
  );
}


function getCachedRegistrationStatus(
  submissionId
) {
  const id =
    cleanEventText(
      submissionId
    );

  if (!id) {
    return {
      source:
        "MYTT_EVENTS_WEB_APP",
      submissionId:
        "",
      status:
        "pending",
      message:
        "MYTT is processing this registration."
    };
  }

  try {
    const cached =
      CacheService
        .getScriptCache()
        .get(
          "MYTT_EVENT_SUBMISSION_" +
          id
        );

    if (cached) {
      return JSON.parse(
        cached
      );
    }

  } catch (error) {
    return {
      source:
        "MYTT_EVENTS_WEB_APP",
      submissionId:
        id,
      status:
        "error",
      message:
        "Could not read registration status."
    };
  }

  return {
    source:
      "MYTT_EVENTS_WEB_APP",
    submissionId:
      id,
    status:
      "pending",
    message:
      "MYTT is processing this registration."
  };
}


function createWebsiteResponse(
  payload
) {
  const safeJson =
    JSON.stringify(
      payload
    )
      .replace(
        /</g,
        "\\u003c"
      )
      .replace(
        />/g,
        "\\u003e"
      )
      .replace(
        /&/g,
        "\\u0026"
      );

  const html =
    "<!doctype html>" +
    "<html><head>" +
    "<meta charset='utf-8'>" +
    "</head><body>" +
    "<script>" +
    "(function(){" +
    "var payload=" +
    safeJson +
    ";" +
    "try{" +
    "window.top.postMessage(payload,'*');" +
    "}catch(e){}" +
    "try{" +
    "window.parent.postMessage(payload,'*');" +
    "}catch(e){}" +
    "})();" +
    "<\\/script>" +
    "</body></html>";

  return HtmlService
    .createHtmlOutput(
      html
    )
    .setXFrameOptionsMode(
      HtmlService
        .XFrameOptionsMode
        .ALLOWALL
    );
}


function createJsonpResponse(
  payload,
  callback
) {
  const safeJson =
    JSON.stringify(
      payload
    )
      .replace(
        /</g,
        "\\u003c"
      )
      .replace(
        />/g,
        "\\u003e"
      )
      .replace(
        /&/g,
        "\\u0026"
      );

  if (callback) {
    return ContentService
      .createTextOutput(
        callback +
        "(" +
        safeJson +
        ");"
      )
      .setMimeType(
        ContentService
          .MimeType
          .JAVASCRIPT
      );
  }

  return ContentService
    .createTextOutput(
      safeJson
    )
    .setMimeType(
      ContentService
        .MimeType
        .JSON
    );
}


/***********************
 * DATE / TEXT HELPERS
 ***********************/

function toEventDate(
  value
) {
  if (
    value instanceof Date
  ) {
    return isNaN(
      value.getTime()
    )
      ? null
      : value;
  }

  const text =
    cleanEventText(
      value
    );

  if (!text) {
    return null;
  }

  /*
   * Prefer yyyy-MM-dd parsing to avoid locale ambiguity.
   */
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    try {
      return Utilities.parseDate(
        text,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      );
    } catch (error) {}
  }

  const parsed =
    new Date(
      text
    );

  return isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}


function formatEventDate(
  date,
  timeZone,
  pattern
) {
  if (!date) {
    return "";
  }

  return Utilities.formatDate(
    date,
    timeZone,
    pattern
  );
}


function formatEventTime(
  value,
  timeZone
) {
  if (
    value instanceof Date &&
    !isNaN(
      value.getTime()
    )
  ) {
    return Utilities.formatDate(
      value,
      timeZone,
      "h:mm a"
    );
  }

  return cleanEventText(
    value
  );
}


function startOfEventDay(
  date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}


function cleanEventText(
  value
) {
  return String(
    value === null ||
    value === undefined
      ? ""
      : value
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function normalizeEventKey(
  value
) {
  return cleanEventText(
    value
  ).toLowerCase();
}
