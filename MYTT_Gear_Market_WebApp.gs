/*************************************************
 * MYTT GEAR MARKET — PHASE 1 WEB APP
 *
 * Recommended setup:
 * 1. Create a NEW Google Sheet for the marketplace.
 * 2. Extensions -> Apps Script.
 * 3. Paste this entire file.
 * 4. Run setupMYTTGearMarket() once.
 * 5. Deploy as Web App:
 *      Execute as: Me
 *      Who has access: Anyone
 * 6. Put the /exec URL into window.MYTT.marketplaceWebAppUrl
 *    in the website index.html.
 *
 * Marketplace model:
 * Seller submits -> Status Pending -> MYTT admin reviews
 * -> change Status to Approved -> listing appears publicly.
 *
 * To remove a listing, change Status to Sold or Rejected.
 *************************************************/

const MYTT_MARKET = Object.freeze({
  SHEET_NAME: "Marketplace Listings",
  FOLDER_NAME: "MYTT Gear Market Photos",
  PROPERTY_SPREADSHEET_ID: "MYTT_MARKET_SPREADSHEET_ID",
  PROPERTY_FOLDER_ID: "MYTT_MARKET_PHOTO_FOLDER_ID",
  HEADERS: [
    "Timestamp",
    "Listing ID",
    "Status",
    "MYTT ID",
    "Seller Name",
    "Category",
    "Condition",
    "Brand",
    "Model / Item Name",
    "Price (RM)",
    "Location",
    "Description",
    "Contact",
    "Photo URL",
    "Photo File ID",
    "Admin Notes",
    "Approved At",
    "Sold At"
  ],
  ALLOWED_CATEGORIES: [
    "Complete Racket",
    "Blade",
    "Rubber",
    "Shoes",
    "Apparel",
    "Bag",
    "Accessories",
    "Other"
  ],
  ALLOWED_CONDITIONS: [
    "New",
    "Like New",
    "Good",
    "Fair"
  ]
});

