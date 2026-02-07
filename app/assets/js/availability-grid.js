import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   AUTH
========================= */
await requireAuth();

const user = auth.currentUser;
if (!user) throw new Error("Usuario no autenticado");

const therapistId = user.uid;

/* =========================
   DOM
========================= */
const grid = document.getElementById("availabilityGrid");
const saveBtn = document.getElementById("saveAvailability");

/* =========================
   CONFIG
========================= */
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABELS = ["L","M","X","J","V","S","D"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 9–21

/* 
  slotsState:
  {
    "mon_9": { online:true, viladecans:false, badalona:false },
    ...
  }
*/
const slotsState = {};

/* =========================
   SEMANA (LUNES REAL)
========================= */
const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
monday.setHours(0,0,0,0);

const weekKey = monday.toISOString().slice(0,10);
const docRef = doc(db, "availability", `${therapistId}_${weekKey}`);

/* =========================
   HELPERS
========================= */
function ensureSlot(key){
  if (!slotsState[key]) {
    slotsState[key] = {
      online: false,
      viladecans: false,
      badalona: false
    };
  }
}

/* =========================
   RENDER GRID
========================= */
function renderGrid() {
  grid.innerHTML = "";

  /* esquina */
  grid.appendChild(document.createElement("div"));

  /* cabeceras */
  DAY_LABELS.forEach(label => {
    const el = document.createElement("div");
    el.className = "day-label";
    el.textContent = label;
    grid.appendChild(el);
  });

  /* horas */
  HOURS.forEach(hour => {
    const hourLabel = document.createElement("div");
    hourLabel.className = "hour-label";
    hourLabel.textContent = `${hour}:00`;
    grid.appendChild(hourLabel);

    DAYS.forEach(day => {
      const key = `${day}_${hour}`;
      ensureSlot(key);

      const slot = document.createElement("div");
      slot.className = "slot";

      const data = slotsState[key];
      if (data.online || data.viladecans || data.badalona) {
        slot.classList.add("available");
      }

      /* BOTONES GRANDES (mobile friendly) */
      slot.innerHTML = `
        <button class="mode ${data.online ? "on":""}" data-m="online">Online</button>
        <button class="mode ${data.viladecans ? "on":""}" data-m="viladecans">Vila</button>
        <button class="mode ${data.badalona ? "on":""}" data-m="badalona">Bada</button>
      `;

      slot.querySelectorAll(".mode").forEach(btn => {
        btn.addEventListener("click", e => {
          e.preventDefault();

          const mode = btn.dataset.m;
          slotsState[key][mode] = !slotsState[key][mode];

          btn.classList.toggle("on", slotsState[key][mode]);

          if (
            slotsState[key].online ||
            slotsState[key].viladecans ||
            slotsState[key].badalona
          ) {
            slot.classList.add("available");
          } else {
            slot.classList.remove("available");
          }
        });
      });

      grid.appendChild(slot);
    });
  });
}

/* =========================
   LOAD DATA
========================= */
const snap = await getDoc(docRef);
if (snap.exists()) {
  Object.assign(slotsState, snap.data().slots || {});
}

renderGrid();

/* =========================
   SAVE
========================= */
saveBtn.addEventListener("click", async () => {
  await setDoc(docRef, {
    therapistId,
    weekStart: weekKey,
    slots: slotsState,
    updatedAt: serverTimestamp()
  });

  alert("Disponibilidad guardada correctamente");
});
