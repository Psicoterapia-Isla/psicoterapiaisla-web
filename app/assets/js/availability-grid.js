import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   AUTH (CLAVE)
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
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 9–21

const slotsState = {};

/* =========================
   SEMANA (LUNES)
========================= */
const now = new Date();
const monday = new Date(now);
monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
monday.setHours(12, 0, 0, 0); // 🔒 anti TZ bug

const weekKey = monday.toISOString().slice(0, 10);
const docRef = doc(db, "availability", `${therapistId}_${weekKey}`);

/* =========================
   RENDER GRID
========================= */
function renderGrid() {
  grid.innerHTML = "";

  grid.appendChild(document.createElement("div")); // esquina vacía

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
      const slot = document.createElement("div");
      slot.className = "slot";

      if (slotsState[key]) slot.classList.add("available");

      slot.addEventListener("click", () => {
        slotsState[key] = !slotsState[key];
        slot.classList.toggle("available");
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
  const data = snap.data();
  if (data.slots) {
    Object.assign(slotsState, data.slots);
  }
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
    updatedAt: new Date()
  });

  alert("Disponibilidad guardada correctamente");
});
