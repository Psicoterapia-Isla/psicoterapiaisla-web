// app/assets/js/agenda-week.js

import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   AUTH (BLINDAJE REAL)
========================= */
await requireAuth();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.error("Usuario no autenticado");
    return;
  }

  const therapistId = user.uid;
  await initWeekAgenda(therapistId);
});

/* =========================
   MAIN
========================= */
async function initWeekAgenda(therapistId) {

  /* =========================
     GRID
  ========================= */
  const grid = document.getElementById("weekGrid");
  if (!grid) {
    console.error("No existe #weekGrid en el DOM");
    return;
  }

  const START_HOUR = 9;
  const END_HOUR = 21;
  const DAYS = 7;

  /* =========================
     FECHA SEMANA
  ========================= */
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  /* =========================
     HEADERS
  ========================= */
  grid.innerHTML = "";
  grid.appendChild(document.createElement("div")); // esquina vacía

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
     HOURS + CELLS
  ========================= */
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {

    const hourCell = document.createElement("div");
    hourCell.className = "week-hour";
    hourCell.textContent = `${hour}:00`;
    grid.appendChild(hourCell);

    for (let d = 0; d < DAYS; d++) {
      const cell = document.createElement("div");
      cell.className = "week-slot blocked";
      cell.dataset.hour = hour;
      cell.dataset.day = d;
      grid.appendChild(cell);
    }
  }

  /* =========================
     LOAD APPOINTMENTS
  ========================= */
  const start = Timestamp.fromDate(monday);
  const end = Timestamp.fromDate(
    new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000)
  );

  const snap = await getDocs(
    query(
      collection(db, "appointments"),
      where("therapistId", "==", therapistId),
      where("start", ">=", start),
      where("start", "<", end)
    )
  );

  /* =========================
     RENDER DATA
  ========================= */
  snap.forEach(docSnap => {
    const a = docSnap.data();
    if (!a.start) return;

    const s = a.start.toDate();
    const day = (s.getDay() + 6) % 7;
    const hour = s.getHours();

    if (hour < START_HOUR || hour >= END_HOUR) return;

    const index =
      1 + day + (hour - START_HOUR + 1) * (DAYS + 1);

    const cell = grid.children[index];
    if (!cell) return;

    cell.className =
      `week-slot ${a.status === "completed" ? "done" : "reserved"}`;

    cell.innerHTML = `<small>${a.patientName || ""}</small>`;
  });
}
