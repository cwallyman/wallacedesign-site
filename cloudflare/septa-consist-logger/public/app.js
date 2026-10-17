const dateInput = document.getElementById("date");
const tripsBody = document.querySelector("#trips-table tbody");
const carInput = document.getElementById("car-input");
const carResults = document.getElementById("car-results");
const trainInput = document.getElementById("train-input");
const trainResults = document.getElementById("train-results");
const lastUpdated = document.getElementById("last-updated");
const exportLink = document.getElementById("export-link");

const REFRESH_MS = 60_000;

// Default: newest first-seen at the top, earliest at the bottom.
let sortKey = "first_seen_at";
let sortDir = "desc";
let currentTrips = [];

function todayEastern() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDelay(trip) {
  const min = trip.max_late ?? 0;
  return min > 0 ? `${min} min` : '<span class="muted">on time</span>';
}

function fmtDelayStart(trip) {
  if (!trip.delay_start_stop && !trip.delay_start_at) return "";
  return `${trip.delay_start_stop ?? "unknown stop"} (${fmtTime(trip.delay_start_at)})`;
}

async function loadTrips() {
  const date = dateInput.value || todayEastern();
  exportLink.href = `/api/export?date=${encodeURIComponent(date)}`;
  exportLink.download = `septa-consists-${date}.xlsx`;
  const res = await fetch(`/api/trips?date=${encodeURIComponent(date)}`);
  const data = await res.json();
  currentTrips = data.trips;
  renderTrips();
}

function compareTrips(a, b) {
  const av = a[sortKey];
  const bv = b[sortKey];
  // Blank values always sort last, whichever direction.
  const aBlank = av == null || av === "";
  const bBlank = bv == null || bv === "";
  if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1;
  const cmp = typeof av === "number" && typeof bv === "number"
    ? av - bv
    : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
  return sortDir === "asc" ? cmp : -cmp;
}

function renderTrips() {
  for (const th of document.querySelectorAll("#trips-table th[data-key]")) {
    th.setAttribute("aria-sort", th.dataset.key === sortKey ? (sortDir === "asc" ? "ascending" : "descending") : "none");
  }
  tripsBody.innerHTML = "";
  for (const trip of [...currentTrips].sort(compareTrips)) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="nowrap">${trip.trainno}</td>
      <td>${trip.line ?? ""}</td>
      <td>${trip.source ?? ""}</td>
      <td>${trip.dest ?? ""}</td>
      <td>${trip.last_consist || '<span class="muted">unknown</span>'}</td>
      <td class="nowrap">${fmtTime(trip.first_seen_at)}</td>
      <td class="nowrap">${fmtTime(trip.last_seen_at)}</td>
      <td class="nowrap">${fmtDelay(trip)}</td>
      <td>${fmtDelayStart(trip)}</td>
    `;
    tripsBody.appendChild(tr);
  }
  if (currentTrips.length === 0) {
    tripsBody.innerHTML = `<tr><td colspan="9" class="muted">No trips logged for this date yet.</td></tr>`;
  }
}

async function searchCar() {
  const carno = carInput.value.trim();
  carResults.innerHTML = "";
  if (!carno) return;
  const res = await fetch(`/api/cars/${encodeURIComponent(carno)}`);
  const data = await res.json();
  if (data.sightings.length === 0) {
    carResults.innerHTML = `<li class="muted">No sightings found.</li>`;
    return;
  }
  for (const s of data.sightings) {
    const li = document.createElement("li");
    li.textContent = `${s.service_date} — train ${s.trainno} (${s.line}) ${s.source} → ${s.dest}, consist [${s.consist}] at ${fmtTime(s.observed_at)}`;
    carResults.appendChild(li);
  }
}

async function searchTrain() {
  const trainno = trainInput.value.trim();
  trainResults.innerHTML = "";
  if (!trainno) return;
  const date = dateInput.value || todayEastern();
  const res = await fetch(`/api/trains/${encodeURIComponent(trainno)}?date=${encodeURIComponent(date)}`);
  if (res.status === 404) {
    trainResults.innerHTML = `<li class="muted">No trip found for that train number on ${date}.</li>`;
    return;
  }
  const data = await res.json();
  for (const o of data.observations) {
    const li = document.createElement("li");
    li.textContent = `${fmtTime(o.observed_at)} — consist [${o.consist || "unknown"}]`;
    trainResults.appendChild(li);
  }
}

async function refreshAll() {
  await loadTrips();
  if (carInput.value.trim()) await searchCar();
  if (trainInput.value.trim()) await searchTrain();
  if (lastUpdated) {
    lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  }
}

dateInput.value = todayEastern();
for (const th of document.querySelectorAll("#trips-table th[data-key]")) {
  th.querySelector("button").addEventListener("click", () => {
    if (sortKey === th.dataset.key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = th.dataset.key;
      sortDir = "asc";
    }
    renderTrips();
  });
}
dateInput.addEventListener("change", refreshAll);
document.getElementById("car-search").addEventListener("click", searchCar);
document.getElementById("train-search").addEventListener("click", searchTrain);
carInput.addEventListener("keydown", (e) => e.key === "Enter" && searchCar());
trainInput.addEventListener("keydown", (e) => e.key === "Enter" && searchTrain());

refreshAll();
setInterval(refreshAll, REFRESH_MS);
