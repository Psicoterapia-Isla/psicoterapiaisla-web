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

/* =========================
   CONSTANTES
========================= */

const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const LABELS = ["L","M","X","J","V","S","D"];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];

/* =========================
   DOM
========================= */

const grid = document.getElementById("grid");
const saveBtn = document.getElementById("save");

const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");
const todayWeek = document.getElementById("todayWeek");
const weekLabel = document.getElementById("weekLabel");

/* =========================
   STATE
========================= */

let baseDate = new Date();
let currentMonday = mondayOf(baseDate);
let weekKey = formatDate(currentMonday);

let state = {};      // slots
let locations = {};  // NUEVO: config por día
let currentUser = null;

/* =========================
   FECHAS
========================= */

function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  x.setHours(0,0,0,0);
  return x;
}

function formatDate(d){
  return d.toISOString().slice(0,10);
}

function pad(n){
  return String(n).padStart(2,"0");
}

function formatWeekLabel(monday){
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})}
   – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

/* =========================
   TOGGLE SLOT
========================= */

function toggleSlot(key, cell){

  if(state[key]){
    delete state[key];
    cell.classList.remove("available");
  } else {
    state[key] = true;
    cell.classList.add("available");
  }
}

/* =========================
   CAMBIAR SEDE POR DÍA
========================= */

function cycleLocation(day){

  const current = locations[day]?.base || "viladecans";

  const next =
    current === "viladecans"
      ? "badalona"
      : current === "badalona"
        ? "online"
        : "viladecans";

  if(!locations[day]) locations[day] = {};

  locations[day].base = next;

  render();
}

/* =========================
   RENDER
========================= */

function render(){

  grid.innerHTML = "";

  if(weekLabel){
    weekLabel.textContent = formatWeekLabel(currentMonday);
  }

  grid.appendChild(document.createElement("div"));

  LABELS.forEach((label,i)=>{

    const dayKey = DAYS[i];

    const dayCell = document.createElement("div");
    dayCell.className = "day-label";

    const base = locations[dayKey]?.base || "viladecans";

    dayCell.innerHTML = `
      <div>${label}</div>
      <small style="cursor:pointer;font-weight:500;">
        ${base}
      </small>
    `;

    dayCell.querySelector("small").onclick = () =>
      cycleLocation(dayKey);

    grid.appendChild(dayCell);
  });

  HOURS.forEach(hour=>{
    MINUTES.forEach(minute=>{

      const hourLabel = document.createElement("div");
      hourLabel.className = "hour-label";
      hourLabel.textContent = `${pad(hour)}:${pad(minute)}`;
      grid.appendChild(hourLabel);

      DAYS.forEach(day=>{

        const key = `${day}_${hour}_${minute}`;
        const cell = document.createElement("div");
        cell.className = "slot";

        if(state[key]){
          cell.classList.add("available");
        }

        cell.addEventListener("click", ()=>{
          toggleSlot(key, cell);
        });

        grid.appendChild(cell);
      });

    });
  });
}

/* =========================
   LOAD / SAVE
========================= */

async function loadWeek(){

  if(!currentUser) return;

  weekKey = formatDate(currentMonday);
  state = {};
  locations = {};

  const ref = doc(db,"availability",`${currentUser.uid}_${weekKey}`);
  const snap = await getDoc(ref);

  if(snap.exists()){
    const data = snap.data();

    if(data.slots) state = data.slots;
    if(data.locations) locations = data.locations;
  }

  render();
}

async function saveWeek(){

  if(!currentUser) return;

  const ref = doc(db,"availability",`${currentUser.uid}_${weekKey}`);

  await setDoc(ref,{
    therapistId: currentUser.uid,
    weekStart: weekKey,
    slots: state,
    locations: locations,   // NUEVO
    updatedAt: serverTimestamp()
  });

  alert("Disponibilidad guardada correctamente");
}

/* =========================
   NAV
========================= */

prevWeek.onclick = ()=>{
  currentMonday.setDate(currentMonday.getDate() - 7);
  loadWeek();
};

nextWeek.onclick = ()=>{
  currentMonday.setDate(currentMonday.getDate() + 7);
  loadWeek();
};

todayWeek.onclick = ()=>{
  currentMonday = mondayOf(new Date());
  loadWeek();
};

/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async user=>{
  if(!user) return;
  currentUser = user;
  await loadWeek();
  if(saveBtn) saveBtn.onclick = saveWeek;
});
