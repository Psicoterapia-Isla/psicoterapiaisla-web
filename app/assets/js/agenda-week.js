import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";
import {
  collection, getDocs, query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   AUTH
========================= */
await requireAuth();

const user = auth.currentUser;
if (!user) throw new Error("Usuario no autenticado");

const therapistId = user.uid;
const grid = document.getElementById("weekGrid");

/* =========================
   CONFIG
========================= */
const START_HOUR = 9;
const END_HOUR = 21;
const DAYS = 7;

/* =========================
   SEMANA (LUNES)
========================= */
const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
monday.setHours(12, 0, 0, 0); // 🔒 CLAVE anti-bug

/* =========================
   HEADERS
========================= */
grid.appendChild(document.createElement("div")); // esquina vacía

for (let d = 0; d < DAYS; d++) {
  const day = new Date(monday);
  day.setDate(monday.getDate() + d);
  day.setHours(12, 0, 0, 0); // 🔒

  const iso = toISODate(day);

  const h = document.createElement("div");
  h.className = "day-header";
  h.textContent = day.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric"
  });

  h.onclick = () => {
    window.location.href = `agenda-diaria.html?date=${iso}`;
  };

  grid.appendChild(h);
}

/* =========================
   GRID HORAS
========================= */
for (let hour = START_HOUR; hour < END_HOUR; hour++) {

  const hourCell = document.createElement("div");
  hourCell.className = "week-hour";
  hourCell.textContent = `${hour}:00`;
  grid.appendChild(hourCell);

  for (let d = 0; d < DAYS; d++) {
    const cell = document.createElement("div");
    cell.className = "week-slot available";

    cell.onclick = () => {
      openCreateModal(getDayISO(d), hour);
    };

    grid.appendChild(cell);
  }
}

/* =========================
   DATOS
========================= */
const start = Timestamp.fromDate(monday);
const end = Timestamp.fromDate(
  new Date(monday.getTime() + 7 * 86400000)
);

const snap = await getDocs(query(
  collection(db, "appointments"),
  where("therapistId", "==", therapistId),
  where("start", ">=", start),
  where("start", "<", end)
));

snap.forEach(docSnap => {
  const a = docSnap.data();
  if (!a.start) return;

  const s = a.start.toDate();
  const dayIndex = (s.getDay() + 6) % 7;
  const hour = s.getHours();

  if (hour < START_HOUR || hour >= END_HOUR) return;

  const index =
    1 + dayIndex + (hour - START_HOUR + 1) * (DAYS + 1);

  const cell = grid.children[index];
  if (!cell) return;

cell.className =
  `week-slot ${a.status === "completed" ? "done" : "reserved"}`;

cell.textContent = a.patientName || "";

cell.onclick = () => openAppointmentModal(docSnap.id);
});

/* =========================
   HELPERS
========================= */
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayISO(offset) {
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);
  d.setHours(12, 0, 0, 0);
  return toISODate(d);
}

/* =========================
   MODAL CREAR CITA
========================= */
window.openCreateModal = (dateISO, hour) => {
  document.getElementById("createModal").style.display = "block";

  document.getElementById("cDateLabel").textContent =
    new Date(dateISO + "T12:00:00").toLocaleDateString("es-ES");

  document.getElementById("cStart").value =
    `${hour.toString().padStart(2, "0")}:00`;

  document.getElementById("cEnd").value =
    `${(hour + 1).toString().padStart(2, "0")}:00`;

  window.__selectedDateISO = dateISO;
};
