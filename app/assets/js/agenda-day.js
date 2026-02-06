// app/assets/js/agenda-day.js

import { auth } from "./firebase.js";
import { getAgendaForDay } from "./agendaFirestore.js";

const agendaDay = document.getElementById("agendaDay");

// Configuración base
const START_HOUR = 9;
const END_HOUR = 21;
const SLOT_MINUTES = 60;

// Fecha actual (YYYY-MM-DD)
const today = new Date().toISOString().split("T")[0];

// Esperar auth real
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const therapistId = user.uid;

  const { slots, appointments } = await getAgendaForDay({
    therapistId,
    date: today
  });

  renderAgenda({
    slots,
    appointments
  });
});

/* ======================
   RENDER AGENDA
====================== */
function renderAgenda({ slots, appointments }) {
  agendaDay.innerHTML = "";

  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    const slotDate = `${hour}:00`;

    const slot = document.createElement("div");
    slot.classList.add("time-slot");

    const availability = slots.find(s =>
      new Date(s.start.toDate()).getHours() === hour
    );

    const appointment = appointments.find(a =>
      new Date(a.start.toDate()).getHours() === hour
    );

    let status = "blocked";
    let label = "No disponible";
    let location = "";

    if (availability) {
      status = "available";
      label = "Disponible";
      location = availability.location || "";
    }

    if (appointment) {
      status = appointment.status === "completed"
        ? "done"
        : "reserved";

      label = appointment.status === "completed"
        ? "Sesión realizada"
        : "Reservado";

      location = appointment.location || "";
    }

    slot.classList.add(status);

    slot.innerHTML = `
      <div class="slot-hour">${slotDate}</div>
      <div class="slot-body">
        <div>${label}</div>
        <div class="location">${location}</div>
      </div>
    `;

    slot.addEventListener("click", () => {
      console.log("Slot:", {
        hour,
        availability,
        appointment
      });
    });

    agendaDay.appendChild(slot);
  }
}
