import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

await requireAuth();

const user = auth.currentUser;
if (!user) throw new Error("Auth no disponible");
const therapistId = user.uid;

const grid = document.getElementById("weekGrid");

const START_HOUR = 9;
const END_HOUR = 21;
const DAYS = 7;

/* =========================
   FECHA BASE (LUNES)
========================= */
const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
monday.setHours(0,0,0,0);

/* =========================
   HEADERS
========================= */
grid.appendChild(document.createElement("div")); // esquina vacía

for (let d = 0; d < DAYS; d++) {
  const day = new Date(monday);
  day.setDate(monday.getDate() + d);

  const header = document.createElement("div");
  header.className = "day-header";
  header.textContent = day.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric"
  });

  header.onclick = () => {
    const iso = day.toISOString().split("T")[0];
    window.location.href = `agenda-diaria.html?date=${iso}`;
  };

  grid.appendChild(header);
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
    cell.className = "week-slot blocked";
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
   PINTAR CITAS
========================= */
snap.forEach(doc => {
  const a = doc.data();
  if (!a.start) return;

  const s = a.start.toDate();
  const dayIndex = (s.getDay() + 6) % 7;
  const hourIndex = s.getHours() - START_HOUR;

  if (hourIndex < 0 || hourIndex >= END_HOUR - START_HOUR) return;

  const index =
    1 +                       // esquina
    dayIndex +                // día
    (hourIndex + 1) * (DAYS + 1); // fila

  const cell = grid.children[index];
  if (!cell) return;

  cell.className = `week-slot ${a.status || "reserved"}`;
  cell.textContent = a.patientName || "";
});