function setupMYTTGearMarket() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Open this Apps Script from the marketplace Google Sheet, then run setup again.");

  const props = PropertiesService.getScriptProperties();
  props.setProperty(MYTT_MARKET.PROPERTY_SPREADSHEET_ID, ss.getId());

  let sheet = ss.getSheetByName(MYTT_MARKET.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(MYTT_MARKET.SHEET_NAME);

  const headerRange = sheet.getRange(1, 1, 1, MYTT_MARKET.HEADERS.length);
  headerRange.setValues([MYTT_MARKET.HEADERS]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#111111");
  headerRange.setFontColor("#ffffff");
  sheet.setFrozenRows(1);

  const widths = [150,145,100,110,150,130,110,120,190,100,130,320,150,300,160,220,150,150];
  widths.forEach(function(width, i) {
    sheet.setColumnWidth(i + 1, width);
  });

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pending", "Approved", "Rejected", "Sold"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("C2:C").setDataValidation(statusRule);

  let folderId = props.getProperty(MYTT_MARKET.PROPERTY_FOLDER_ID);
  if (!folderId) {
    const folders = DriveApp.getFoldersByName(MYTT_MARKET.FOLDER_NAME);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(MYTT_MARKET.FOLDER_NAME);
    folderId = folder.getId();
    props.setProperty(MYTT_MARKET.PROPERTY_FOLDER_ID, folderId);
  }

  SpreadsheetApp.flush();
  console.log("MYTT Gear Market setup complete.");
  console.log("Spreadsheet ID: " + ss.getId());
  console.log("Photo Folder ID: " + folderId);
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || "list").toLowerCase();
  let payload;

  try {
    if (action === "status") {
      payload = getMarketplaceSubmissionStatus_(params.submissionId);
    } else {
      payload = getApprovedMarketplaceListings_();
    }
  } catch (err) {
    payload = {
      status: "error",
      message: err && err.message ? err.message : String(err)
    };
  }

  return marketplaceJsonp_(payload, params.callback);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const p = (e && e.parameter) || {};
    const submissionId = cleanText_(p.submissionId, 80);
    if (!submissionId) throw new Error("Missing submission ID.");

    const sheet = getMarketplaceSheet_();
    const existing = findMarketplaceRow_(sheet, submissionId);
    if (existing) {
      return marketplaceText_({ status: "success", submissionId: submissionId, duplicate: true });
    }

    const myttId = cleanText_(p.myttId, 20).toUpperCase();
    const sellerName = cleanText_(p.sellerName, 80);
    const category = cleanText_(p.category, 40);
    const condition = cleanText_(p.condition, 30);
    const brand = cleanText_(p.brand, 60);
    const model = cleanText_(p.model, 100);
    const price = Number(p.price);
    const location = cleanText_(p.location, 80);
    const description = cleanText_(p.description, 800);
    const contact = cleanText_(p.contact, 30);
    const consent = cleanText_(p.consent, 10);
    const photoCount = Math.max(1, Math.min(5, Number(p.photoCount) || 1));
    const submittedPhotos = [];
    for (let i = 1; i <= photoCount; i++) {
      const suffix = i === 1 ? "" : String(i);
      const data = String(p["photoData" + suffix] || "").trim();
      const type = cleanText_(p["photoType" + suffix], 50) || "image/jpeg";
      if (data) submittedPhotos.push({ data: data, type: type });
    }

    if (!/^MYTT\d{4,}$/i.test(myttId)) throw new Error("Please enter a valid MYTT ID.");
    if (!sellerName) throw new Error("Seller name is required.");
    if (MYTT_MARKET.ALLOWED_CATEGORIES.indexOf(category) === -1) throw new Error("Invalid equipment category.");
    if (MYTT_MARKET.ALLOWED_CONDITIONS.indexOf(condition) === -1) throw new Error("Invalid item condition.");
    if (!brand || !model) throw new Error("Brand and model are required.");
    if (!Number.isFinite(price) || price < 1 || price > 99999) throw new Error("Please enter a valid price.");
    if (!location || !description || !contact) throw new Error("Location, description and contact are required.");
    if (consent !== "yes") throw new Error("Seller consent is required.");
    if (!submittedPhotos.length) throw new Error("At least one item photo is required.");
    if (submittedPhotos.length > 5) throw new Error("A maximum of 5 photos is allowed.");

    const photos = saveMarketplacePhotos_(submissionId, submittedPhotos);
    const now = new Date();

    sheet.appendRow([
      now,
      submissionId,
      "Pending",
      myttId,
      sellerName,
      category,
      condition,
      brand,
      model,
      Math.round(price),
      location,
      description,
      contact,
      JSON.stringify(photos.urls),
      JSON.stringify(photos.fileIds),
      "",
      "",
      ""
    ]);

    SpreadsheetApp.flush();

    return marketplaceText_({
      status: "success",
      submissionId: submissionId,
      listingStatus: "Pending"
    });

  } catch (err) {
    return marketplaceText_({
      status: "error",
      message: err && err.message ? err.message : String(err)
    });
  } finally {
    lock.releaseLock();
  }
}

function getApprovedMarketplaceListings_() {
  const sheet = getMarketplaceSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { status: "success", listings: [] };

  const values = sheet.getRange(2, 1, lastRow - 1, MYTT_MARKET.HEADERS.length).getValues();
  const listings = [];

  values.forEach(function(row) {
    const status = String(row[2] || "").trim();
    if (status !== "Approved") return;

    listings.push({
      timestamp: dateToIso_(row[0]),
      listingId: String(row[1] || ""),
      status: status,
      myttId: String(row[3] || ""),
      sellerName: String(row[4] || ""),
      category: String(row[5] || ""),
      condition: String(row[6] || ""),
      brand: String(row[7] || ""),
      model: String(row[8] || ""),
      price: Number(row[9]) || 0,
      location: String(row[10] || ""),
      description: String(row[11] || ""),
      contact: String(row[12] || ""),
      photoUrls: parseMarketplacePhotos_(row[13]),
      photoUrl: parseMarketplacePhotos_(row[13])[0] || ""
    });
  });

  listings.sort(function(a, b) {
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });

  return { status: "success", listings: listings };
}

