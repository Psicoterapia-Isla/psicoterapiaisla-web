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

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

/* ================= INIT ================= */

await requireAuth();
await loadMenu();

/* ================= FUNCTIONS ================= */

const functions = getFunctions(undefined, "us-central1");

const sendAppointmentNotification = httpsCallable(
  functions,
  "sendAppointmentNotification"
);

/* ================= STATE ================= */

let baseDate = new Date();
let editingId = null;
let selectedPatient = null;
let currentSlot = null;

/* ================= CONFIG ================= */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];
const DAYS = ["mon","tue","wed","thu","fri"];

/* ================= DOM ================= */

const grid = document.getElementById("agendaGrid");
const weekLabel = document.getElementById("weekLabel");

const modal = document.getElementById("modal");
const closeBtn = document.getElementById("close");

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

const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");
const todayBtn = document.getElementById("today");

/* ================= HELPERS ================= */

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

function setFieldsDisabled(disabled){
  [phone,name,service,modality,start,end,completed,paid,amount]
    .forEach(el => el && (el.disabled = disabled));
}

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

    const item = document.createElement("div");
    item.textContent =
      `${p.nombre || ""} ${p.apellidos || ""} · ${p.telefono || ""}`;

    item.onclick = () => {

      selectedPatient = { id: d.id, ...p };

      phone.value = p.telefono || "";
      name.value =
        `${p.nombre || ""} ${p.apellidos || ""}`.trim();

      /* ===== DURACIÓN AUTOMÁTICA ===== */

      const duration =
        p.patientType === "mutual" ? 30 : 60;

      if(start.value){
        const [h,m] = start.value.split(":").map(Number);

        const endDate = new Date(0,0,0,h,m);
        endDate.setMinutes(endDate.getMinutes() + duration);

        end.value = timeString(
          endDate.getHours(),
          endDate.getMinutes()
        );
      }

      /* ===== IMPORTE AUTOMÁTICO ===== */

      if(p.patientType === "mutual"){
        amount.value = p.mutual?.pricePerSession || 0;
      }

      suggestions.innerHTML = "";
    };

    suggestions.appendChild(item);
  });
}

/* ================= FACTURACIÓN ================= */

async function getNextInvoiceNumber(therapistId){

  const year = new Date().getFullYear();
  const ref = doc(db,"invoice_counters",`${therapistId}_${year}`);

  return await runTransaction(db, async tx => {

    const snap = await tx.get(ref);
    let next = 1;

    if(snap.exists()){
      next = snap.data().lastNumber + 1;
      tx.update(ref,{ lastNumber: next });
    }else{
      tx.set(ref,{ therapistId, year, lastNumber: 1 });
    }

    return `PI-${year}-${String(next).padStart(4,"0")}`;
  });
}

async function createInvoice(data, appointmentId) {

  if (data.invoiceId) return;

  const num = await getNextInvoiceNumber(data.therapistId);

  const invRef = await addDoc(collection(db,"invoices"),{
    therapistId: data.therapistId,
    appointmentId,
    invoiceNumber: num,
    issueDate: Timestamp.now(),
    patientId: data.patientId || null,
    patientName: data.name || null,
    concept: data.service,
    totalAmount: data.amount,
    status: "paid",
    createdAt: Timestamp.now()
  });

  await updateDoc(doc(db,"appointments",appointmentId),{
    invoiceId: invRef.id
  });
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
  setFieldsDisabled(false);
}

function openNew(slot){
  resetModal();
  currentSlot = slot;

  start.value = timeString(slot.hour, slot.minute);

  // Calcular correctamente +60 minutos
  const startDate = new Date(0, 0, 0, slot.hour, slot.minute);
  startDate.setMinutes(startDate.getMinutes() + 60);

  end.value = timeString(
    startDate.getHours(),
    startDate.getMinutes()
  );

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

  if(a.invoiceId){
    setFieldsDisabled(true);
  }

  modal.classList.add("show");
}

closeBtn?.addEventListener("click",()=>{
  modal.classList.remove("show");
});

/* ================= SAVE ================= */

