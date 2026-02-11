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
   STATE
========================= */

let baseDate = new Date();
let currentMonday = mondayOf(baseDate);
let weekKey = formatDate(currentMonday);
let state = {};
let currentUser = null;

/* =========================
   HELPERS
========================= */

function norm(key){
  if (!state[key]) {
    state[key] = false; // 🔥 solo boolean ahora
  }
}

/* =========================
   RENDER
========================= */

function render(hasAvailability = true){

  grid.innerHTML = "";

  const label = document.getElementById("weekLabel");
  if (label) {
    label.textContent = formatWeekLabel(currentMonday);
  }

  /* ===== CABECERA ===== */

  grid.appendChild(document.createElement("div"));

  LABELS.forEach((l,i)=>{
    const d = document.createElement("div");
    d.className = "day";
    d.textContent = l;

    // 🔥 marcar día actual
    const today = new Date();
    const thisDay = new Date(currentMonday);
    thisDay.setDate(thisDay.getDate() + i);

    if (
      today.toDateString() === thisDay.toDateString()
    ) {
      d.style.background = "#1f6b4e";
      d.style.color = "#fff";
      d.style.borderRadius = "8px";
    }

    grid.appendChild(d);
  });

  /* ===== GRID MEDIA HORA ===== */

  HOURS.forEach(hour=>{
    MINUTES.forEach(minute=>{

      const hourLabel = document.createElement("div");
      hourLabel.className = "hour";
      hourLabel.textContent = `${pad(hour)}:${pad(minute)}`;
      grid.appendChild(hourLabel);

      DAYS.forEach(day=>{
        const key = `${day}_${hour}_${minute}`;
        norm(key);

        const cell = document.createElement("div");
        cell.className = "slot";

        if(state[key]){
          cell.classList.add("available");
        }

        cell.onclick = ()=>{
          state[key] = !state[key];
          render(true);
        };

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

  const ref = doc(db,"availability",`${currentUser.uid}_${weekKey}`);
  const snap = await getDoc(ref);

  if(snap.exists()){
    state = snap.data().slots || {};
  }

  render(true);
}

async function saveWeek(){

  if(!currentUser) return;

  const ref = doc(db,"availability",`${currentUser.uid}_${weekKey}`);

  await setDoc(ref,{
    therapistId: currentUser.uid,
    weekStart: weekKey,
    slots: state,
    updatedAt: serverTimestamp()
  });

  alert("Disponibilidad guardada");
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
