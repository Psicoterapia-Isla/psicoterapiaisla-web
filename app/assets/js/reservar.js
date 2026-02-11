import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   CONFIGURACIÓN HORARIA
========================= */

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

/* =========================
   DOM
========================= */

const grid = document.getElementById("agendaGrid");
const weekLabel = document.getElementById("weekLabel");

const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");
const todayBtn = document.getElementById("today");

/* =========================
   STATE
========================= */

let baseDate = new Date();
let currentUser = null;
let patientProfile = null;
let therapists = [];

/* =========================
   FECHAS
========================= */

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

/* =========================
   AUTH + PERFIL
========================= */

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

  renderWeek();
});

/* =========================
   RENDER
========================= */

async function renderWeek(){

  if(!grid) return;

  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  if(weekLabel) weekLabel.textContent = formatWeekLabel(monday);

  const from = formatDate(monday);
  const to = formatDate(new Date(monday.getTime()+6*86400000));

  /* DISPONIBILIDAD */
  const availSnap = await getDocs(
    query(collection(db,"availability"),
    where("weekStart","==",from))
  );

  const availability = {};
  availSnap.forEach(d=>{
    availability[d.data().therapistId] = d.data().slots || {};
  });

  /* CITAS */
  const apptSnap = await getDocs(
    query(collection(db,"appointments"),
    where("date",">=",from),
    where("date","<=",to))
  );

  const appointments = [];
  apptSnap.forEach(d=>{
    appointments.push({ id:d.id, ...d.data() });
  });

  /* CABECERA */
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

    DAYS.forEach(day=>{

      const date = formatDate(
        new Date(monday.getTime()+DAYS.indexOf(day)*86400000)
      );

      const cell = document.createElement("div");
      cell.className="slot";

      const freeTherapists = therapists.filter(t=>{

        const slotKey = `${day}_${time.replace(":","_")}`;

        const isAvailable = availability[t.id]?.[slotKey];

        if(!isAvailable) return false;

        const currentMin = timeToMinutes(time);

        const conflict = appointments.some(a=>{
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
          therapistsAvailable: freeTherapists
        });
      }

      grid.appendChild(cell);
    });
  });
}

/* =========================
   CREAR CITA SEGURA
========================= */

async function createAppointment({ date, start, therapistsAvailable }){

  const duration =
    patientProfile.patientType === "private" ? 60 : 30;

  const end = addMinutes(start,duration);

  for(const therapistId of therapistsAvailable){

    if(duration === 60){

      const nextSlot = addMinutes(start,30);
      const nextKey = nextSlot.replace(":","_");

      const monday = mondayOf(baseDate);
      const dayIndex = DAYS.indexOf(
        new Date(date).toLocaleDateString("en-US",{weekday:"short"}).toLowerCase().slice(0,3)
      );

      const slotKey1 = `${DAYS[dayIndex]}_${start.replace(":","_")}`;
      const slotKey2 = `${DAYS[dayIndex]}_${nextKey}`;

      const availSnap = await getDocs(
        query(collection(db,"availability"),
        where("therapistId","==",therapistId),
        where("weekStart","==",formatDate(monday)))
      );

      let slots = {};
      availSnap.forEach(d=>slots=d.data().slots||{});

      if(!slots[slotKey1] || !slots[slotKey2]){
        continue;
      }
    }

    await addDoc(collection(db,"appointments"),{
      therapistId,
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
    renderWeek();
    return;
  }

  alert("No hay disponibilidad completa para esa duración.");
}

/* =========================
   NAV
========================= */

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
