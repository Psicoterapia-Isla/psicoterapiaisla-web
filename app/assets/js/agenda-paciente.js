import { db } from "./firebase.js";
import { requireAuth } from "./auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

await requireAuth();

const THERAPIST_ID = "LOSSPrBskLPpb547zED5hO2zYS62";

const agendaContainer = document.getElementById("agendaGrid");
const currentWeekLabel = document.getElementById("currentWeek");

const user = await new Promise(resolve => {
  import("./firebase.js").then(mod => {
    mod.auth.onAuthStateChanged(u => resolve(u));
  });
});

if (!user) {
  window.location.href = "index.html";
}

/* =============================
   CONFIGURACIÓN HORARIA
============================= */

const START_HOUR = 9;
const END_HOUR = 20;
const SLOT_INTERVAL = 30;

/* =============================
   UTILIDADES FECHA
============================= */

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/* =============================
   RENDER SEMANA
============================= */

async function renderWeek(date) {

  agendaContainer.innerHTML = "";

  const monday = getMonday(date);

  currentWeekLabel.textContent =
    monday.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

  const appointmentsRef = collection(db, "appointments");

  const q = query(
    appointmentsRef,
    where("therapistId", "==", THERAPIST_ID)
  );

  const snapshot = await getDocs(q);

  const appointments = snapshot.docs.map(doc => doc.data());

  for (let i = 0; i < 5; i++) {

    const day = new Date(monday);
    day.setDate(monday.getDate() + i);

    const dateStr = formatDate(day);

    for (let hour = START_HOUR; hour < END_HOUR; hour++) {

      for (let min = 0; min < 60; min += SLOT_INTERVAL) {

        const start = `${hour.toString().padStart(2,"0")}:${min === 0 ? "00" : "30"}`;

        const slot = document.createElement("div");
        slot.className = "slot";

        const isBusy = appointments.some(a =>
          a.date === dateStr && a.start === start
        );

        if (isBusy) {
          slot.classList.add("busy");
        } else {
          slot.classList.add("available");

          slot.addEventListener("click", async () => {

            await addDoc(collection(db, "appointments"), {
              therapistId: THERAPIST_ID,
              patientId: user.uid,
              date: dateStr,
              start,
              end: calculateEnd(start),
              modality: "online",
              createdAt: serverTimestamp()
            });

            renderWeek(date);
          });
        }

        agendaContainer.appendChild(slot);
      }
    }
  }
}

/* =============================
   CALCULAR FIN
============================= */

function calculateEnd(start) {

  const [h,m] = start.split(":").map(Number);

  const date = new Date();
  date.setHours(h);
  date.setMinutes(m + SLOT_INTERVAL);

  return date.toTimeString().slice(0,5);
}

/* =============================
   INIT
============================= */

renderWeek(new Date());
