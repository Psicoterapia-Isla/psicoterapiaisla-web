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

const THERAPIST_ID = "LOSSPrBskLPpb547zED5hO2zYS62";

const START_HOUR = 9;
const END_HOUR = 20;
const SLOT_INTERVAL = 30;

let baseDate = new Date();

const agendaContainer = document.getElementById("agendaGrid");
const currentWeekLabel = document.getElementById("currentWeek");

const user = await requireAuth();

/* ===================== UTILIDADES ===================== */

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
  const [h,m] = start.split(":").map(Number);
  const date = new Date();
  date.setHours(h);
  date.setMinutes(m + SLOT_INTERVAL);
  return date.toTimeString().slice(0,5);
}

/* ===================== RENDER ===================== */

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

  days.forEach((day,i)=>{
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
      hourLabel.textContent=`${hour.toString().padStart(2,"0")}:${min===0?"00":"30"}`;
      agendaContainer.appendChild(hourLabel);

      for(let i=0;i<5;i++){

        const day = new Date(monday);
        day.setDate(monday.getDate()+i);
        const dateStr=formatDate(day);
        const start=`${hour.toString().padStart(2,"0")}:${min===0?"00":"30"}`;

        const slot=document.createElement("div");
        slot.className="slot";

        const isBusy=appointments.some(a=>a.date===dateStr && a.start===start);

        if(isBusy){
          slot.classList.add("busy");
        }else{
          slot.classList.add("available");

          slot.addEventListener("click", async ()=>{
            await addDoc(collection(db,"appointments"),{
              therapistId: THERAPIST_ID,
              patientId: user.uid,
              date: dateStr,
              start,
              end: calculateEnd(start),
              modality: "online",
              createdAt: serverTimestamp()
            });

            renderWeek(baseDate);
          });
        }

        agendaContainer.appendChild(slot);
      }
    }
  }
}

/* ===================== NAV ===================== */

document.getElementById("prev-week").onclick = ()=>{
  baseDate.setDate(baseDate.getDate()-7);
  renderWeek(baseDate);
};

document.getElementById("next-week").onclick = ()=>{
  baseDate.setDate(baseDate.getDate()+7);
  renderWeek(baseDate);
};

renderWeek(baseDate);
