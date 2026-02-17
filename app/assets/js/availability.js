import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";
import { getCurrentClinicId } from "./clinic-context.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= INIT ================= */

await requireAuth();
await loadMenu();

const clinicId = await getCurrentClinicId();
if (!clinicId) throw new Error("No clinic selected");

const grid = document.getElementById("grid");
const saveBtn = document.getElementById("saveAvailability");

let baseDate = new Date();
let currentSlots = {};

const DAYS = ["mon","tue","wed","thu","fri"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0,30];

const pad = n => String(n).padStart(2,"0");

function formatDate(d){
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay()+6)%7;
  x.setDate(x.getDate()-n);
  x.setHours(0,0,0,0);
  return x;
}

function timeString(h,m){
  return `${pad(h)}:${pad(m)}`;
}

/* ================= LOAD ================= */

async function loadAvailability(){

  const user = auth.currentUser;
  const monday = mondayOf(baseDate);
  const weekStart = formatDate(monday);

  const ref = doc(
    db,
    "clinics",
    clinicId,
    "availability",
    `${user.uid}_${weekStart}`
  );

  const snap = await getDoc(ref);

  currentSlots = snap.exists() ? snap.data().slots || {} : {};

  renderGrid();
}

/* ================= RENDER ================= */

function renderGrid(){

  grid.innerHTML = "";

  grid.appendChild(document.createElement("div"));

  DAYS.forEach(day=>{
    const h=document.createElement("div");
    h.className="day-label";
    h.textContent=day.toUpperCase();
    grid.appendChild(h);
  });

  HOURS.forEach(hour=>{
    MINUTES.forEach(minute=>{

      const label=document.createElement("div");
      label.className="hour-label";
      label.textContent=timeString(hour,minute);
      grid.appendChild(label);

      DAYS.forEach(day=>{

        const slotKey=`${day}_${hour}_${minute}`;

        const cell=document.createElement("div");
        cell.className="slot";

        if(currentSlots[slotKey]){
          cell.classList.add("available");
        }

        cell.onclick=()=>{
          currentSlots[slotKey]=!currentSlots[slotKey];
          renderGrid();
        };

        grid.appendChild(cell);
      });
    });
  });
}

/* ================= SAVE ================= */

saveBtn?.addEventListener("click", async ()=>{

  const user = auth.currentUser;
  const monday = mondayOf(baseDate);
  const weekStart = formatDate(monday);

  const ref = doc(
    db,
    "clinics",
    clinicId,
    "availability",
    `${user.uid}_${weekStart}`
  );

  await setDoc(ref,{
    therapistId:user.uid,
    weekStart,
    slots:currentSlots
  });

  alert("Disponibilidad guardada correctamente");
});

/* ================= START ================= */

loadAvailability();
