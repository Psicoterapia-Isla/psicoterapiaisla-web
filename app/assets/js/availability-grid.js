// app/assets/js/availability-grid.js

import { auth } from "./firebase.js";
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById("availabilityGrid");
const saveBtn = document.getElementById("saveAvailability");

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 9–21

const slotsState = {};

const user = auth.currentUser;
const therapistId = user.uid;

// semana actual (lunes)
const now = new Date();
const monday = new Date(now);
monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
const weekKey = monday.toISOString().slice(0, 10);

const docRef = doc(db, "availability", `${therapistId}_${weekKey}`);

// ======================
// RENDER GRID
// ======================
function renderGrid() {
  grid.innerHTML = "";

  grid.appendChild(document.createElement("div")); // esquina vacía

  DAY_LABELS.forEach(d => {
    const el = document.createElement("div");
    el.className = "day-label";
    el.textContent = d;
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

// ======================
// LOAD DATA
// ======================
const snap = await getDoc(docRef);
if (snap.exists()) {
  Object.assign(slotsState, snap.data().slots || {});
}

renderGrid();

// ======================
// SAVE
// ======================
saveBtn.addEventListener("click", async () => {
  await setDoc(docRef, {
    therapistId,
    weekStart: weekKey,
    slots: slotsState
  });

  alert("Disponibilidad guardada");
});
