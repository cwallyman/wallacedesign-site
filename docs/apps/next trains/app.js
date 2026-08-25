const LINE_CONFIGS = {
  paoliThorndale: {
    title: "Paoli/Thorndale Line",
    defaultOriginId: "marketEast",
    defaultDestinationId: "paoli",
    stations: [
      { id: "thorndale", label: "Thorndale", apiName: "Thorndale" },
      { id: "downingtown", label: "Downingtown", apiName: "Downingtown" },
      { id: "whitford", label: "Whitford", apiName: "Whitford" },
      { id: "exton", label: "Exton", apiName: "Exton" },
      { id: "malvern", label: "Malvern", apiName: "Malvern" },
      { id: "paoli", label: "Paoli", apiName: "Paoli" },
      { id: "daylesford", label: "Daylesford", apiName: "Daylesford" },
      { id: "berwyn", label: "Berwyn", apiName: "Berwyn" },
      { id: "devon", label: "Devon", apiName: "Devon" },
      { id: "strafford", label: "Strafford", apiName: "Strafford" },
      { id: "wayne", label: "Wayne", apiName: "Wayne" },
      { id: "stDavids", label: "St. Davids", apiName: "St. Davids" },
      { id: "radnor", label: "Radnor", apiName: "Radnor" },
      { id: "villanova", label: "Villanova", apiName: "Villanova" },
      { id: "rosemont", label: "Rosemont", apiName: "Rosemont" },
      { id: "brynMawr", label: "Bryn Mawr", apiName: "Bryn Mawr" },
      { id: "haverford", label: "Haverford", apiName: "Haverford" },
      { id: "ardmore", label: "Ardmore", apiName: "Ardmore" },
      { id: "wynnewood", label: "Wynnewood", apiName: "Wynnewood" },
      { id: "narberth", label: "Narberth", apiName: "Narberth" },
      { id: "merion", label: "Merion", apiName: "Merion" },
      { id: "overbrook", label: "Overbrook", apiName: "Overbrook" },
      { id: "thirtiethStreet", label: "30th Street Station", apiName: "30th Street Station" },
      { id: "suburbanStation", label: "Suburban Station", apiName: "Suburban Station" },
      { id: "marketEast", label: "Jefferson", apiName: "Market East" },
      { id: "templeUniversity", label: "Temple University", apiName: "Temple U" },
    ],
  },
  manayunkNorristown: {
    title: "Manayunk/Norristown Line",
    defaultOriginId: "marketEast",
    defaultDestinationId: "norristownTc",
    stations: [
      { id: "norristownElmSt", label: "Norristown - Elm St", apiName: "Elm St" },
      { id: "mainSt", label: "Main St", apiName: "Main St" },
      { id: "norristownTc", label: "Norristown Transit Center", apiName: "Norristown TC" },
      { id: "conshohocken", label: "Conshohocken", apiName: "Conshohocken" },
      { id: "springMill", label: "Spring Mill", apiName: "Spring Mill" },
      { id: "miquon", label: "Miquon", apiName: "Miquon" },
      { id: "ivyRidge", label: "Ivy Ridge", apiName: "Ivy Ridge" },
      { id: "manayunk", label: "Manayunk", apiName: "Manayunk" },
      { id: "wissahickon", label: "Wissahickon", apiName: "Wissahickon" },
      { id: "eastFalls", label: "East Falls", apiName: "East Falls" },
      { id: "allegheny", label: "Allegheny", apiName: "Allegheny" },
      { id: "northBroad", label: "North Broad", apiName: "North Broad St" },
      { id: "templeUniversity", label: "Temple University", apiName: "Temple U" },
      { id: "marketEast", label: "Jefferson", apiName: "Market East" },
      { id: "suburbanStation", label: "Suburban Station", apiName: "Suburban Station" },
      { id: "thirtiethStreet", label: "30th Street Station", apiName: "30th Street Station" },
      { id: "pennMedicine", label: "Penn Medicine Station", apiName: "Penn Medicine Station" },
    ],
  },
  westTrenton: {
    title: "West Trenton Line",
    defaultOriginId: "marketEast",
    defaultDestinationId: "yardley",
    stations: [
      { id: "westTrenton", label: "West Trenton", apiName: "West Trenton" },
      { id: "yardley", label: "Yardley", apiName: "Yardley" },
      { id: "woodbourne", label: "Woodbourne", apiName: "Woodbourne" },
      { id: "langhorne", label: "Langhorne", apiName: "Langhorne" },
      { id: "neshaminyFalls", label: "Neshaminy Falls", apiName: "Neshaminy Falls" },
      { id: "trevose", label: "Trevose", apiName: "Trevose" },
      { id: "somerton", label: "Somerton", apiName: "Somerton" },
      { id: "forestHills", label: "Forest Hills", apiName: "Forest Hills" },
      { id: "philmont", label: "Philmont", apiName: "Philmont" },
      { id: "bethayres", label: "Bethayres", apiName: "Bethayres" },
      { id: "meadowbrook", label: "Meadowbrook", apiName: "Meadowbrook" },
      { id: "rydal", label: "Rydal", apiName: "Rydal" },
      { id: "noble", label: "Noble", apiName: "Noble" },
      { id: "jenkintownWyncote", label: "Jenkintown-Wyncote", apiName: "Jenkintown-Wyncote" },
      { id: "fernRock", label: "Fern Rock Transit Center", apiName: "Fern Rock TC" },
      { id: "templeUniversity", label: "Temple University", apiName: "Temple U" },
      { id: "marketEast", label: "Jefferson", apiName: "Market East" },
      { id: "suburbanStation", label: "Suburban Station", apiName: "Suburban Station" },
      { id: "thirtiethStreet", label: "30th Street Station", apiName: "30th Street Station" },
    ],
  },
};

