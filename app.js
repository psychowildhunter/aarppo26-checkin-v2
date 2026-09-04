// ======================================================
// AARPPO '26 Check-In App — Version 7 (Final Event Day)
// Yuvakairali | University of Delhi
// ======================================================

// ⭐ PASTE YOUR GOOGLEUSERCONTENT URL HERE
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbygGlNA9lkv7eL56oAG_yOldH1LnG7SgcqUp0qIc3oMEBmT1oORnwV6AkdlSAYbVura/exec";

let htmlScanner = null;
let scannerStarted = false;
let scanLocked = false;

// ---------------- DOM ----------------
const checkedCount = document.getElementById("checkedCount");
const remainingCount = document.getElementById("remainingCount");
const recentList = document.getElementById("recentList");
const startBtn = document.getElementById("startScanner");
const searchInput = document.getElementById("searchInput");
const searchResult = document.getElementById("searchResult");

const overlay = document.getElementById("resultOverlay");
const overlayCard = document.getElementById("overlayCard");
const overlayIcon = document.getElementById("overlayIcon");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySubtitle = document.getElementById("overlaySubtitle");
const overlayName = document.getElementById("overlayName");
const overlayId = document.getElementById("overlayId");
const overlayTime = document.getElementById("overlayTime");

overlay.style.display = "none";

// ---------------- SERVER CALL ----------------
async function api(params) {

    const url = WEB_APP_URL + "&" + new URLSearchParams(params).toString();

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("HTTP " + response.status);
    }

    return await response.json();
}

// ---------------- DASHBOARD ----------------
loadStats();
setInterval(loadStats, 10000);

async function loadStats() {
    try {
        const stats = await api({ stats: 1 });

        checkedCount.textContent = stats.checkedIn;
        remainingCount.textContent = stats.remaining;
    } catch (e) {
        console.log("Dashboard unavailable", e);
    }
}

// ---------------- RECENT CHECK INS ----------------
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

// ---------------- START CAMERA ----------------
startBtn.addEventListener("click", startScanner);

async function startScanner() {

    if (scannerStarted) return;

    scannerStarted = true;
    startBtn.disabled = true;
    startBtn.textContent = "Opening Camera...";

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

// ---------------- QR SCAN ----------------
async function onScanSuccess(decodedText) {

    if (scanLocked) return;
    scanLocked = true;

    htmlScanner.pause(true);

    const participantId = decodedText.trim().toUpperCase();

    try {

        const result = await api({ id: participantId });
        handleResult(result);

    } catch (e) {

        console.error(e);
        showNetworkError();

    }

    setTimeout(resetScanner, 2500);
}

// ---------------- SEARCH ----------------
document.querySelector(".search-box button")
.addEventListener("click", searchParticipant);

searchInput.addEventListener("keypress", e => {
    if (e.key === "Enter") searchParticipant();
});

async function searchParticipant() {

    const query = searchInput.value.trim().toUpperCase();

    if (!query) return;

    searchResult.innerHTML = "Searching...";

    try {

        const result = await api({ search: query });

        if (result.status === "found") {

            searchResult.innerHTML = `
                <div class="search-card-result">
                    <div>
                        <strong>${result.name}</strong><br>
                        <small>${result.id}</small><br>
                        <small>Status: ${result.attendance}</small>
                    </div>
                    <button id="manualBtn" ${result.attendance === "Checked In" ? "disabled" : ""}>
                        ${result.attendance === "Checked In" ? "Checked In" : "Check In"}
                    </button>
                </div>
            `;

            if (result.attendance !== "Checked In") {
                document.getElementById("manualBtn")
                .onclick = () => manualCheckIn(result.id);
            }

        } else {
            searchResult.innerHTML = "<div class='search-card-result not-found'>Participant not found.</div>";
        }

    } catch (e) {
        searchResult.innerHTML = "<div class='search-card-result not-found'>Unable to contact server.</div>";
    }
}

// ---------------- MANUAL CHECK IN ----------------
async function manualCheckIn(id) {

    try {

        const result = await api({ manual: id.trim().toUpperCase() });
        handleResult(result);

        searchInput.value = "";
        searchResult.innerHTML = "";

    } catch (e) {
        showNetworkError();
    }

    setTimeout(resetScanner,2500);
}

// ---------------- HANDLE RESULT ----------------
function handleResult(result){

    switch(result.status){

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

// ---------------- POPUPS ----------------
function openOverlay(type,title,subtitle,name,id,time,icon){

    overlay.style.display="flex";

    overlayCard.className=`overlay-card ${type}`;

    overlayIcon.textContent=icon;
    overlayTitle.textContent=title;
    overlaySubtitle.textContent=subtitle;

    overlayName.textContent=name;
    overlayId.textContent=id;
    overlayTime.textContent=time;
}

function showSuccess(data){

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

    addRecent(data);
    loadStats();
}

function showDuplicate(data){

    navigator.vibrate?.([120,80,120]);

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

function showInvalid(){

    openOverlay(
        "overlay-invalid",
        "Invalid QR Code",
        "Participant Not Found",
        "-","-","-","⚠️"
    );
}

function showNetworkError(){

    openOverlay(
        "overlay-network",
        "Network Error",
        "Unable to contact server",
        "-","-","-","📡"
    );
}

// ---------------- RESET SCANNER ----------------
function resetScanner(){

    overlay.style.display="none";
    scanLocked=false;

    if(scannerStarted && htmlScanner){
        try{
            htmlScanner.resume();
        }catch(e){
            console.log(e);
        }
    }
}
