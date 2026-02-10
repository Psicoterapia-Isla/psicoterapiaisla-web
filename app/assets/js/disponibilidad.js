// assets/js/disponibilidad.js

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

/* =========================
   DOM
========================= */
const grid = document.getElementById("grid");
const saveBtn = document.getElementById("save");

const prevBtn = document.getElementById("prevWeek");
const nextBtn = document.getElementById("nextWeek");
const todayBtn = document.getElementById("todayWeek");

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
let currentMonday = mondayOf(new Date());
let weekKey = currentMonday.toISOString().slice(0,10);
let state = {};
let currentUser = null;

/* =========================
   HELPERS
========================= */
function norm(k){
  state[k] ??= {
    online: false,
    viladecans: false,
    badalona: false
  };
}

/* =========================
   RENDER
========================= */
function render(hasAvailability = true){
  if (!grid) return;

  grid.innerHTML = "";

  // label semana (opcional)
  const label = document.getElementById("weekLabel");
  if (label) {
    label.textContent = formatWeekLabel(currentMonday);
  }

  if (!hasAvailability) {
    const hint = document.createElement("div");
    hint.className = "week-hint";
    hint.textContent = "No hay disponibilidad definida para esta semana";
    grid.appendChild(hint);
  }

  // esquina vacía
  grid.appendChild(document.createElement("div"));

  // cabecera días
  LABELS.forEach(l => {
    const d = document.createElement("div");
    d.className = "day";
    d.textContent = l;
    grid.appendChild(d);
  });

  // horas + slots
  HOURS.forEach(hour => {
    const hl = document.createElement("div");
    hl.className = "hour";
    hl.textContent = `${hour}:00`;
    grid.appendChild(hl);

    DAYS.forEach(day => {
      const key = `${day}_${hour}`;
      norm(key);

      const slot = document.createElement("div");
      slot.className = "slot";

      ["online","viladecans","badalona"].forEach(mode => {
        const btn = document.createElement("button");
        btn.className = `mode ${state[key][mode] ? "on" : ""}`;
        btn.textContent =
          mode === "online" ? "Online" :
          mode === "viladecans" ? "Vila" : "Bada";

        btn.onclick = () => {
          // presencial excluyente
          if (mode !== "online") {
            state[key].viladecans = false;
            state[key].badalona = false;
          }
          state[key][mode] = !state[key][mode];
          render(true);
        };

        slot.appendChild(btn);
      });

      grid.appendChild(slot);
    });
  });
}

/* =========================
   LOAD / SAVE
========================= */
async function loadWeek(){
  if (!currentUser) return;

  weekKey = currentMonday.toISOString().slice(0,10);
  state = {};

  const ref = doc(db, "availability", `${currentUser.uid}_${weekKey}`);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    Object.assign(state, snap.data().slots || {});
    Object.keys(state).forEach(norm);
    render(true);
  } else {
    render(false);
  }
}

async function saveWeek(){
  if (!currentUser) return;

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
   NAV (BLINDADO)
========================= */
if (prevBtn) {
  prevBtn.onclick = () => {
    currentMonday.setDate(currentMonday.getDate() - 7);
    loadWeek();
  };
}

if (nextBtn) {
  nextBtn.onclick = () => {
    currentMonday.setDate(currentMonday.getDate() + 7);
    loadWeek();
  };
}

if (todayBtn) {
  todayBtn.onclick = () => {
    currentMonday = mondayOf(new Date());
    loadWeek();
  };
}

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, async user => {
  if (!user) return;
  currentUser = user;
  await loadWeek();
  if (saveBtn) saveBtn.onclick = saveWeek;
});