const DEFAULT_LINE_ID = "paoliThorndale";

const LOCAL_PROXY_ORIGIN = "http://127.0.0.1:8000";
const PRODUCTION_PROXY_ORIGIN = "https://api.wallacedesign.org";

const lineButtons = Array.from(document.querySelectorAll(".line-button"));
const originSelect = document.querySelector("#origin");
const destinationSelect = document.querySelector("#destination");
const tripForm = document.querySelector("#trip-form");
const swapButton = document.querySelector("#swap-button");
const autoRefreshButton = document.querySelector("#auto-refresh");
const routeSummary = document.querySelector("#route-summary");
const lastUpdated = document.querySelector("#last-updated");
const statusMessage = document.querySelector("#status-message");
const results = document.querySelector("#results");
const trainCardTemplate = document.querySelector("#train-card-template");

let autoRefreshEnabled = true;
let refreshTimer = null;
let currentLineId = DEFAULT_LINE_ID;

function getCurrentLineConfig() {
  return LINE_CONFIGS[currentLineId];
}

function getStationMap() {
  return Object.fromEntries(getCurrentLineConfig().stations.map((station) => [station.id, station]));
}

function renderStationOptions() {
  const { stations, defaultOriginId, defaultDestinationId } = getCurrentLineConfig();
  const markup = stations.map(
    (station) => `<option value="${station.id}">${station.label}</option>`
  ).join("");

  originSelect.innerHTML = markup;
  destinationSelect.innerHTML = markup;
  originSelect.value = defaultOriginId;
  destinationSelect.value = defaultDestinationId;
}

function getFallbackStationId(excludedId, preferredId) {
  const stationMap = getStationMap();
  const { stations } = getCurrentLineConfig();

  if (preferredId && preferredId !== excludedId && stationMap[preferredId]) {
    return preferredId;
  }

  const fallbackStation = stations.find((station) => station.id !== excludedId);
  return fallbackStation ? fallbackStation.id : excludedId;
}

function ensureDifferentStations(changedField) {
  const { defaultOriginId, defaultDestinationId } = getCurrentLineConfig();

  if (originSelect.value === destinationSelect.value) {
    if (changedField === "origin") {
      destinationSelect.value = getFallbackStationId(originSelect.value, defaultDestinationId);
    } else {
      originSelect.value = getFallbackStationId(destinationSelect.value, defaultOriginId);
    }
  }
}

function updateRouteSummary() {
  const stationMap = getStationMap();
  const origin = stationMap[originSelect.value].label;
  const destination = stationMap[destinationSelect.value].label;
  routeSummary.textContent = `${origin} to ${destination}`;
}

function updateLineButtons() {
  lineButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.line === currentLineId);
  });
}

