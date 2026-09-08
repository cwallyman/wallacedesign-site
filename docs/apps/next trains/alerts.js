const LOCAL_PROXY_ORIGIN = "http://127.0.0.1:8000";
const PRODUCTION_PROXY_ORIGIN = "https://api.wallacedesign.org";

const FLAG_LABELS = [
  { key: "issuspended", label: "Suspended" },
  { key: "isdetour", label: "Detour" },
  { key: "isdiversion", label: "Diversion" },
  { key: "isdelays", label: "Delays" },
  { key: "ismodifiedservice", label: "Modified Service" },
  { key: "isSnow", label: "Snow Service" },
  { key: "isalert", label: "Alert" },
  { key: "isadvisory", label: "Advisory" },
  { key: "iselevator", label: "Elevator Outage" },
];

const refreshButton = document.querySelector("#refresh-alerts");
const lastUpdated = document.querySelector("#last-updated");
const statusMessage = document.querySelector("#status-message");
const alertsContainer = document.querySelector("#alerts");
const alertCardTemplate = document.querySelector("#alert-card-template");

function setStatus(message) {
  statusMessage.textContent = message;
}

function normalizeErrorMessage(message) {
  const text = `${message || ""}`.trim();
  const host = window.location.hostname;

  if (!text) {
    return "Could not load alert data.";
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

function isFlagActive(value) {
  return value === "Y" || value === "Yes";
}

function hasActiveFlags(alert) {
  return FLAG_LABELS.some(({ key }) => isFlagActive(alert[key]));
}

function renderAlertCard(alert) {
  const fragment = alertCardTemplate.content.cloneNode(true);

  fragment.querySelector(".alert-line-name").textContent = alert.route_name || "Unknown line";
  fragment.querySelector(".alert-line-description").textContent = alert.description || "";
  fragment.querySelector(".alert-updated").textContent = alert.last_updated
    ? `Updated ${alert.last_updated}`
    : "";

  const badgesContainer = fragment.querySelector(".alert-badges");
  const activeFlags = FLAG_LABELS.filter(({ key }) => isFlagActive(alert[key]));

  if (activeFlags.length === 0) {
    const badge = document.createElement("span");
    badge.className = "alert-badge is-normal";
    badge.textContent = "Normal Service";
    badgesContainer.appendChild(badge);
  } else {
    activeFlags.forEach(({ label }) => {
      const badge = document.createElement("span");
      badge.className = "alert-badge is-active";
      badge.textContent = label;
      badgesContainer.appendChild(badge);
    });
  }

  const card = fragment.querySelector(".alert-card");

  if (alert.advisory) {
    const label = document.createElement("p");
    label.className = "alert-text-label";
    label.textContent = "Advisory";
    const text = document.createElement("p");
    text.className = "alert-text";
    text.textContent = alert.advisory;
    card.appendChild(label);
    card.appendChild(text);
  }

  if (alert.alert) {
    const label = document.createElement("p");
    label.className = "alert-text-label";
    label.textContent = "Alert";
    const text = document.createElement("p");
    text.className = "alert-text";
    text.textContent = alert.alert;
    card.appendChild(label);
    card.appendChild(text);
  }

  if (Array.isArray(alert.elevator) && alert.elevator.length > 0) {
    const label = document.createElement("p");
    label.className = "alert-text-label";
    label.textContent = "Elevator Outages";
    card.appendChild(label);

    alert.elevator.forEach((item) => {
      const text = document.createElement("p");
      text.className = "alert-text";
      text.textContent = item.message || "";
      card.appendChild(text);
    });
  }

  return fragment;
}

function renderAlerts(alerts) {
  alertsContainer.innerHTML = "";

  if (!Array.isArray(alerts) || alerts.length === 0) {
    setStatus("No Regional Rail alert data was returned.");
    return;
  }

  setStatus("");

  const sorted = [...alerts].sort((a, b) => {
    const aActive = hasActiveFlags(a);
    const bActive = hasActiveFlags(b);

    if (aActive !== bActive) {
      return aActive ? -1 : 1;
    }

    return (a.route_name || "").localeCompare(b.route_name || "");
  });

  sorted.forEach((alert) => {
    alertsContainer.appendChild(renderAlertCard(alert));
  });
}

function getApiUrls() {
  const productionApiUrl = `${PRODUCTION_PROXY_ORIGIN}/api/alerts`;
  const localApiUrl = `${LOCAL_PROXY_ORIGIN}/api/alerts`;
  const host = window.location.hostname;

  if (window.location.origin === LOCAL_PROXY_ORIGIN) {
    return ["/api/alerts"];
  }

  if (host === "wallacedesign.org" || host === "www.wallacedesign.org") {
    return [productionApiUrl];
  }

  if (window.location.protocol === "file:") {
    return [localApiUrl];
  }

  return ["/api/alerts", productionApiUrl, localApiUrl];
}

async function fetchAlerts() {
  let lastError = null;

  for (const apiUrl of getApiUrls()) {
    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(normalizeErrorMessage(errorText));
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not load alert data.");
}

async function refreshAlerts() {
  setStatus("Loading live alert data...");
  lastUpdated.textContent = "Checking SEPTA live feed...";

  try {
    const alerts = await fetchAlerts();
    renderAlerts(alerts);
    lastUpdated.textContent = `Last updated ${formatTimestamp()}`;
  } catch (error) {
    alertsContainer.innerHTML = "";
    setStatus(normalizeErrorMessage(error.message));
    lastUpdated.textContent = "Live feed unavailable";
  }
}

refreshButton.addEventListener("click", () => {
  refreshAlerts();
});

refreshAlerts();
