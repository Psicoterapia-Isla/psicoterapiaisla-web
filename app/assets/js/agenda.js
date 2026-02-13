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
    patientType: data.patient?.patientType || "private",
    mutualName: data.patient?.mutual?.name || null,
    concept: data.service,
    baseAmount: data.amount,
    vatRate: 0,
    vatExemptReason: "Exento IVA – Art. 20.3 Ley 37/1992",
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

  /* VALIDAR DISPONIBILIDAD */

const realDate = new Date(y, Number(m) - 1, d);
const dayNumber = realDate.getDay();

const map = {1:"mon",2:"tue",3:"wed",4:"thu",5:"fri"};
const dayKey = map[dayNumber];

if (!dayKey) {
  alert("Día no permitido");
  return;
}

for (let minCursor = startMin; minCursor < endMin; minCursor += 30) {

  const h = Math.floor(minCursor / 60);
  const min = minCursor % 60;

  const slotKey = `${dayKey}_${h}_${min}`;

  if (!availability[slotKey] && !editingId) {
    alert("Horario fuera de disponibilidad");
    return;
  }
}

  /* VALIDAR SOLAPAMIENTO */

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
  }

  if (data.completed && data.paid && data.amount) {
    try {
      await createInvoice(data, id);
    } catch (err) {
      console.error("Error creando factura:", err);
      alert("La cita se guardó pero la factura falló.");
    }
  }

  modal.classList.remove("show");
  await renderWeek();
});
