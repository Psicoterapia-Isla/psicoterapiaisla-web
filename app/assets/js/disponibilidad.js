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
const HOURS = Array.from({ length:12 }, (_,i)=>i+9);

/* =========================
   DOM
========================= */
const grid = document.getElementById("grid");
const saveBtn = document.getElementById("save");
const weekLabelEl = document.getElementById("weekLabel");

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

function formatWeekLabel(monday){
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);

  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

/* =========================
   STATE
========================= */
let baseDate = new Date();
let currentMonday = mondayOf(baseDate);
let weekKey = currentMonday.toISOString().slice(0,10);
let state = {};
let currentUser = null;

function norm(k){
  state[k] ??= { online:false, viladecans:false, badalona:false };
}

/* =========================
   RENDER
========================= */
function render(hasAvailability=true){
  grid.innerHTML = "";
  weekLabelEl.textContent = formatWeekLabel(currentMonday);

  if(!hasAvailability){
    const hint = document.createElement("div");
    hint.className = "week-hint";
    hint.textContent = "No hay disponibilidad definida para esta semana";
    grid.appendChild(hint);
  }

  grid.appendChild(document.createElement("div"));
  LABELS.forEach(l=>{
    const d = document.createElement("div");
    d.className = "day";
    d.textContent = l;
    grid.appendChild(d);
  });

  HOURS.forEach(h=>{
    const hl = document.createElement("div");
    hl.className = "hour";
    hl.textContent = `${h}:00`;
    grid.appendChild(hl);

    DAYS.forEach(d=>{
      const k = `${d}_${h}`;
      norm(k);

      const s = document.createElement("div");
      s.className = "slot";

      ["online","viladecans","badalona"].forEach(m=>{
        const b = document.createElement("button");
        b.className = `mode ${state[k][m] ? "on" : ""}`;
        b.textContent =
          m === "online" ? "Online" :
          m === "viladecans" ? "Vila" : "Bada";

        b.onclick = () => {
          if(m !== "online"){
            state[k].viladecans = false;
            state[k].badalona = false;
          }
          state[k][m] = !state[k][m];
          render(true);
        };

        s.appendChild(b);
      });

      grid.appendChild(s);
    });
  });
}

/* =========================
   LOAD / SAVE
========================= */
async function loadWeek(){
  if(!currentUser) return;

  weekKey = currentMonday.toISOString().slice(0,10);
  state = {};

  const ref = doc(db, "availability", `${currentUser.uid}_${weekKey}`);
  const snap = await getDoc(ref);

  if(snap.exists()){
    Object.assign(state, snap.data().slots || {});
    Object.keys(state).forEach(norm);
    render(true);
  } else {
    render(false);
  }
}

async function saveWeek(){
  if(!currentUser) return;

  const ref = doc(db, "availability", `${currentUser.uid}_${weekKey}`);
  await setDoc(ref, {
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
prevWeek.onclick = () => {
  currentMonday.setDate(currentMonday.getDate() - 7);
  loadWeek();
};

nextWeek.onclick = () => {
  currentMonday.setDate(currentMonday.getDate() + 7);
  loadWeek();
};

todayWeek.onclick = () => {
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
  saveBtn.onclick = saveWeek;
});
