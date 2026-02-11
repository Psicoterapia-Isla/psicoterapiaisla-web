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
   CONFIGURACIÓN HORARIA 30 MIN
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

function mondayOf(d) {
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  x.setHours(0,0,0,0);
  return x;
}

function formatDate(d) {
  return d.toISOString().slice(0,10);
}

function formatWeekLabel(monday) {
  const end = new Date(monday);
  end.setDate(end.getDate()+6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

function addMinutes(time, minutes) {
  const [h,m] = time.split(":").map(Number);
  const d = new Date(0,0,0,h,m+minutes);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

/* =========================
   AUTH + PERFIL
========================= */

auth.onAuthStateChanged(async user => {
  if (!user) return;
  currentUser = user;

  const pSnap = await getDocs(
    query(
      collection(db,"patients_normalized"),
      where("userId","==",user.uid)
    )
  );

  if (pSnap.empty) {
    alert("No se ha encontrado tu perfil de paciente");
    return;
  }

  const docData = pSnap.docs[0];
  patientProfile = { id: docData.id, ...docData.data() };

  const tSnap = await getDocs(collection(db,"therapists"));
  therapists = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderWeek();
});

/* =========================
   RENDER
========================= */

async function renderWeek() {

  if (!grid) return;
  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  if (weekLabel) weekLabel.textContent = formatWeekLabel(monday);

  const from = formatDate(monday);
  const to = formatDate(new Date(monday.getTime()+6*86400000));

  /* ===== DISPONIBILIDAD ===== */

  const availSnap = await getDocs(
    query(
      collection(db,"availability"),
      where("weekStart","==",from)
    )
  );

  const availability = {};
  availSnap.forEach(d=>{
    availability[d.data().therapistId] = d.data().slots || {};
  });

  /* ===== CITAS EXISTENTES ===== */

  const apptSnap = await getDocs(
    query(
      collection(db,"appointments"),
      where("date",">=",from),
      where("date","<=",to)
    )
  );

  const booked = {};
  apptSnap.forEach(d=>{
    const a = d.data();
    booked[`${a.therapistId}_${a.date}_${a.start}`] = true;
  });

  /* ===== CABECERA ===== */

  grid.appendChild(document.createElement("div"));

  DAYS.forEach((_,i)=>{
    const d = new Date(monday);
    d.setDate(d.getDate()+i);
    const el = document.createElement("div");
    el.className="day-label";
    el.textContent=d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(el);
  });

  /* ===== GRID MILIMÉTRICO ===== */

  TIME_SLOTS.forEach(time => {

    const hourLabel = document.createElement("div");
    hourLabel.className="hour-label";
    hourLabel.textContent=time;
    grid.appendChild(hourLabel);

    DAYS.forEach(day=>{

      const cell = document.createElement("div");
      cell.className="slot";

      const date = formatDate(
        new Date(monday.getTime()+DAYS.indexOf(day)*86400000)
      );

      const freeTherapists = [];

      therapists.forEach(t=>{

        const slotKey = `${day}_${time}`;
        const isAvailable = availability[t.id]?.[slotKey];
        const isBooked = booked[`${t.id}_${date}_${time}`];

        if (isAvailable && !isBooked) {
          freeTherapists.push(t.id);
        }

      });

      if (!freeTherapists.length) {
        cell.classList.add("disabled");
      } else {
        cell.classList.add("available");
        cell.textContent="Disponible";

        cell.onclick = () => createAppointment({
          date,
          start: time,
          freeTherapists
        });
      }

      grid.appendChild(cell);
    });

  });

}

/* =========================
   CREAR CITA SEGÚN TIPO
========================= */

async function createAppointment({ date, start, freeTherapists }) {

  let duration = 30;
  let therapistId = null;

  if (patientProfile.patientType === "private") {
    duration = 60;
  }

  /* 🔒 VALIDACIÓN 60 MIN */

  if (duration === 60) {

    const nextSlot = addMinutes(start,30);

    const hasSecondSlot = freeTherapists.some(t =>
      TIME_SLOTS.includes(nextSlot)
    );

    if (!hasSecondSlot) {
      alert("No hay disponibilidad completa de 60 minutos.");
      return;
    }
  }

  therapistId = freeTherapists[0];

  await addDoc(collection(db,"appointments"),{
    therapistId,
    patientId: patientProfile.id,
    patientName: `${patientProfile.nombre || ""} ${patientProfile.apellidos || ""}`.trim(),
    modality: "viladecans",
    date,
    start,
    end: addMinutes(start,duration),
    completed:false,
    paid:false,
    createdAt: Timestamp.now()
  });

  alert("Cita reservada correctamente");
  renderWeek();
}

/* =========================
   NAV
========================= */

if (prevWeek) {
  prevWeek.onclick = () => {
    baseDate.setDate(baseDate.getDate()-7);
    renderWeek();
  };
}

if (nextWeek) {
  nextWeek.onclick = () => {
    baseDate.setDate(baseDate.getDate()+7);
    renderWeek();
  };
}

if (todayBtn) {
  todayBtn.onclick = () => {
    baseDate = new Date();
    renderWeek();
  };
}
