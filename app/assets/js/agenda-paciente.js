import { db } from "./firebase.js";
import { requireAuth } from "./auth.js";
import { getActiveClinicId } from "./clinic-context.js";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

/* ================= INIT ================= */

const user = await requireAuth();
const clinicId = await getActiveClinicId();

if (!clinicId) {
  alert("No hay clínica activa");
  throw new Error("clinicId missing");
}

/* ================= CONFIG ================= */

const THERAPIST_ID = "LOSSPrBskLPpb547zED5hO2zYS62"; // Ajustable dinámico después
const START_HOUR = 9;
const END_HOUR = 20;
const SLOT_INTERVAL = 30;

let baseDate = new Date();

const agendaContainer = document.getElementById("agendaGrid");
const currentWeekLabel = document.getElementById("currentWeek");

/* ================= CLOUD FUNCTION ================= */

const functions = getFunctions(undefined, "us-central1");
const createAppointment = httpsCallable(functions, "createAppointment");

/* ================= UTILIDADES ================= */

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function calculateEnd(start) {
  const [h, m] = start.split(":").map(Number);
  const date = new Date();
  date.setHours(h);
  date.setMinutes(m + SLOT_INTERVAL);
  return date.toTimeString().slice(0, 5);
}

/* ================= RENDER ================= */

async function renderWeek(date) {

  agendaContainer.innerHTML = "";

  const monday = getMonday(date);

  currentWeekLabel.textContent =
    monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"}) +
    " - " +
    new Date(monday.getTime() + 4*86400000)
      .toLocaleDateString("es-ES",{day:"numeric",month:"short"});

  const weekStart = formatDate(monday);
  const weekEnd = formatDate(new Date(monday.getTime()+4*86400000));

  /* 🔒 Solo mis citas */
  const mySnapshot = await getDocs(query(
    collection(db,"clinics",clinicId,"appointments"),
    where("patientId","==",user.uid),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const myAppointments = mySnapshot.docs.map(d=>d.data());

  /* 📅 Citas del terapeuta (para bloquear ocupados) */
  const therapistSnapshot = await getDocs(query(
    collection(db,"clinics",clinicId,"appointments"),
    where("therapistId","==",THERAPIST_ID),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const allAppointments = therapistSnapshot.docs.map(d=>d.data());

  /* 📅 Disponibilidad */
  const availabilitySnap = await getDoc(
    doc(db,"clinics",clinicId,"availability",`${THERAPIST_ID}_${weekStart}`)
  );

  const availability = availabilitySnap.exists()
    ? availabilitySnap.data().slots || {}
    : {};

  /* HEADER */

  agendaContainer.appendChild(document.createElement("div"));

  const days = ["L","M","X","J","V"];

  days.forEach(day=>{
    const label = document.createElement("div");
    label.className="day-label";
    label.textContent=day;
    agendaContainer.appendChild(label);
  });

  /* SLOTS */

  for(let hour=START_HOUR; hour<END_HOUR; hour++){
    for(let min=0; min<60; min+=SLOT_INTERVAL){

      const hourLabel=document.createElement("div");
      hourLabel.className="hour-label";
      hourLabel.textContent=
        `${hour.toString().padStart(2,"0")}:${min===0?"00":"30"}`;
      agendaContainer.appendChild(hourLabel);

      for(let i=0;i<5;i++){

        const day = new Date(monday);
        day.setDate(monday.getDate()+i);

        const dateStr=formatDate(day);
        const start=`${hour.toString().padStart(2,"0")}:${min===0?"00":"30"}`;
        const slotKey=`${["mon","tue","wed","thu","fri"][i]}_${hour}_${min}`;

        const slot=document.createElement("div");
        slot.className="slot";

        const isMine = myAppointments.some(
          a=>a.date===dateStr && a.start===start
        );

        const isBooked = allAppointments.some(
          a=>a.date===dateStr && a.start===start
        );

        const isAvailable = availability[slotKey] === true;

        if(isMine){

          slot.classList.add("busy");

        } else if(!isAvailable || isBooked){

          slot.classList.add("disabled");

        } else {

          slot.classList.add("available");

          slot.addEventListener("click", async ()=>{

            try {

              slot.style.pointerEvents = "none";
              slot.classList.add("loading");

              await createAppointment({
                clinicId,
                therapistId: THERAPIST_ID,
                date: dateStr,
                start,
                end: calculateEnd(start),
                modality: "online"
              });

              await renderWeek(baseDate);

            } catch (error) {

              console.error("Error creando cita:", error);

              alert(
                error?.message ||
                "No se ha podido reservar el horario."
              );

              slot.style.pointerEvents = "auto";
              slot.classList.remove("loading");
            }

          });
        }

        agendaContainer.appendChild(slot);
      }
    }
  }
}

/* ================= NAV ================= */

document.getElementById("prev-week").onclick = ()=>{
  baseDate.setDate(baseDate.getDate()-7);
  renderWeek(baseDate);
};

document.getElementById("next-week").onclick = ()=>{
  baseDate.setDate(baseDate.getDate()+7);
  renderWeek(baseDate);
};

renderWeek(baseDate);
