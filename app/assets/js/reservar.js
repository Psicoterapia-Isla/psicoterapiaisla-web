import { auth } from "./firebase.js";
import { db } from "./firebase.js";
import { createAppointment } from "./appointments.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ESTADO
========================= */
let currentWeekStart = startOfWeek(new Date());
let selectedTherapistId = null;

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

therapistsSnap.forEach(doc => {
  const opt = document.createElement("option");
  opt.value = doc.id;
  opt.textContent = doc.data().name || doc.id;
  therapistSelect.appendChild(opt);
});

/* =========================
   EVENTOS
========================= */
therapistSelect.addEventListener("change", async () => {
  selectedTherapistId = therapistSelect.value;
  if (!selectedTherapistId) return;
  await renderWeek();
});

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

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  weekLabel.textContent = formatWeek(currentWeekStart);

  const availabilitySnap = await getDocs(
    query(
      collection(db, "availability"),
      where("therapistId", "==", selectedTherapistId)
    )
  );

  const slots = buildSlots(availabilitySnap.docs, currentWeekStart);

  if (slots.length === 0) {
    message.textContent = "No hay disponibilidad esta semana.";
    return;
  }

  renderGrid(slots);
}

/* =========================
   SLOT BUILDER (60 MIN)
========================= */
function buildSlots(docs, weekStart) {
  const slots = [];

  docs.forEach(doc => {
    const { start, end } = doc.data();
    let cursor = start.toDate();

    while (cursor < end.toDate()) {
      const slotEnd = new Date(cursor);
      slotEnd.setHours(slotEnd.getHours() + 1);

      if (
        cursor >= weekStart &&
        cursor < addDays(weekStart, 7)
      ) {
        slots.push({
          start: new Date(cursor),
          end: slotEnd
        });
      }

      cursor = slotEnd;
    }
  });

  return slots;
}

/* =========================
   GRID
========================= */
function renderGrid(slots) {
  const hours = [...new Set(slots.map(s => s.start.getHours()))].sort();

  hours.forEach(hour => {
    const row = document.createElement("div");
    row.className = "calendar-row";

    const timeCell = document.createElement("div");
    timeCell.className = "time-cell";
    timeCell.textContent = `${hour}:00`;
    row.appendChild(timeCell);

    for (let d = 0; d < 5; d++) {
      const cell = document.createElement("div");
      cell.className = "slot-cell";

      const slot = slots.find(s =>
        s.start.getHours() === hour &&
        s.start.getDay() === d + 1
      );

      if (slot) {
        cell.classList.add("available");
        cell.textContent = "Disponible";

        cell.onclick = async () => {
          await reserve(slot);
        };
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  });
}

/* =========================
   RESERVAR
========================= */
async function reserve(slot) {
  const user = auth.currentUser;
  if (!user) return alert("No autenticado");

  try {
    await createAppointment({
      patientId: user.uid,
      therapistId: selectedTherapistId,
      start: slot.start,
      end: slot.end
    });

    alert("Cita reservada");
    await renderWeek();

  } catch (e) {
    console.error(e);
    alert("Error al reservar");
  }
}

/* =========================
   HELPERS
========================= */
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeek(date) {
  const end = addDays(date, 4);
  return `${date.toLocaleDateString()} – ${end.toLocaleDateString()}`;
}
