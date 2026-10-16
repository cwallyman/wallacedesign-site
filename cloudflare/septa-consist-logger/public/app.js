const dateInput = document.getElementById("date");
const tripsBody = document.querySelector("#trips-table tbody");
const carInput = document.getElementById("car-input");
const carResults = document.getElementById("car-results");
const trainInput = document.getElementById("train-input");
const trainResults = document.getElementById("train-results");
const lastUpdated = document.getElementById("last-updated");
const exportLink = document.getElementById("export-link");

const REFRESH_MS = 60_000;

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
  tripsBody.innerHTML = "";
  for (const trip of data.trips) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${trip.trainno}</td>
      <td>${trip.line ?? ""}</td>
      <td>${trip.source ?? ""}</td>
      <td>${trip.dest ?? ""}</td>
      <td>${trip.last_consist || '<span class="muted">unknown</span>'}</td>
      <td>${fmtTime(trip.first_seen_at)}</td>
      <td>${fmtTime(trip.last_seen_at)}</td>
      <td>${fmtDelay(trip)}</td>
      <td>${fmtDelayStart(trip)}</td>
    `;
    tripsBody.appendChild(tr);
  }
  if (data.trips.length === 0) {
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
dateInput.addEventListener("change", refreshAll);
document.getElementById("car-search").addEventListener("click", searchCar);
document.getElementById("train-search").addEventListener("click", searchTrain);
carInput.addEventListener("keydown", (e) => e.key === "Enter" && searchCar());
trainInput.addEventListener("keydown", (e) => e.key === "Enter" && searchTrain());

refreshAll();
setInterval(refreshAll, REFRESH_MS);
