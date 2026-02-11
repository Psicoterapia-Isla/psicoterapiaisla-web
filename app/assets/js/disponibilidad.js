import { auth, db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =====================================================
   CONFIG
===================================================== */

const START_HOUR = 9;
const END_HOUR = 21;

function generateSlots() {
  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(`${String(h).padStart(2,"0")}:00`);
    slots.push(`${String(h).padStart(2,"0")}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateSlots();
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const LABELS = ["L","M","X","J","V","S","D"];

/* =====================================================
   DOM
===================================================== */

const grid = document.getElementById("grid");
const saveBtn = document.getElementById("save");
const therapistSelect = document.getElementById("therapistSelect");

const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");
const todayWeek = document.getElementById("todayWeek");

/* =====================================================
   STATE
===================================================== */

let baseDate = new Date();
let currentMonday = mondayOf(baseDate);
let weekKey = "";
let state = {};
let currentUser = null;
let currentRole = "therapist";
let selectedTherapistId = null;

/* =====================================================
   DATE HELPERS
===================================================== */

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

function formatWeekLabel(monday){
  const end = new Date(monday);
  end.setDate(end.getDate()+6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

function isPastWeek(monday){
  const today = mondayOf(new Date());
  return monday < today;
}

function isTodayColumn(index){
  const today = new Date();
  const d = new Date(currentMonday);
  d.setDate(currentMonday.getDate() + index);

  return (
    today.getFullYear() === d.getFullYear() &&
    today.getMonth() === d.getMonth() &&
    today.getDate() === d.getDate()
  );
}

/* =====================================================
   RENDER
===================================================== */

function render(){

  if (!grid) return;

  grid.innerHTML = "";
  weekKey = formatDate(currentMonday);

  const label = document.getElementById("weekLabel");
  if (label) label.textContent = formatWeekLabel(currentMonday);

  const isBlocked = isPastWeek(currentMonday);

  /* CABECERA */
  grid.appendChild(document.createElement("div"));

  LABELS.forEach((text,index)=>{
    const d = document.createElement("div");
    d.className = "day-label";
    if (isTodayColumn(index)) d.classList.add("today-column");
    d.textContent = text;
    grid.appendChild(d);
  });

  /* GRID */
  TIME_SLOTS.forEach(time => {

    const hourLabel = document.createElement("div");
    hourLabel.className = "hour-label";
    hourLabel.textContent = time;
    grid.appendChild(hourLabel);

    DAYS.forEach((day,index)=>{

      const key = `${day}_${time}`;
      if (!state[key]) state[key] = false;

      const cell = document.createElement("div");
      cell.className = "slot";
      if (isTodayColumn(index)) cell.classList.add("today-column");

      const btn = document.createElement("button");
      btn.className = `mode ${state[key] ? "on" : ""}`;

      if (!isBlocked) {
        btn.onclick = () => {
          state[key] = !state[key];
          btn.classList.toggle("on");
        };
      } else {
        btn.disabled = true;
      }

      cell.appendChild(btn);
      grid.appendChild(cell);
    });

  });
}

/* =====================================================
   LOAD
===================================================== */

async function loadWeek(){

  if (!selectedTherapistId) return;

  state = {};
  weekKey = formatDate(currentMonday);

  const ref = doc(db,"availability",`${selectedTherapistId}_${weekKey}`);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    state = snap.data().slots || {};
    markSaved(true);
  } else {
    markSaved(false);
  }

  render();
}

/* =====================================================
   SAVE
===================================================== */

async function saveWeek(){

  if (!selectedTherapistId) return;

  if (isPastWeek(currentMonday)) {
    alert("No puedes modificar semanas pasadas");
    return;
  }

  const ref = doc(db,"availability",`${selectedTherapistId}_${weekKey}`);

  await setDoc(ref,{
    therapistId: selectedTherapistId,
    weekStart: weekKey,
    slots: state,
    updatedAt: serverTimestamp()
  });

  markSaved(true);
  alert("Disponibilidad guardada");
}

/* =====================================================
   UI HELPERS
===================================================== */

function markSaved(saved){
  const indicator = document.getElementById("weekStatus");
  if (!indicator) return;

  indicator.textContent = saved
    ? "Semana guardada ✔"
    : "Semana sin guardar";

  indicator.style.color = saved ? "green" : "red";
}

/* =====================================================
   TERAPEUTAS (ADMIN)
===================================================== */

async function loadTherapists(){

  const snap = await getDocs(collection(db,"therapists"));
  const therapists = snap.docs.map(d=>({ id:d.id, ...d.data() }));

  if (!therapistSelect) return;

  therapistSelect.innerHTML = "";

  therapists.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name || t.email || t.id;
    therapistSelect.appendChild(opt);
  });

  selectedTherapistId = therapists[0]?.id;
  therapistSelect.onchange = async () => {
    selectedTherapistId = therapistSelect.value;
    await loadWeek();
  };
}

/* =====================================================
   NAV
===================================================== */

if (prevWeek) {
  prevWeek.onclick = () => {
    currentMonday.setDate(currentMonday.getDate() - 7);
    loadWeek();
  };
}

if (nextWeek) {
  nextWeek.onclick = () => {
    currentMonday.setDate(currentMonday.getDate() + 7);
    loadWeek();
  };
}

if (todayWeek) {
  todayWeek.onclick = () => {
    currentMonday = mondayOf(new Date());
    loadWeek();
  };
}

/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(auth, async user=>{
  if (!user) return;

  currentUser = user;

  const roleSnap = await getDoc(doc(db,"users",user.uid));
  currentRole = roleSnap.exists() ? roleSnap.data().role : "therapist";

  if (currentRole === "admin") {
    await loadTherapists();
  } else {
    selectedTherapistId = user.uid;
  }

  await loadWeek();

  if (saveBtn) saveBtn.onclick = saveWeek;
});
