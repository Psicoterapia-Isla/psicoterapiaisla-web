// app/assets/js/agenda-week.js

import { auth } from "./firebase.js";
import { getAgendaForDay } from "./agendaFirestore.js";

const weekDaysEl = document.getElementById("weekDays");
const previewEl = document.getElementById("slotsPreview");

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const today = new Date();

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const therapistId = user.uid;
  renderWeek(therapistId);
});

/* ======================
   SEMANA
====================== */
async function renderWeek(therapistId) {
  weekDaysEl.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const iso = date.toISOString().split("T")[0];
    const pill = document.createElement("div");

    pill.className = "day-pill";
    if (i === 0) pill.classList.add("active");

    pill.innerHTML = `
      <div>${DAYS[date.getDay()]}</div>
      <div>${date.getDate()}/${date.getMonth() + 1}</div>
    `;

    pill.addEventListener("click", async () => {
      document
        .querySelectorAll(".day-pill")
        .forEach(p => p.classList.remove("active"));

      pill.classList.add("active");

      await loadPreview({
        therapistId,
        date: iso
      });
    });

    weekDaysEl.appendChild(pill);

    if (i === 0) {
      await loadPreview({ therapistId, date: iso });
    }
  }
}

/* ======================
   PREVIEW DÍA
====================== */
async function loadPreview({ therapistId, date }) {
  previewEl.innerHTML = "Cargando…";

  const { slots, appointments } = await getAgendaForDay({
    therapistId,
    date
  });

  previewEl.innerHTML = "";

  for (let hour = 9; hour < 21; hour++) {
    let status = "blocked";
    let label = "Bloqueado";

    if (slots[hour]) {
      status = "available";
      label = "Disponible";
    }

    const appt = appointments.find(a =>
      new Date(a.start.toDate()).getHours() === hour
    );

    if (appt) {
      status = appt.status === "completed" ? "done" : "reserved";
      label = appt.status === "completed"
        ? "Sesión realizada"
        : "Reservado";
    }

    const row = document.createElement("div");
    row.className = `slot-mini ${status}`;
    row.textContent = `${hour}:00 — ${label}`;

    previewEl.appendChild(row);
  }
}
