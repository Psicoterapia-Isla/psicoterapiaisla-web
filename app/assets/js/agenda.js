import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= INIT ================= */
await requireAuth();
await loadMenu();

/* ================= STATE ================= */
let baseDate = new Date();
let editingId = null;
let selectedPatient = null;
let currentSlot = null;

/* ===== MEDIA HORA REAL ===== */
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];

/* ================= DOM ================= */
const grid = document.getElementById("agendaGrid");
const weekLabel = document.getElementById("weekLabel");

const modal = document.getElementById("modal");
const phone = document.getElementById("phone");
const name = document.getElementById("name");
const service = document.getElementById("service");
const modality = document.getElementById("modality");
const start = document.getElementById("start");
const end = document.getElementById("end");
const completed = document.getElementById("completed");
const paid = document.getElementById("paid");
const amount = document.getElementById("amount");
const suggestions = document.getElementById("suggestions");

/* ================= HELPERS ================= */
const pad = n => String(n).padStart(2,"0");
const formatDate = d => d.toISOString().slice(0,10);

function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay()+6)%7;
  x.setDate(x.getDate()-n);
  x.setHours(0,0,0,0);
  return x;
}

function dayFromKey(monday,key){
  const d = new Date(monday);
  d.setDate(d.getDate()+DAYS.indexOf(key));
  return d;
}

function timeString(h,m){
  return `${pad(h)}:${pad(m)}`;
}

function minutesOf(time){
  const [h,m] = time.split(":").map(Number);
  return h*60 + m;
}

/* ================= MODAL ================= */
function resetModal(){
  editingId = null;
  selectedPatient = null;
  currentSlot = null;

  phone.value = "";
  name.value = "";
  service.value = "Sesión de psicología sanitaria";
  modality.value = "viladecans";
  start.value = "";
  end.value = "";
  completed.checked = false;
  paid.checked = false;
  amount.value = "";
  suggestions.innerHTML = "";
}

function openNew(slot){
  resetModal();
  currentSlot = slot;

  start.value = timeString(slot.hour, slot.minute);
  end.value = timeString(slot.hour, slot.minute + 60);

  modal.classList.add("show");
}

function openEdit(a){
  resetModal();
  editingId = a.id;
  selectedPatient = a.patient || null;
  currentSlot = { date: a.date };

  phone.value = a.phone || "";
  name.value = a.name || "";
  service.value = a.service || "";
  modality.value = a.modality;
  start.value = a.start;
  end.value = a.end;
  completed.checked = !!a.completed;
  paid.checked = !!a.paid;
  amount.value = a.amount || "";

  modal.classList.add("show");
}

document.getElementById("close").onclick =
  () => modal.classList.remove("show");

/* ================= AUTOCOMPLETE ================= */
async function searchPatients(term){
  if(!term || term.length < 2){
    suggestions.innerHTML = "";
    return;
  }

  const snap = await getDocs(query(
    collection(db,"patients_normalized"),
    where("keywords","array-contains",term.toLowerCase())
  ));

  suggestions.innerHTML = "";

  snap.forEach(d=>{
    const p = d.data();
    const div = document.createElement("div");
    div.textContent = `${p.nombre || ""} ${p.apellidos || ""} · ${p.telefono || ""}`;

    div.onclick = () => {

      selectedPatient = { id: d.id, ...p };

      phone.value = p.telefono || "";
      name.value = `${p.nombre || ""} ${p.apellidos || ""}`.trim();

      const duration = p.patientType === "mutual" ? 30 : 60;

      const [h,m] = start.value.split(":").map(Number);
      const endDate = new Date(0,0,0,h,m + duration);
      end.value = timeString(endDate.getHours(), endDate.getMinutes());

      if(p.patientType === "mutual"){
        amount.value = p.mutual?.pricePerSession || 0;
      }

      suggestions.innerHTML = "";
    };

    suggestions.appendChild(div);
  });
}

phone.oninput = e => searchPatients(e.target.value);
name.oninput  = e => searchPatients(e.target.value);

/* ================= VALIDACIONES ================= */
function validateAvailability(availability, date, startTime, endTime){

  const startMin = minutesOf(startTime);
  const endMin = minutesOf(endTime);

  for(let m = startMin; m < endMin; m += 30){
    const h = Math.floor(m/60);
    const min = m % 60;

    const dayIndex = new Date(date).getDay();
    const dayKey = DAYS[(dayIndex + 6) % 7];
    const slotKey = `${dayKey}_${h}_${min}`;

    if(!availability[slotKey]){
      return false;
    }
  }

  return true;
}

