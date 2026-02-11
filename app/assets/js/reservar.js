import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= CONFIG ================= */

const START_HOUR = 9;
const END_HOUR = 21;

function generateSlots() {
  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(`${String(h).padStart(2,"0")}:00`);
    slots.push(`${String(h).padStart(2,"0")}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateSlots();
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];

/* ================= DOM ================= */

const grid = document.getElementById("agendaGrid");
const weekLabel = document.getElementById("weekLabel");
const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");
const todayBtn = document.getElementById("today");

/* ================= STATE ================= */

let baseDate = new Date();
let currentUser = null;
let patientProfile = null;
let therapists = [];
let availabilityCache = {};
let weeklyAppointments = [];

/* ================= DATE HELPERS ================= */

function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay()+6)%7;
  x.setDate(x.getDate()-n);
  x.setHours(0,0,0,0);
  return x;
}

function formatDate(d){
  return d.toISOString().slice(0,10);
}

function formatWeekLabel(monday){
  const end = new Date(monday);
  end.setDate(end.getDate()+6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

function addMinutes(time, minutes){
  const [h,m] = time.split(":").map(Number);
  const d = new Date(0,0,0,h,m+minutes);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function timeToMinutes(t){
  const [h,m] = t.split(":").map(Number);
  return h*60+m;
}

/* ================= AUTH ================= */

auth.onAuthStateChanged(async user=>{
  if(!user) return;

  currentUser = user;

  const pSnap = await getDocs(
    query(collection(db,"patients_normalized"),
    where("userId","==",user.uid))
  );

  if(pSnap.empty){
    alert("No se ha encontrado tu perfil de paciente");
    return;
  }

  const docData = pSnap.docs[0];
  patientProfile = { id: docData.id, ...docData.data() };

  const tSnap = await getDocs(collection(db,"therapists"));
  therapists = tSnap.docs.map(d=>({ id:d.id, ...d.data() }));

  await renderWeek();
});

/* ================= LOAD WEEK DATA ================= */

async function loadWeekData(monday){

  const from = formatDate(monday);
  const to = formatDate(new Date(monday.getTime()+6*86400000));

  /* DISPONIBILIDAD */

  const availSnap = await getDocs(
    query(collection(db,"availability"),
    where("weekStart","==",from))
  );

  availabilityCache = {};
  availSnap.forEach(d=>{
    availabilityCache[d.data().therapistId] = d.data().slots || {};
  });

  /* CITAS */

  const apptSnap = await getDocs(
    query(collection(db,"appointments"),
    where("date",">=",from),
    where("date","<=",to))
  );

  weeklyAppointments = [];
  apptSnap.forEach(d=>{
    weeklyAppointments.push({ id:d.id, ...d.data() });
  });
}

/* ================= RENDER ================= */

async function renderWeek(){

  if(!grid) return;

  grid.innerHTML = "";

  const monday = mondayOf(baseDate);

  if(weekLabel){
    weekLabel.textContent = formatWeekLabel(monday);
  }

  await loadWeekData(monday);

  /* HEADER */

  grid.appendChild(document.createElement("div"));

  DAYS.forEach((_,i)=>{
    const d = new Date(monday);
    d.setDate(d.getDate()+i);

    const el = document.createElement("div");
    el.className="day-label";
    el.textContent=d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(el);
  });

  /* GRID */

  TIME_SLOTS.forEach(time=>{

    const hourLabel = document.createElement("div");
    hourLabel.className="hour-label";
    hourLabel.textContent=time;
    grid.appendChild(hourLabel);

    DAYS.forEach((day,dayIndex)=>{

      const date = formatDate(
        new Date(monday.getTime()+dayIndex*86400000)
      );

      const cell = document.createElement("div");
      cell.className="slot";

      const slotKey = `${day}_${time.replace(":","_")}`;
      const currentMin = timeToMinutes(time);

      const freeTherapists = therapists.filter(t=>{

        const therapistSlots = availabilityCache[t.id] || {};

        if(!therapistSlots[slotKey]) return false;

        const conflict = weeklyAppointments.some(a=>{
          if(a.therapistId !== t.id) return false;
          if(a.date !== date) return false;

          const startMin = timeToMinutes(a.start);
          const endMin = timeToMinutes(a.end);

          return currentMin >= startMin && currentMin < endMin;
        });

        return !conflict;
      });

      if(!freeTherapists.length){
        cell.classList.add("disabled");
      }else{
        cell.classList.add("available");
        cell.textContent="Disponible";
        cell.onclick = ()=>createAppointment({
          date,
          start: time,
          therapistsAvailable: freeTherapists,
          dayKey: day
        });
      }

      grid.appendChild(cell);
    });
  });
}

/* ================= CREATE APPOINTMENT ================= */

async function createAppointment({ date, start, therapistsAvailable, dayKey }){

  const duration =
    patientProfile.patientType === "private" ? 60 : 30;

  const end = addMinutes(start,duration);

  for(const therapist of therapistsAvailable){

    const therapistSlots = availabilityCache[therapist.id] || {};

    /* VALIDAR SEGUNDA MEDIA HORA SI ES 60 */

    if(duration === 60){

      const nextSlot = addMinutes(start,30);

      const slotKey1 = `${dayKey}_${start.replace(":","_")}`;
      const slotKey2 = `${dayKey}_${nextSlot.replace(":","_")}`;

      if(!therapistSlots[slotKey1] || !therapistSlots[slotKey2]){
        continue;
      }

      /* VALIDAR QUE NO HAYA CONFLICTO EN SEGUNDA MEDIA HORA */

      const nextMin = timeToMinutes(nextSlot);

      const conflictSecondHalf = weeklyAppointments.some(a=>{
        if(a.therapistId !== therapist.id) return false;
        if(a.date !== date) return false;

        const startMin = timeToMinutes(a.start);
        const endMin = timeToMinutes(a.end);

        return nextMin >= startMin && nextMin < endMin;
      });

      if(conflictSecondHalf){
        continue;
      }
    }

    /* CREAR CITA */

    await addDoc(collection(db,"appointments"),{
      therapistId: therapist.id,
      patientId: patientProfile.id,
      patientName: `${patientProfile.nombre || ""} ${patientProfile.apellidos || ""}`.trim(),
      modality: "viladecans",
      date,
      start,
      end,
      completed:false,
      paid:false,
      createdAt: Timestamp.now()
    });

    alert("Cita reservada correctamente");
    await renderWeek();
    return;
  }

  alert("No hay disponibilidad completa para esa duración.");
}

/* ================= NAV ================= */

if(prevWeek){
  prevWeek.onclick=()=>{
    baseDate.setDate(baseDate.getDate()-7);
    renderWeek();
  };
}

if(nextWeek){
  nextWeek.onclick=()=>{
    baseDate.setDate(baseDate.getDate()+7);
    renderWeek();
  };
}

if(todayBtn){
  todayBtn.onclick=()=>{
    baseDate=new Date();
    renderWeek();
  };
}