function getMarketplaceSubmissionStatus_(submissionId) {
  const id = cleanText_(submissionId, 80);
  if (!id) return { status: "success", found: false };

  const sheet = getMarketplaceSheet_();
  const rowNumber = findMarketplaceRow_(sheet, id);
  if (!rowNumber) return { status: "success", found: false };

  const row = sheet.getRange(rowNumber, 1, 1, MYTT_MARKET.HEADERS.length).getValues()[0];
  return {
    status: "success",
    found: true,
    submissionId: id,
    listingStatus: String(row[2] || "Pending"),
    message: String(row[15] || "")
  };
}

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== MYTT_MARKET.SHEET_NAME) return;
    if (e.range.getColumn() !== 3 || e.range.getRow() < 2) return;

    const status = String(e.value || "").trim();
    const row = e.range.getRow();
    const now = new Date();

    if (status === "Approved") {
      sheet.getRange(row, 17).setValue(now);
      sheet.getRange(row, 18).clearContent();
    } else if (status === "Sold") {
      sheet.getRange(row, 18).setValue(now);
    }
  } catch (err) {
    console.log("Marketplace onEdit warning: " + err.message);
  }
}

function saveMarketplacePhotos_(submissionId, submittedPhotos) {
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty(MYTT_MARKET.PROPERTY_FOLDER_ID);
  if (!folderId) throw new Error("Marketplace photo folder is not configured. Run setupMYTTGearMarket() first.");

  const folder = DriveApp.getFolderById(folderId);
  const urls = [];
  const fileIds = [];

  submittedPhotos.slice(0, 5).forEach(function(photo, index) {
    const bytes = Utilities.base64Decode(photo.data);
    if (bytes.length > 6 * 1024 * 1024) throw new Error("Photo " + (index + 1) + " is too large after processing.");

    const mimeType = /^image\//i.test(photo.type) ? photo.type : "image/jpeg";
    const blob = Utilities.newBlob(bytes, mimeType, submissionId + "-" + (index + 1) + ".jpg");
    const file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (err) {
      throw new Error("Photos were uploaded, but public image access could not be enabled. Check your Google Workspace sharing policy.");
    }

    const fileId = file.getId();
    fileIds.push(fileId);
    urls.push("https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1600");
  });

  return { urls: urls, fileIds: fileIds };
}

function parseMarketplacePhotos_(value) {
  const text = String(value || "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (_) {}

  // Backward compatibility with old single-photo rows.
  return [text];
}

function getMarketplaceSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(MYTT_MARKET.PROPERTY_SPREADSHEET_ID);
  if (!id) throw new Error("Marketplace spreadsheet is not configured. Run setupMYTTGearMarket() first.");

  const ss = SpreadsheetApp.openById(id);
  const sheet = ss.getSheetByName(MYTT_MARKET.SHEET_NAME);
  if (!sheet) throw new Error("Cannot find sheet: " + MYTT_MARKET.SHEET_NAME);
  return sheet;
}

function findMarketplaceRow_(sheet, listingId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const finder = sheet.getRange(2, 2, lastRow - 1, 1).createTextFinder(String(listingId)).matchEntireCell(true).findNext();
  return finder ? finder.getRow() : 0;
}

function cleanText_(value, maxLength) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength || 5000);
}

function dateToIso_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function marketplaceJsonp_(payload, callbackName) {
  const safeCallback = /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(String(callbackName || ""))
    ? String(callbackName)
    : "callback";
  return ContentService
    .createTextOutput(safeCallback + "(" + JSON.stringify(payload) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function marketplaceText_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
