import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =====================================================
   CONFIGURACIÓN
===================================================== */

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
const LABELS = ["L","M","X","J","V","S","D"];

/* =====================================================
   DOM
===================================================== */

const grid = document.getElementById("grid");
const saveBtn = document.getElementById("save");

const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");
const todayWeek = document.getElementById("todayWeek");

/* =====================================================
   FECHAS
===================================================== */

function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  x.setHours(0,0,0,0);
  return x;
}

function formatWeekLabel(monday){
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

/* =====================================================
   STATE
===================================================== */

let baseDate = new Date();
let currentMonday = mondayOf(baseDate);
let weekKey = currentMonday.toISOString().slice(0,10);
let state = {};
let currentUser = null;

/* =====================================================
   HELPERS
===================================================== */

function norm(k){
  state[k] ??= false;
}

function isTodayInThisWeek(dayIndex){
  const today = new Date();
  const monday = currentMonday;

  const thisDay = new Date(monday);
  thisDay.setDate(monday.getDate() + dayIndex);

  return (
    today.getFullYear() === thisDay.getFullYear() &&
    today.getMonth() === thisDay.getMonth() &&
    today.getDate() === thisDay.getDate()
  );
}

/* =====================================================
   RENDER
===================================================== */

function render(hasAvailability=true){

  if (!grid) return;
  grid.innerHTML = "";

  const label = document.getElementById("weekLabel");
  if (label) label.textContent = formatWeekLabel(currentMonday);

  if(!hasAvailability){
    const hint = document.createElement("div");
    hint.className = "week-hint";
    hint.textContent = "No hay disponibilidad definida para esta semana";
    grid.appendChild(hint);
  }

  /* ===== CABECERA ===== */

  grid.appendChild(document.createElement("div"));

  LABELS.forEach((labelText, index)=>{
    const d = document.createElement("div");
    d.className = "day-label";

    if (isTodayInThisWeek(index)) {
      d.classList.add("today-column");
    }

    d.textContent = labelText;
    grid.appendChild(d);
  });

  /* ===== GRID ===== */

  TIME_SLOTS.forEach(time => {

    const hl = document.createElement("div");
    hl.className = "hour-label";
    hl.textContent = time;
    grid.appendChild(hl);

    DAYS.forEach((day, index) => {

      const key = `${day}_${time}`;
      norm(key);

      const cell = document.createElement("div");
      cell.className = "slot";

      if (isTodayInThisWeek(index)) {
        cell.classList.add("today-column");
      }

      const btn = document.createElement("button");
      btn.className = `mode ${state[key] ? "on" : ""}`;
      btn.textContent = state[key] ? "Disponible" : "";

      btn.onclick = () => {
        state[key] = !state[key];
        render(true);
      };

      cell.appendChild(btn);
      grid.appendChild(cell);
    });

  });
}

/* =====================================================
   LOAD
===================================================== */

async function loadWeek(){
  if(!currentUser) return;

  weekKey = currentMonday.toISOString().slice(0,10);
  state = {};

  const ref = doc(db,"availability",`${currentUser.uid}_${weekKey}`);
  const snap = await getDoc(ref);

  if(snap.exists()){
    Object.assign(state, snap.data().slots || {});
    render(true);
  } else {
    render(false);
  }
}

/* =====================================================
   SAVE
===================================================== */

async function saveWeek(){
  if(!currentUser) return;

  const ref = doc(db,"availability",`${currentUser.uid}_${weekKey}`);

  await setDoc(ref,{
    therapistId: currentUser.uid,
    weekStart: weekKey,
    slots: state,
    updatedAt: serverTimestamp()
  });

  alert("Disponibilidad guardada correctamente");
}

/* =====================================================
   NAV
===================================================== */

if (prevWeek) {
  prevWeek.onclick = () => {
    currentMonday.setDate(currentMonday.getDate() - 7);
    loadWeek();
  };
}

if (nextWeek) {
  nextWeek.onclick = () => {
    currentMonday.setDate(currentMonday.getDate() + 7);
    loadWeek();
  };
}

if (todayWeek) {
  todayWeek.onclick = () => {
    currentMonday = mondayOf(new Date());
    loadWeek();
  };
}

/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(auth, async user=>{
  if(!user) return;
  currentUser = user;
  await loadWeek();
  if (saveBtn) saveBtn.onclick = saveWeek;
});
