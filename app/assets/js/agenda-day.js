// app/assets/js/agenda-day.js

import { auth } from "./firebase.js";
import { getAgendaForDay } from "./agendaFirestore.js";

const agendaDay = document.getElementById("agendaDay");

// 9–21
const BASE_HOURS = [...Array(13)].map((_, i) => i + 9);

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const therapistId = user.uid;
  const today = new Date().toISOString().slice(0, 10);

  const { slots, appointments } = await getAgendaForDay({
    therapistId,
    date: today
  });

  renderAgenda(slots, appointments);
});

function renderAgenda(slots, appointments) {

  agendaDay.innerHTML = "";

  BASE_HOURS.forEach(hour => {

    const slotStart = `${hour}:00`;

    const slot = slots.find(s =>
      new Date(s.start.seconds * 1000).getHours() === hour
    );

    const appointment = appointments.find(a =>
      new Date(a.start.seconds * 1000).getHours() === hour
    );

    let status = "blocked";
    let label = "No disponible";
    let location = "";

    if (slot) {
      status = "available";
      label = "Disponible";
      location = slot.location || "";
    }

    if (appointment) {
      status = appointment.status === "completed"
        ? "done"
        : "reserved";

      label = appointment.status === "completed"
        ? "Sesión realizada"
        : "Reservada";
    }

    const div = document.createElement("div");
    div.className = `time-slot ${status}`;

    div.innerHTML = `
      <div class="slot-hour">${hour}:00</div>
      <div class="slot-body">
        <div>${label}</div>
        <div class="location">${location}</div>
      </div>
    `;

    agendaDay.appendChild(div);
  });
}
