// app/assets/js/agenda-week.js

import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   AUTH
========================= */
await requireAuth();

const user = auth.currentUser;
if (!user) throw new Error("Usuario no autenticado");

const therapistId = user.uid;

/* =========================
   GRID CONFIG
========================= */
const grid = document.getElementById("weekGrid");
const START_HOUR = 9;
const END_HOUR = 21;
const DAYS = 7;

/* =========================
   SEMANA ACTUAL (LUNES)
========================= */
const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
monday.setHours(0,0,0,0);

/* =========================
   HEADERS
========================= */
grid.appendChild(document.createElement("div")); // esquina

for (let d = 0; d < DAYS; d++) {
  const day = new Date(monday);
  day.setDate(monday.getDate() + d);

  const h = document.createElement("div");
  h.className = "day-header";
  h.textContent = day.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric"
  });

  h.onclick = () => {
    window.location.href =
      `agenda-diaria.html?date=${day.toISOString().split("T")[0]}`;
  };

  grid.appendChild(h);
}

/* =========================
   GRID BASE (HORAS)
========================= */
const cells = [];

for (let hour = START_HOUR; hour < END_HOUR; hour++) {

  const hourCell = document.createElement("div");
  hourCell.className = "week-hour";
  hourCell.textContent = `${hour}:00`;
  grid.appendChild(hourCell);

  for (let d = 0; d < DAYS; d++) {
    const cell = document.createElement("div");
    cell.className = "week-slot blocked";
    cell.dataset.day = d;
    cell.dataset.hour = hour;

    cell.onclick = () => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + d);

      window.location.href =
        `agenda-diaria.html?date=${date.toISOString().split("T")[0]}`;
    };

    grid.appendChild(cell);
    cells.push(cell);
  }
}

/* =========================
   LOAD APPOINTMENTS
========================= */
const start = Timestamp.fromDate(monday);
const end = Timestamp.fromDate(
  new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000)
);

const snap = await getDocs(query(
  collection(db, "appointments"),
  where("therapistId", "==", therapistId),
  where("start", ">=", start),
  where("start", "<", end)
));

/* =========================
   RENDER APPOINTMENTS
========================= */
snap.forEach(docSnap => {
  const a = docSnap.data();
  if (!a.start) return;

  const s = a.start.toDate();
  const day = (s.getDay() + 6) % 7;
  const hour = s.getHours();

  if (hour < START_HOUR || hour >= END_HOUR) return;

  const index =
    (hour - START_HOUR) * DAYS + day;

  const cell = cells[index];
  if (!cell) return;

  cell.className =
    `week-slot ${a.status === "completed" ? "done" : "reserved"}`;

  cell.innerHTML = `
    <strong>${a.patientName || ""}</strong>
  `;
});