document.getElementById("save")?.addEventListener("click", async () => {

  const user = auth.currentUser;
  if(!user || !currentSlot) return;

  const [y,m,d] = currentSlot.date.split("-");
  const monday = mondayOf(new Date(y, m-1, d));
  const weekStart = formatDate(monday);

  const availRef = doc(db,"availability",`${user.uid}_${weekStart}`);
  const availSnap = await getDoc(availRef);
  const availability = availSnap.exists() ? availSnap.data().slots : {};

  const startMin = minutesOf(start.value);
  const endMin = minutesOf(end.value);

  const realDate = new Date(y, m-1, d);
  const dayNumber = realDate.getDay();
  const map = {1:"mon",2:"tue",3:"wed",4:"thu",5:"fri"};
  const dayKey = map[dayNumber];

  if (!dayKey) return alert("Día no permitido");

  for (let minCursor = startMin; minCursor < endMin; minCursor += 30) {

    const h = Math.floor(minCursor / 60);
    const min = minCursor % 60;
    const slotKey = `${dayKey}_${h}_${min}`;

    if (!availability[slotKey] && !editingId) {
      return alert("Horario fuera de disponibilidad");
    }
  }

  const apptSnap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",user.uid),
    where("date","==",currentSlot.date)
  ));

  const appointments = [];
  apptSnap.forEach(d=>appointments.push({ id:d.id, ...d.data() }));

  if(appointments.some(a=>{
    if(editingId && a.id===editingId) return false;
    const s=minutesOf(a.start);
    const e=minutesOf(a.end);
    return startMin < e && endMin > s;
  })){
    return alert("Solapamiento con otra cita");
  }

  const data = {
    therapistId: user.uid,
    patientId: selectedPatient?.id || null,
    patient: selectedPatient || null,
    date: currentSlot.date,
    phone: phone.value,
    name: name.value,
    service: service.value,
    modality: modality.value,
    start: start.value,
    end: end.value,
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

    try {
      await sendAppointmentNotification({ appointmentId: id });
    } catch (err) {
      console.error("Error enviando aviso:", err);
    }
  }

  if (data.completed && data.paid && data.amount) {
    await createInvoice(data, id);
  }

  modal.classList.remove("show");
  await renderWeek();
});

/* ================= RENDER ================= */

async function renderWeek(){

  if(!grid) return;

  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  const weekStart = formatDate(monday);
  const weekEnd = formatDate(new Date(monday.getTime()+4*86400000));

  if(weekLabel){
    weekLabel.textContent =
      monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"}) +
      " – " +
      new Date(monday.getTime()+4*86400000)
        .toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"});
  }

  const user = auth.currentUser;
  if(!user) return;

  const availRef = doc(db,"availability",`${user.uid}_${weekStart}`);
  const availSnap = await getDoc(availRef);
  const availability = availSnap.exists() ? availSnap.data().slots : {};

  const apptSnap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",user.uid),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const appointments = [];
  apptSnap.forEach(d=>appointments.push({ id:d.id, ...d.data() }));

  grid.appendChild(document.createElement("div"));

  DAYS.forEach((_,i)=>{
    const d = new Date(monday);
    d.setDate(d.getDate()+i);
    const h = document.createElement("div");
    h.className="day-label";
    h.textContent = d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(h);
  });

  HOURS.forEach(hour=>{
    MINUTES.forEach(minute=>{

      const label=document.createElement("div");
      label.className="hour-label";
      label.textContent=timeString(hour,minute);
      grid.appendChild(label);

      DAYS.forEach(day=>{

        const date=formatDate(dayFromKey(monday,day));
        const slotKey = `${day}_${hour}_${minute}`;
        const cell=document.createElement("div");
        cell.className="slot";

        const appointment = appointments.find(a=>{
          if(a.date !== date) return false;
          const cur=hour*60+minute;
          return cur>=minutesOf(a.start) && cur<minutesOf(a.end);
        });

        if (appointment) {

          cell.classList.add(
            appointment.paid ? "paid" :
            appointment.completed ? "done" : "busy"
          );

          cell.innerHTML = `<strong>${appointment.name || "—"}</strong>`;
          cell.onclick = () => openEdit(appointment);

        } else if (availability[slotKey]) {

          cell.classList.add("available");
          cell.onclick = () => openNew({ date, hour, minute });

        } else {

          cell.classList.add("disabled");

        }

        grid.appendChild(cell);
      });

    });
  });
}

/* ================= NAV ================= */

if(prevWeek){
  prevWeek.onclick=()=>{
    baseDate.setDate(baseDate.getDate()-7);
    renderWeek();
  };
}

if(nextWeek){
  nextWeek.onclick=()=>{
    baseDate.setDate(baseDate.getDate()+7);
    renderWeek();
  };
}

if(todayBtn){
  todayBtn.onclick=()=>{
    baseDate=new Date();
    renderWeek();
  };
}

renderWeek();
