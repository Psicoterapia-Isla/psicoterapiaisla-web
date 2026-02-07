import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";
import {
  markAppointmentCompleted,
  invoiceAppointment
} from "./appointment-manager.js";

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
monday.setHours(12, 0, 0, 0); // 🔒 anti-bug TZ

/* =========================
   HEADERS
========================= */
grid.appendChild(document.createElement("div"));

for (let d = 0; d < DAYS; d++) {
  const day = new Date(monday);
  day.setDate(monday.getDate() + d);
  day.setHours(12, 0, 0, 0);

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
   DATA
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

  const app = { ...a, id: docSnap.id };

  cell.className =
    `week-slot ${a.status === "completed" ? "done" : "reserved"}`;

  cell.textContent = a.patientName || "";

  cell.onclick = () => openAppointmentModal(app);
});

/* =========================
   MODAL GESTIÓN
========================= */
let currentAppointment = null;

window.closeAppointmentModal = () => {
  document.getElementById("appointmentModal").style.display = "none";
};

function openAppointmentModal(app) {
  currentAppointment = app;

  const s = app.start.toDate();
  const e = app.end.toDate();

  document.getElementById("amPatient").textContent =
    app.patientName || "Sin nombre";

  document.getElementById("amDateTime").textContent =
    `${s.getHours().toString().padStart(2, "0")}:00 – ${e.getHours().toString().padStart(2, "0")}:00`;

  document.getElementById("amCompleted").checked =
    app.status === "completed";

  document.getElementById("appointmentModal").style.display = "block";
}

document.getElementById("amCompleted").onchange = async () => {
  if (!currentAppointment) return;

  await markAppointmentCompleted({
    ...currentAppointment,
    id: currentAppointment.id
  });

  location.reload();
};

document.getElementById("amInvoiceBtn").onclick = async () => {
  if (!currentAppointment || currentAppointment.invoiceId) return;

  await invoiceAppointment(
    { ...currentAppointment, id: currentAppointment.id },
    60
  );

  location.reload();
};

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
