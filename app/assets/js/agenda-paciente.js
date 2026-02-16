import { db } from "./firebase.js";
import { requireAuth } from "./auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

/* ================= CONFIG ================= */

const THERAPIST_ID = "LOSSPrBskLPpb547zED5hO2zYS62"; // fijo
const START_HOUR = 9;
const END_HOUR = 20;
const SLOT_INTERVAL = 30;

let baseDate = new Date();

const agendaContainer = document.getElementById("agendaGrid");
const currentWeekLabel = document.getElementById("currentWeek");

const user = await requireAuth();

/* ================= FUNCTIONS ================= */

const functions = getFunctions(undefined, "us-central1");
const createAppointment = httpsCallable(functions, "createAppointment");

/* ================= HELPERS ================= */

function getMonday(d){
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDate(date){
  return date.toISOString().split("T")[0];
}

function minutesOf(time){
  const [h,m] = time.split(":").map(Number);
  return h*60 + m;
}

function timeString(h,m){
  return `${String(h).padStart(2,"0")}:${m===0?"00":"30"}`;
}

/* ================= RENDER ================= */

async function renderWeek(date){

  agendaContainer.innerHTML = "";

  const monday = getMonday(date);

  currentWeekLabel.textContent =
    monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"}) +
    " - " +
    new Date(monday.getTime()+4*86400000)
      .toLocaleDateString("es-ES",{day:"numeric",month:"short"});

  const weekStart = formatDate(monday);
  const weekEnd = formatDate(new Date(monday.getTime()+4*86400000));

  /* 🔹 DISPONIBILIDAD TERAPEUTA */

  const availabilitySnap = await getDoc(
    doc(db,"availability",`${THERAPIST_ID}_${weekStart}`)
  );

  const availability = availabilitySnap.exists()
    ? availabilitySnap.data().slots || {}
    : {};

  /* 🔹 CITAS YA OCUPADAS (DE TODOS) */

  const snapshot = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",THERAPIST_ID),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const appointments = snapshot.docs.map(d=>d.data());

  /* HEADER */

  agendaContainer.appendChild(document.createElement("div"));

  const days = ["L","M","X","J","V"];

  days.forEach(day=>{
    const label=document.createElement("div");
    label.className="day-label";
    label.textContent=day;
    agendaContainer.appendChild(label);
  });

  /* GRID */

  for(let hour=START_HOUR; hour<END_HOUR; hour++){
    for(let min=0; min<60; min+=SLOT_INTERVAL){

      const hourLabel=document.createElement("div");
      hourLabel.className="hour-label";
      hourLabel.textContent=timeString(hour,min);
      agendaContainer.appendChild(hourLabel);

      for(let i=0;i<5;i++){

        const dayDate=new Date(monday);
        dayDate.setDate(monday.getDate()+i);

        const dateStr=formatDate(dayDate);
        const start=timeString(hour,min);
        const slotKey=`${["mon","tue","wed","thu","fri"][i]}_${hour}_${min}`;

        const slot=document.createElement("div");
        slot.className="slot";

        const isAvailable=availability[slotKey]===true;

        const isBusy=appointments.some(a=>{
          if(a.date!==dateStr) return false;
          const cur=hour*60+min;
          return cur>=minutesOf(a.start) && cur<minutesOf(a.end);
        });

        if(!isAvailable){
          slot.classList.add("disabled");
        }
        else if(isBusy){
          slot.classList.add("busy");
        }
        else{

          slot.classList.add("available");

          slot.addEventListener("click", async ()=>{

            try{

              slot.style.pointerEvents="none";
              slot.classList.add("loading");

              const endDate=new Date(0,0,0,hour,min);
              endDate.setMinutes(endDate.getMinutes()+30);

              await createAppointment({
                therapistId: THERAPIST_ID,
                date: dateStr,
                start,
                end: endDate.toTimeString().slice(0,5),
                modality: "online"
              });

              await renderWeek(baseDate);

            }catch(error){

              console.error("Error creando cita:", error);

              alert(
                error?.message ||
                "No se ha podido reservar el horario."
              );

              slot.style.pointerEvents="auto";
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

document.getElementById("prev-week").onclick=()=>{
  baseDate.setDate(baseDate.getDate()-7);
  renderWeek(baseDate);
};

document.getElementById("next-week").onclick=()=>{
  baseDate.setDate(baseDate.getDate()+7);
  renderWeek(baseDate);
};

/* ================= START ================= */

renderWeek(baseDate);
