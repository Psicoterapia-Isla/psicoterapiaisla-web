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
const MODES = ["online","viladecans","badalona"];

/* =========================
   DOM
========================= */
const grid = document.getElementById("grid");
const saveBtn = document.getElementById("save");
const prevWeekBtn = document.getElementById("prevWeek");
const nextWeekBtn = document.getElementById("nextWeek");
const todayBtn = document.getElementById("todayWeek");
const weekLabelEl = document.getElementById("weekLabel");

/* =========================
   FECHAS
========================= */
function mondayOf(d) {
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatWeekLabel(monday) {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

/* =========================
   STATE
========================= */
let currentUser = null;
let baseDate = new Date();
let currentMonday = mondayOf(baseDate);
let weekKey = currentMonday.toISOString().slice(0, 10);

/*
state = {
  "mon_9": { online:true, viladecans:false, badalona:false },
  ...
}
*/
let state = {};

/* =========================
   HELPERS
========================= */
function ensureSlot(key) {
  if (!state[key]) {
    state[key] = {
      online: false,
      viladecans: false,
      badalona: false
    };
  }
}

/* =========================
   RENDER
========================= */
function render(hasAvailability = true) {
  grid.innerHTML = "";
  weekLabelEl.textContent = formatWeekLabel(currentMonday);

  if (!hasAvailability) {
    const hint = document.createElement("div");
    hint.className = "week-hint";
    hint.textContent = "No hay disponibilidad definida para esta semana";
    grid.appendChild(hint);
  }

  // esquina vacía
  grid.appendChild(document.createElement("div"));

  // cabecera días
  LABELS.forEach(label => {
    const d = document.createElement("div");
    d.className = "day";
    d.textContent = label;
    grid.appendChild(d);
  });

  HOURS.forEach(hour => {
    // columna horas
    const hl = document.createElement("div");
    hl.className = "hour";
    hl.textContent = `${hour}:00`;
    grid.appendChild(hl);

    DAYS.forEach(day => {
      const key = `${day}_${hour}`;
      ensureSlot(key);

      const slot = document.createElement("div");
      slot.className = "slot";

      MODES.forEach(mode => {
        const btn = document.createElement("button");
        btn.className = `mode ${state[key][mode] ? "on" : ""}`;
        btn.textContent =
          mode === "online" ? "Online" :
          mode === "viladecans" ? "Vila" : "Bada";

        btn.onclick = () => {
          // presencial exclusivo
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
   LOAD WEEK
========================= */
async function loadWeek() {
  if (!currentUser) return;

  weekKey = currentMonday.toISOString().slice(0, 10);
  state = {};

  const ref = doc(db, "availability", `${currentUser.uid}_${weekKey}`);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    Object.assign(state, data.slots || {});
    Object.keys(state).forEach(ensureSlot);
    render(true);
  } else {
    render(false);
  }
}

/* =========================
   SAVE WEEK
========================= */
async function saveWeek() {
  if (!currentUser) return;

  const ref = doc(db, "availability", `${currentUser.uid}_${weekKey}`);

  await setDoc(ref, {
    therapistId: currentUser.uid,
    weekStart: weekKey,
    slots: state,
    updatedAt: serverTimestamp()
  });

  alert("Disponibilidad guardada correctamente");
}

/* =========================
   NAV
========================= */
prevWeekBtn.onclick = () => {
  currentMonday.setDate(currentMonday.getDate() - 7);
  loadWeek();
};

nextWeekBtn.onclick = () => {
  currentMonday.setDate(currentMonday.getDate() + 7);
  loadWeek();
};

todayBtn.onclick = () => {
  currentMonday = mondayOf(new Date());
  loadWeek();
};

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, async user => {
  if (!user) return;
  currentUser = user;
  await loadWeek();
  saveBtn.onclick = saveWeek;
});
