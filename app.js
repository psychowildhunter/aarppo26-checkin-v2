// ======================================================
// AARPPO '26 Check-In App
// Yuvakairali | Version 4.1 (Production)
// QR Scanner + Manual Search + Live Dashboard
// ======================================================

// 🔴 Replace with your Google Apps Script /exec URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbygGlNA9lkv7eL56oAG_yOldH1LnG7SgcqUp0qIc3oMEBmT1oORnwV6AkdlSAYbVura/exec";

// ======================================================
// DOM ELEMENTS
// ======================================================

const checkedCount = document.getElementById("checkedCount");
const remainingCount = document.getElementById("remainingCount");
const recentList = document.getElementById("recentList");
const startBtn = document.getElementById("startScanner");

const searchInput = document.getElementById("searchInput");
const searchResult = document.getElementById("searchResult");

// Overlay
const overlay = document.getElementById("resultOverlay");
const overlayCard = document.getElementById("overlayCard");
const overlayIcon = document.getElementById("overlayIcon");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySubtitle = document.getElementById("overlaySubtitle");
const overlayName = document.getElementById("overlayName");
const overlayId = document.getElementById("overlayId");
const overlayTime = document.getElementById("overlayTime");

// Hide overlay on page load
overlay.style.display = "none";

// ======================================================
// LIVE DASHBOARD
// ======================================================

loadStats();
setInterval(loadStats, 10000);

async function loadStats() {
  try {
    const response = await fetch(`${WEB_APP_URL}?stats=1`);
    const stats = await response.json();

    if (stats.status === "stats") {
      checkedCount.textContent = stats.checkedIn;
      remainingCount.textContent = stats.remaining;
    }
  } catch (err) {
    console.log("Dashboard unavailable.");
  }
}

// ======================================================
// RECENT CHECK-INS
// ======================================================

const sampleCheckins = [
  { name: "Aiswarya S", id: "ARP26-0412", time: "10:21 AM" },
  { name: "Akshay Raj", id: "ARP26-0413", time: "10:22 AM" },
  { name: "Anjali Krishna", id: "ARP26-0414", time: "10:23 AM" }
];

sampleCheckins.forEach(addRecent);

function addRecent(person) {
  const item = document.createElement("div");
  item.className = "feed-item";

  item.innerHTML = `
    <div>
      <div class="feed-name">${person.name}</div>
      <div class="feed-id">${person.id}</div>
    </div>

    <div class="feed-time">${person.time}</div>
  `;

  recentList.prepend(item);

  while (recentList.children.length > 5) {
    recentList.removeChild(recentList.lastChild);
  }
}

// ======================================================
// QR SCANNER
// ======================================================

let htmlScanner = null;
let scannerStarted = false;

startBtn.addEventListener("click", startScanner);

async function startScanner() {
  if (scannerStarted) return;

  scannerStarted = true;

  startBtn.disabled = true;
  startBtn.textContent = "Starting Camera...";

  document.getElementById("reader").innerHTML = "";

  htmlScanner = new Html5Qrcode("reader");

  try {
    await htmlScanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      onScanSuccess,
      () => {}
    );

    startBtn.textContent = "Scanner Active";
  } catch (err) {
    alert("Unable to access camera.\n\n" + err);

    scannerStarted = false;
    startBtn.disabled = false;
    startBtn.textContent = "Start Scanner";
  }
}

// ======================================================
// QR CHECK-IN
// ======================================================

async function onScanSuccess(decodedText) {

  if (!htmlScanner) return;

  htmlScanner.pause(true);

  const participantId = decodedText.trim();

  try {

    const response = await fetch(
      `${WEB_APP_URL}?id=${encodeURIComponent(participantId)}`
    );

    const result = await response.json();

    handleResult(result);

  } catch (err) {

    showNetworkError();

  }

  // Hide overlay and resume scanner after 2 seconds
  setTimeout(() => {
    resetScanner();
  }, 2000);
}

// ======================================================
// SEARCH PARTICIPANT
// ======================================================

