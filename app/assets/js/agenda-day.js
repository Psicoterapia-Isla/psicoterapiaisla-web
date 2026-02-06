// app/assets/js/agenda-day.js

import { auth, db } from "./firebase.js";
import { getAgendaForDay } from "./agendaFirestore.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const agendaDay = document.getElementById("agendaDay");

const START_HOUR = 9;
const END_HOUR = 21;
const today = new Date().toISOString().split("T")[0];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const therapistId = user.uid;

  const data = await getAgendaForDay({
    therapistId,
    date: today
  });

  renderAgenda({
    therapistId,
    ...data
  });
});

/* ======================
   RENDER AGENDA
====================== */
function renderAgenda({ therapistId, slots, appointments }) {
  agendaDay.innerHTML = "";

  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    const slotHour = `${hour}:00`;

    const slot = document.createElement("div");
    slot.classList.add("time-slot");

    const availability = slots[hour];
    const appointment = appointments.find(a =>
      new Date(a.start.toDate()).getHours() === hour
    );

    let status = "blocked";
    let label = "Bloqueado";
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
    }

    slot.classList.add(status);

    slot.innerHTML = `
      <div class="slot-hour">${slotHour}</div>
      <div class="slot-body">
        <div>${label}</div>
        <div class="location">${location}</div>
      </div>
    `;

    /* ======================
       CLICK EN SLOT
    ====================== */
    slot.addEventListener("click", async () => {

      // ❌ Citas no se tocan
      if (status === "reserved" || status === "done") return;

      // 🔴 → 🟢 CREAR DISPONIBILIDAD
      if (!availability) {
        await addDoc(collection(db, "agenda_slots"), {
          therapistId,
          date: today,
          hour,
          start: new Date(`${today}T${hour}:00`),
          end: new Date(`${today}T${hour + 1}:00`),
          location: "Consulta",
          createdAt: serverTimestamp()
        });
      }

      // 🟢 → 🔴 BORRAR DISPONIBILIDAD
      if (availability) {
        await deleteDoc(doc(db, "agenda_slots", availability.id));
      }

      // 🔄 Recargar día
      const refreshed = await getAgendaForDay({
        therapistId,
        date: today
      });

      renderAgenda({
        therapistId,
        ...refreshed
      });
    });

    agendaDay.appendChild(slot);
  }
}
