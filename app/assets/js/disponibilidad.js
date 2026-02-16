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

/* ================= CONSTANTES ================= */

const DAYS = ["mon","tue","wed","thu","fri"];
const LABELS = ["L","M","X","J","V"];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];

/* ================= DOM ================= */

const grid = document.getElementById("grid");
const saveBtn = document.getElementById("save");

const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");
const todayWeek = document.getElementById("todayWeek");
const weekLabel = document.getElementById("weekLabel");

/* ================= STATE ================= */

let currentUser = null;
let baseDate = new Date();
let currentMonday = mondayOf(baseDate);
let weekKey = formatDate(currentMonday);

let state = {};
let locations = {};

/* ================= FECHAS ================= */

function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  x.setHours(0,0,0,0);
  return x;
}

function formatDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function pad(n){
  return String(n).padStart(2,"0");
}

function formatWeekLabel(monday){
  const end = new Date(monday);
  end.setDate(end.getDate() + 4);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})}
   – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

/* ================= TOGGLE SLOT ================= */

function toggleSlot(key, cell){

  if(state[key]){
    delete state[key];
    cell.classList.remove("available");
  } else {
    state[key] = true;
    cell.classList.add("available");
  }
}

/* ================= SEDE ================= */

function ensureLocation(day){
  if(!locations[day]){
    locations[day] = { base: "viladecans" };
  }
}

function cycleLocation(day){

  ensureLocation(day);

  const current = locations[day].base;

  const next =
    current === "viladecans"
      ? "badalona"
      : current === "badalona"
        ? "online"
        : "viladecans";

  locations[day].base = next;

  render();
}

/* ================= RENDER ================= */

function render(){

  if(!grid) return;

  grid.innerHTML = "";

  if(weekLabel){
    weekLabel.textContent = formatWeekLabel(currentMonday);
  }

  grid.appendChild(document.createElement("div"));

  LABELS.forEach((label,i)=>{

    const dayKey = DAYS[i];

    ensureLocation(dayKey);

    const base = locations[dayKey].base;

    const dayCell = document.createElement("div");
    dayCell.className = "day-label";
    dayCell.innerHTML = `
      <div>${label}</div>
      <small style="cursor:pointer;font-weight:500;">
        ${base}
      </small>
    `;

    dayCell.querySelector("small").onclick =
      () => cycleLocation(dayKey);

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

/* ================= LOAD ================= */

async function loadWeek(){

  if(!currentUser) return;

  weekKey = formatDate(currentMonday);

  state = {};
  locations = {};

  const ref = doc(db,"availability",`${currentUser.uid}_${weekKey}`);
  const snap = await getDoc(ref);

  if(snap.exists()){
    const data = snap.data();
    state = data.slots || {};
    locations = data.locations || {};
  }

  /* Garantizar que todos los días tengan sede */

  DAYS.forEach(day => ensureLocation(day));

  render();
}

/* ================= SAVE ================= */

async function saveWeek(){

  if(!currentUser) return;

  const ref = doc(db,"availability",`${currentUser.uid}_${weekKey}`);

  await setDoc(ref,{
    therapistId: currentUser.uid,
    weekStart: weekKey,
    slots: state,
    locations: locations,
    updatedAt: serverTimestamp()
  });

  alert("Disponibilidad guardada correctamente");
}

/* ================= NAV ================= */

prevWeek.onclick = ()=>{
  const newDate = new Date(currentMonday);
  newDate.setDate(newDate.getDate() - 7);
  currentMonday = mondayOf(newDate);
  loadWeek();
};

nextWeek.onclick = ()=>{
  const newDate = new Date(currentMonday);
  newDate.setDate(newDate.getDate() + 7);
  currentMonday = mondayOf(newDate);
  loadWeek();
};

todayWeek.onclick = ()=>{
  currentMonday = mondayOf(new Date());
  loadWeek();
};

/* ================= AUTH ================= */

onAuthStateChanged(auth, async user=>{
  if(!user) return;
  currentUser = user;
  await loadWeek();
  if(saveBtn) saveBtn.onclick = saveWeek;
});