const searchButton = document.querySelector(".search-box button");

if (searchButton) {
  searchButton.addEventListener("click", searchParticipant);
}

if (searchInput) {
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchParticipant();
  });
}

async function searchParticipant() {

  const query = searchInput.value.trim();

  if (!query) return;

  searchResult.innerHTML = "Searching...";

  try {

    const response = await fetch(
      `${WEB_APP_URL}?search=${encodeURIComponent(query)}`
    );

    const result = await response.json();

    if (result.status === "found") {

      const disabled = result.attendance === "Checked In" ? "disabled" : "";
      const buttonText = result.attendance === "Checked In"
        ? "Checked In"
        : "Check In";

      searchResult.innerHTML = `
        <div class="search-card-result">

          <div>
            <strong>${result.name}</strong><br>
            <small>${result.id}</small><br>
            <small>Status: ${result.attendance}</small>
          </div>

          <button id="manualCheckBtn" ${disabled}>
            ${buttonText}
          </button>

        </div>
      `;

      if (result.attendance !== "Checked In") {
        document
          .getElementById("manualCheckBtn")
          .addEventListener("click", () => manualCheckIn(result.id));
      }

    } else {

      searchResult.innerHTML = `
        <div class="search-card-result not-found">
          Participant not found.
        </div>
      `;

    }

  } catch (err) {

    searchResult.innerHTML = `
      <div class="search-card-result not-found">
        Unable to search participant.
      </div>
    `;

  }

}

// ======================================================
// MANUAL CHECK-IN
// ======================================================

async function manualCheckIn(id) {

  try {

    const response = await fetch(
      `${WEB_APP_URL}?manual=${encodeURIComponent(id)}`
    );

    const result = await response.json();

    handleResult(result);

    searchInput.value = "";
    searchResult.innerHTML = "";

    setTimeout(() => {
      resetScanner();
    }, 2000);

  } catch (err) {

    showNetworkError();

  }

}

// ======================================================
// HANDLE API RESULT
// ======================================================

function handleResult(result) {

  switch (result.status) {

    case "success":
      showSuccess(result);
      break;

    case "duplicate":
      showDuplicate(result);
      break;

    case "invalid":
      showInvalid();
      break;

    default:
      showNetworkError();

  }

}

// ======================================================
// OVERLAY FUNCTIONS
// ======================================================

function openOverlay(type, title, subtitle, name, id, time, icon) {

  overlay.style.display = "flex";

  overlayCard.className = `overlay-card ${type}`;

  overlayIcon.textContent = icon;
  overlayTitle.textContent = title;
  overlaySubtitle.textContent = subtitle;

  overlayName.textContent = name;
  overlayId.textContent = id;
  overlayTime.textContent = time;

}

function showSuccess(data) {

  navigator.vibrate?.(120);

  openOverlay(
    "overlay-success",
    "Welcome to AARPPO '26",
    "Entry Confirmed",
    data.name,
    data.id,
    data.time,
    "✅"
  );

  addRecent({
    name: data.name,
    id: data.id,
    time: data.time
  });

  loadStats();

}

function showDuplicate(data) {

  navigator.vibrate?.([120, 80, 120]);

  openOverlay(
    "overlay-duplicate",
    "Already Checked In",
    "Duplicate Entry",
    data.name,
    data.id,
    data.time,
    "❌"
  );

}

function showInvalid() {

  openOverlay(
    "overlay-invalid",
    "Invalid QR Code",
    "Participant Not Found",
    "-",
    "-",
    "-",
    "⚠️"
  );

}

function showNetworkError() {

  openOverlay(
    "overlay-network",
    "Network Error",
    "Unable to contact server",
    "-",
    "-",
    "-",
    "📡"
  );

}

// ======================================================
// RESET SCANNER
// ======================================================

function resetScanner() {

  // Hide popup
  overlay.style.display = "none";

  // Resume camera
  if (scannerStarted && htmlScanner) {
    try {
      htmlScanner.resume();
    } catch (err) {
      console.log(err);
    }
  }

}