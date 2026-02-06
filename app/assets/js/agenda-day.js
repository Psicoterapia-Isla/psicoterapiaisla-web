// app/assets/js/agenda-day.js

import { auth, db } from "./firebase.js";
import { getAgendaForDay } from "./agendaFirestore.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ======================
   CONFIG
====================== */
const agendaDay = document.getElementById("agendaDay");

const START_HOUR = 9;
const END_HOUR = 21;
const today = new Date().toISOString().split("T")[0];

/* ======================
   INIT (auth YA resuelto)
====================== */
const user = auth.currentUser;

if (!user) {
  console.error("Usuario no disponible en agenda-day.js");
  throw new Error("Auth no resuelto");
}

const therapistId = user.uid;

/* ======================
   LOAD + RENDER
====================== */
loadDay();

async function loadDay() {
  const slots = await getAgendaForDay({
    therapistId,
    date: today
  });

  renderAgenda({ therapistId, slots });
}

/* ======================
   RENDER AGENDA
====================== */
function renderAgenda({ therapistId, slots }) {
  agendaDay.innerHTML = "";

  for (let hour = START_HOUR; hour < END_HOUR; hour++) {

    const availability = slots[hour];

    let status = "blocked";
    let label = "Bloqueado";
    let location = "";

    if (availability) {
      status = "available";
      label = "Disponible";
      location = availability.location || "";
    }

    const slot = document.createElement("div");
    slot.className = `time-slot ${status}`;

    slot.innerHTML = `
      <div class="slot-hour">${hour}:00</div>
      <div class="slot-body">
        <div>${label}</div>
        <div class="location">${location}</div>
      </div>
    `;

    slot.addEventListener("click", async () => {

      // 🔴 → 🟢
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

      // 🟢 → 🔴
      if (availability) {
        await deleteDoc(doc(db, "agenda_slots", availability.id));
      }

      await loadDay();
    });

    agendaDay.appendChild(slot);
  }
}
