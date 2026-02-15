import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= INIT ================= */

await requireAuth();
await loadMenu();

/* ================= STATE ================= */

let baseDate = new Date();
const grid = document.getElementById("agendaGrid");
const weekLabel = document.getElementById("weekLabel");

/* ================= CONFIG ================= */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];
const DAYS = ["mon","tue","wed","thu","fri"];

/* ================= HELPERS ================= */

const pad = n => String(n).padStart(2,"0");

function formatDate(d){
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay()+6)%7;
  x.setDate(x.getDate()-n);
  x.setHours(0,0,0,0);
  return x;
}

function dayFromKey(monday,key){
  const d = new Date(monday);
  d.setDate(d.getDate()+DAYS.indexOf(key));
  return d;
}

function timeString(h,m){
  return `${pad(h)}:${pad(m)}`;
}

function minutesOf(time){
  const [h,m] = time.split(":").map(Number);
  return h*60 + m;
}

/* ================= CREATE APPOINTMENT ================= */

async function createAppointment(date, hour, minute){

  const user = auth.currentUser;
  if(!user) return;

  const start = timeString(hour, minute);
  const endDate = new Date(0,0,0,hour,minute);
  endDate.setMinutes(endDate.getMinutes() + 60);
  const end = timeString(endDate.getHours(), endDate.getMinutes());

  await addDoc(collection(db,"appointments"),{
    therapistId: "THERAPIST_ID_AQUI", // ⚠️ Sustituir por el id real fijo del terapeuta
    patientId: user.uid,
    date,
    start,
    end,
    modality: "online",
    completed: false,
    paid: false,
    createdAt: Timestamp.now()
  });

  await renderWeek();
}

/* ================= RENDER ================= */

async function renderWeek(){

  if(!grid) return;

  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  const weekStart = formatDate(monday);
  const weekEnd = formatDate(new Date(monday.getTime()+4*86400000));

  if(weekLabel){
    weekLabel.textContent =
      monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"}) +
      " – " +
      new Date(monday.getTime()+4*86400000)
        .toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"});
  }

  const user = auth.currentUser;
  if(!user) return;

  /* Leer TODAS las citas de la semana */
  const apptSnap = await getDocs(query(
    collection(db,"appointments"),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const appointments = [];
  apptSnap.forEach(d=>appointments.push(d.data()));

  grid.appendChild(document.createElement("div"));

  DAYS.forEach((_,i)=>{
    const d = new Date(monday);
    d.setDate(d.getDate()+i);
    const h = document.createElement("div");
    h.className="day-label";
    h.textContent = d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(h);
  });

  HOURS.forEach(hour=>{
    MINUTES.forEach(minute=>{

      const label=document.createElement("div");
      label.className="hour-label";
      label.textContent=timeString(hour,minute);
      grid.appendChild(label);

      DAYS.forEach(day=>{

        const date=formatDate(dayFromKey(monday,day));
        const cell=document.createElement("div");
        cell.className="slot";

        const appointment = appointments.find(a=>{
          if(a.date !== date) return false;
          const cur=hour*60+minute;
          return cur>=minutesOf(a.start) && cur<minutesOf(a.end);
        });

        if(appointment){

          if(appointment.patientId === user.uid){
            cell.classList.add("busy");
            cell.innerHTML = `<strong>Tu cita</strong>`;
          } else {
            cell.classList.add("busy");
            cell.innerHTML = `<span>Ocupado</span>`;
          }

        } else {

          cell.classList.add("available");
          cell.innerHTML = `<span>Disponible</span>`;
          cell.onclick = () => createAppointment(date,hour,minute);
        }

        grid.appendChild(cell);
      });

    });
  });
}

/* ================= NAV ================= */

document.getElementById("prevWeek")?.addEventListener("click",()=>{
  baseDate.setDate(baseDate.getDate()-7);
  renderWeek();
});

document.getElementById("nextWeek")?.addEventListener("click",()=>{
  baseDate.setDate(baseDate.getDate()+7);
  renderWeek();
});

document.getElementById("today")?.addEventListener("click",()=>{
  baseDate=new Date();
  renderWeek();
});

renderWeek();