function validateOverlap(appointments, date, startTime, endTime, ignoreId=null){

  const startMin = minutesOf(startTime);
  const endMin = minutesOf(endTime);

  return appointments.some(a=>{
    if(a.date !== date) return false;
    if(ignoreId && a.id === ignoreId) return false;

    const aStart = minutesOf(a.start);
    const aEnd = minutesOf(a.end);

    return startMin < aEnd && endMin > aStart;
  });
}

/* ================= SAVE ================= */
document.getElementById("save").onclick = async () => {

  const user = auth.currentUser;
  if(!user || !currentSlot) return;

  const monday = mondayOf(baseDate);
  const weekKey = formatDate(monday);

  const availRef = doc(db,"availability",`${user.uid}_${weekKey}`);
  const availSnap = await getDoc(availRef);
  const availability = availSnap.exists() ? availSnap.data().slots : {};

  const startTime = start.value;
  const endTime = end.value;

  if(!validateAvailability(availability,currentSlot.date,startTime,endTime)){
    alert("Horario fuera de disponibilidad");
    return;
  }

  const apptSnap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",user.uid),
    where("date","==",currentSlot.date)
  ));

  const appointments = [];
  apptSnap.forEach(d=>appointments.push({ id:d.id, ...d.data() }));

  if(validateOverlap(appointments,currentSlot.date,startTime,endTime,editingId)){
    alert("Solapamiento con otra cita");
    return;
  }

  const duration = selectedPatient?.patientType === "mutual" ? 30 : 60;

  const data = {
    therapistId: user.uid,
    patientId: selectedPatient?.id || null,
    patient: selectedPatient || null,
    sessionDuration: duration,
    date: currentSlot.date,
    phone: phone.value,
    name: name.value,
    service: service.value,
    modality: modality.value,
    start: startTime,
    end: endTime,
    completed: completed.checked,
    paid: paid.checked,
    amount: Number(amount.value || 0),
    updatedAt: Timestamp.now()
  };

  let id;

  if(editingId){
    await updateDoc(doc(db,"appointments",editingId),data);
    id = editingId;
  }else{
    const ref = await addDoc(collection(db,"appointments"),{
      ...data,
      createdAt: Timestamp.now()
    });
    id = ref.id;
  }

  modal.classList.remove("show");
  await renderWeek();
};

/* ================= RENDER ================= */
async function renderWeek(){

  grid.innerHTML = "";
  const monday = mondayOf(baseDate);
  weekLabel.textContent = monday.toLocaleDateString("es-ES");

  const user = auth.currentUser;
  if(!user) return;

  const weekKey = formatDate(monday);

  const availRef = doc(db,"availability",`${user.uid}_${weekKey}`);
  const availSnap = await getDoc(availRef);
  const availability = availSnap.exists() ? availSnap.data().slots : {};

  const apptSnap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",user.uid),
    where("date",">=",formatDate(monday)),
    where("date","<=",formatDate(new Date(monday.getTime()+6*86400000)))
  ));

  const appointments = [];
  apptSnap.forEach(d=>appointments.push({ id:d.id, ...d.data() }));

  grid.appendChild(document.createElement("div"));

  DAYS.forEach((_,i)=>{
    const d = new Date(monday);
    d.setDate(d.getDate()+i);
    const h = document.createElement("div");
    h.textContent = d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(h);
  });

  HOURS.forEach(hour=>{
    MINUTES.forEach(minute=>{

      const label=document.createElement("div");
      label.textContent=timeString(hour,minute);
      grid.appendChild(label);

      DAYS.forEach(day=>{
        const date=formatDate(dayFromKey(monday,day));
        const slotKey=`${day}_${hour}_${minute}`;
        const cell=document.createElement("div");
        cell.className="slot";

        const appointment = appointments.find(a=>{
          if(a.date !== date) return false;
          const startMin=minutesOf(a.start);
          const endMin=minutesOf(a.end);
          const cur=hour*60+minute;
          return cur>=startMin && cur<endMin;
        });

        if(appointment){
          cell.classList.add(
            appointment.paid ? "paid" :
            appointment.completed ? "done" : "busy"
          );
          cell.innerHTML=`<strong>${appointment.name||"—"}</strong>`;
          cell.onclick=()=>openEdit(appointment);
        }
        else if(availability[slotKey]){
          cell.classList.add("available");
          cell.onclick=()=>openNew({date,hour,minute});
        }
        else{
          cell.classList.add("disabled");
        }

        grid.appendChild(cell);
      });

    });
  });
}

/* ================= NAV ================= */
prevWeek.onclick=()=>{
  baseDate.setDate(baseDate.getDate()-7);
  renderWeek();
};

nextWeek.onclick=()=>{
  baseDate.setDate(baseDate.getDate()+7);
  renderWeek();
};

today.onclick=()=>{
  baseDate=new Date();
  renderWeek();
};

renderWeek();