function switchLine(nextLineId) {
  if (!LINE_CONFIGS[nextLineId] || nextLineId === currentLineId) {
    return;
  }

  currentLineId = nextLineId;
  renderStationOptions();
  updateLineButtons();
  updateRouteSummary();
  refreshTrains();
  restartAutoRefresh();
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function normalizeErrorMessage(message) {
  const text = `${message || ""}`.trim();
  const host = window.location.hostname;

  if (!text) {
    return "Could not load train data.";
  }

  if (
    text === "Failed to fetch" ||
    text.includes("NetworkError") ||
    text.includes("Load failed")
  ) {
    if (host === "wallacedesign.org" || host === "www.wallacedesign.org") {
      return "Could not reach api.wallacedesign.org yet. Finish the Cloudflare DNS setup for the production proxy, then reload the page.";
    }

    return "Could not reach the local train proxy. Start it with `python3 server.py`, then open http://127.0.0.1:8000.";
  }

  if (text.startsWith("<!DOCTYPE HTML>") || text.startsWith("<html")) {
    return "The app is not running through server.py yet. Start it with `python3 server.py`, then open http://127.0.0.1:8000.";
  }

  return text;
}

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function classifyStatus(status) {
  const value = `${status || ""}`.toLowerCase();
  if (value.includes("on time")) {
    return "is-on-time";
  }
  if (value.includes("late") || value.includes("delay") || value.includes("mins")) {
    return "is-late";
  }
  return "";
}

function formatDelay(delay) {
  if (!delay || delay === "0 mins") {
    return "On time";
  }

  if (delay.toLowerCase().includes("late") || delay.toLowerCase().includes("delay")) {
    return delay;
  }

  return `${delay} late`;
}

function renderResults(trains) {
  results.innerHTML = "";

  if (!Array.isArray(trains) || trains.length === 0) {
    setStatus("No upcoming trains were returned for this route.");
    return;
  }

  setStatus("");

  trains.slice(0, 3).forEach((train) => {
    const fragment = trainCardTemplate.content.cloneNode(true);
    const statusText = formatDelay(train.orig_delay);
    const statusClass = classifyStatus(statusText);
    const trackValue = train.orig_track || train.track || "TBD";
    const consist = `${train.consist || ""}`.trim();
    const consistLabel = consist
      ? `${train.car_count || consist.split(",").filter(Boolean).length} cars: ${consist}`
      : "🚂 Consist unavailable";

    fragment.querySelector(".train-number").textContent = train.orig_train || train.trainno || "Unknown";
    fragment.querySelector(".train-consist").textContent = consistLabel;
    fragment.querySelector(".train-time").textContent = `${train.orig_departure_time || "--"} -> ${train.orig_arrival_time || "--"}`;
    fragment.querySelector(".departure-time").textContent = train.orig_departure_time || "--";
    fragment.querySelector(".arrival-time").textContent = train.orig_arrival_time || "--";

    const statusNode = fragment.querySelector(".status-text");
    statusNode.textContent = statusText;
    if (statusClass) {
      statusNode.classList.add(statusClass);
    }

    fragment.querySelector(".track-text").textContent = trackValue;
    results.appendChild(fragment);
  });
}

function getApiUrls() {
  const productionApiUrl = `${PRODUCTION_PROXY_ORIGIN}/api/next-trains`;
  const localApiUrl = `${LOCAL_PROXY_ORIGIN}/api/next-trains`;
  const host = window.location.hostname;

  if (window.location.origin === LOCAL_PROXY_ORIGIN) {
    return ["/api/next-trains"];
  }

  if (host === "wallacedesign.org" || host === "www.wallacedesign.org") {
    return [productionApiUrl];
  }

  if (window.location.protocol === "file:") {
    return [localApiUrl];
  }

  return ["/api/next-trains", productionApiUrl, localApiUrl];
}

async function fetchNextToArrive(origin, destination) {
  const params = new URLSearchParams({
    origin,
    destination,
  });

  let lastError = null;

  for (const apiUrl of getApiUrls()) {
    try {
      const response = await fetch(`${apiUrl}?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(normalizeErrorMessage(errorText));
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not load train data.");
}

async function refreshTrains() {
  const stationMap = getStationMap();
  const origin = stationMap[originSelect.value];
  const destination = stationMap[destinationSelect.value];

  updateRouteSummary();
  setStatus("Loading live train data...");
  lastUpdated.textContent = "Checking SEPTA live feed...";

  try {
    const trains = await fetchNextToArrive(origin.apiName, destination.apiName);
    renderResults(trains);
    lastUpdated.textContent = `Last updated ${formatTimestamp()}`;
  } catch (error) {
    results.innerHTML = "";
    setStatus(normalizeErrorMessage(error.message));
    lastUpdated.textContent = "Live feed unavailable";
  }
}

function restartAutoRefresh() {
  window.clearInterval(refreshTimer);
  if (!autoRefreshEnabled) {
    return;
  }

  refreshTimer = window.setInterval(() => {
    refreshTrains();
  }, 30000);
}

originSelect.addEventListener("change", () => {
  ensureDifferentStations("origin");
  updateRouteSummary();
});

destinationSelect.addEventListener("change", () => {
  ensureDifferentStations("destination");
  updateRouteSummary();
});

tripForm.addEventListener("submit", (event) => {
  event.preventDefault();
  refreshTrains();
  restartAutoRefresh();
});

swapButton.addEventListener("click", () => {
  const nextOrigin = destinationSelect.value;
  const nextDestination = originSelect.value;

  originSelect.value = nextOrigin;
  destinationSelect.value = nextDestination;

  updateRouteSummary();
  refreshTrains();
  restartAutoRefresh();
});

autoRefreshButton.addEventListener("click", () => {
  autoRefreshEnabled = !autoRefreshEnabled;
  autoRefreshButton.textContent = `Auto-refresh: ${autoRefreshEnabled ? "on" : "off"}`;
  restartAutoRefresh();
});

lineButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchLine(button.dataset.line);
  });
});

renderStationOptions();
updateLineButtons();
updateRouteSummary();
refreshTrains();
restartAutoRefresh();
