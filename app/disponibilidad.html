import { auth } from "./firebase.js";
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById("availabilityGrid");
const saveBtn = document.getElementById("saveAvailability");

const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const labels = ["L","M","X","J","V","S","D"];
const hours = Array.from({ length: 12 }, (_, i) => i + 9);

const state = {}; // day_hour -> available

const user = auth.currentUser;
const therapistId = user.uid;

// HEADER
grid.appendChild(document.createElement("div"));
labels.forEach(l => {
  const d = document.createElement("div");
  d.textContent = l;
  d.style.fontWeight = "600";
  grid.appendChild(d);
});

// GRID
hours.forEach(hour => {
  const h = document.createElement("div");
  h.textContent = `${hour}:00`;
  h.className = "hour";
  grid.appendChild(h);

  days.forEach(day => {
    const key = `${day}_${hour}`;
    state[key] = true;

    const slot = document.createElement("div");
    slot.className = "availability-slot available";
    slot.textContent = "Disponible";

    slot.onclick = () => {
      state[key] = !state[key];
      slot.classList.toggle("available");
      slot.classList.toggle("unavailable");
      slot.textContent = state[key] ? "Disponible" : "No disponible";
    };

    grid.appendChild(slot);
  });
});

// GUARDAR
saveBtn.onclick = async () => {
  for (const key in state) {
    const [day, hour] = key.split("_");

    await setDoc(
      doc(db, "availability", `${therapistId}_${day}_${hour}`),
      {
        therapistId,
        day,
        hour: Number(hour),
        available: state[key]
      }
    );
  }

  alert("Disponibilidad guardada");
};
