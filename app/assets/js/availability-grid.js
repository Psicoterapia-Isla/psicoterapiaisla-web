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

const slotsState = {};

/* =========================
   SEMANA (LUNES)
========================= */
const now = new Date();
const monday = new Date(now);
monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
monday.setHours(12, 0, 0, 0);

const weekKey = monday.toISOString().slice(0, 10);
const docRef = doc(db, "availability", `${therapistId}_${weekKey}`);

/* =========================
   RENDER GRID
========================= */
function renderGrid() {
  grid.innerHTML = "";

  grid.appendChild(document.createElement("div"));

  DAY_LABELS.forEach(label => {
    const el = document.createElement("div");
    el.className = "day-label";
    el.textContent = label;
    grid.appendChild(el);
  });

  HOURS.forEach(hour => {
    const label = document.createElement("div");
    label.className = "hour-label";
    label.textContent = `${hour}:00`;
    grid.appendChild(label);

    DAYS.forEach(day => {
      const key = `${day}_${hour}`;
      const slotData = slotsState[key] || {
        online: false,
        viladecans: false,
        badalona: false
      };

      const slot = document.createElement("div");
      slot.className = "slot";

      if (slotData.online || slotData.viladecans || slotData.badalona) {
        slot.classList.add("active");
      }

      slot.innerHTML = `
        <label>
          <input type="checkbox" data-k="${key}" data-m="online"
            ${slotData.online ? "checked" : ""}>
          Online
        </label>
        <label>
          <input type="checkbox" data-k="${key}" data-m="viladecans"
            ${slotData.viladecans ? "checked" : ""}>
          Viladecans
        </label>
        <label>
          <input type="checkbox" data-k="${key}" data-m="badalona"
            ${slotData.badalona ? "checked" : ""}>
          Badalona
        </label>
      `;

      slot.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", e => {
          const k = e.target.dataset.k;
          const m = e.target.dataset.m;

          slotsState[k] ??= {
            online: false,
            viladecans: false,
            badalona: false
          };

          slotsState[k][m] = e.target.checked;

          if (
            slotsState[k].online ||
            slotsState[k].viladecans ||
            slotsState[k].badalona
          ) {
            slot.classList.add("active");
          } else {
            slot.classList.remove("active");
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
