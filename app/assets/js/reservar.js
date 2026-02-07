import { auth, db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ESTADO
========================= */
let currentWeekStart = startOfWeek(new Date());
let selectedTherapistId = null;
let selectedModality = "Viladecans";

const therapistSelect = document.getElementById("therapistId");
const calendarBody = document.getElementById("calendarBody");
const weekLabel = document.getElementById("currentWeekLabel");
const message = document.getElementById("calendarMessage");

/* =========================
   TERAPEUTAS
========================= */
const therapistsSnap = await getDocs(
  query(collection(db, "therapists"), where("active", "==", true))
);

therapistsSnap.forEach(docSnap => {
  const opt = document.createElement("option");
  opt.value = docSnap.id;
  opt.textContent = docSnap.data().name || docSnap.id;
  therapistSelect.appendChild(opt);
});

/* =========================
   EVENTOS
========================= */
therapistSelect.onchange = async () => {
  selectedTherapistId = therapistSelect.value;
  if (!selectedTherapistId) return;
  await renderWeek();
};

document.getElementById("prevWeek").onclick = async () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  await renderWeek();
};

document.getElementById("nextWeek").onclick = async () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  await renderWeek();
};

/* =========================
   RENDER SEMANA
========================= */
async function renderWeek() {
  calendarBody.innerHTML = "";
  message.textContent = "";

  if (!selectedTherapistId) {
    message.textContent = "Selecciona un terapeuta.";
    return;
  }

  const weekKey = toISO(currentWeekStart);
  const availabilityRef = doc(
    db,
    "availability",
    `${selectedTherapistId}_${weekKey}`
  );

  const availabilitySnap = await getDoc(availabilityRef);
  if (!availabilitySnap.exists()) {
    message.textContent = "No hay disponibilidad esta semana.";
    return;
  }

  const slots = availabilitySnap.data().slots || {};

  const start = Timestamp.fromDate(currentWeekStart);
  const end = Timestamp.fromDate(addDays(currentWeekStart, 7));

  const appointmentsSnap = await getDocs(
    query(
      collection(db, "appointments"),
      where("therapistId", "==", selectedTherapistId),
      where("start", ">=", start),
      where("start", "<", end)
    )
  );

  const occupied = new Set();
  appointmentsSnap.forEach(d => {
    const a = d.data();
    const h = a.start.toDate().getHours();
    const day = a.start.toDate().getDay();
    const key = `${day}_${h}`;
    occupied.add(key);
  });

  renderGrid(slots, occupied);
}

/* =========================
   GRID
========================= */
function renderGrid(slots, occupied) {
  calendarBody.innerHTML = "";

  for (let hour = 9; hour < 21; hour++) {
    const row = document.createElement("div");
    row.className = "calendar-row";

    const time = document.createElement("div");
    time.className = "time-cell";
    time.textContent = `${hour}:00`;
    row.appendChild(time);

    for (let d = 1; d <= 5; d++) {
      const cell = document.createElement("div");
      cell.className = "slot-cell";

      const slotKey = `${["sun","mon","tue","wed","thu","fri","sat"][d]}_${hour}`;
      const occupiedKey = `${d}_${hour}`;

      if (slots[slotKey] && !occupied.has(occupiedKey)) {
        cell.classList.add("available");
        cell.textContent = "Disponible";
        cell.onclick = () => reserve(d, hour);
      } else {
        cell.classList.add("blocked");
        cell.textContent = "—";
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  }
}

/* =========================
   RESERVAR (PACIENTE)
========================= */
async function reserve(day, hour) {
  const user = auth.currentUser;
  if (!user) {
    alert("Debes iniciar sesión");
    return;
  }

  const date = new Date(currentWeekStart);
  date.setDate(date.getDate() + (day - 1));
  date.setHours(hour, 0, 0, 0);

  const end = new Date(date);
  end.setHours(end.getHours() + 1);

  await addDoc(collection(db, "appointments"), {
    therapistId: selectedTherapistId,
    patientId: user.uid,

    createdBy: user.uid,
    createdByRole: "patient",

    modality: selectedModality,
    service: "Sesión de terapia",

    start: Timestamp.fromDate(date),
    end: Timestamp.fromDate(end),

    status: "scheduled",
    createdAt: Timestamp.now()
  });

  alert("Cita reservada correctamente");
  await renderWeek();
}

/* =========================
   HELPERS
========================= */
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
