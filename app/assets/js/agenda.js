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
let currentInvoiceId = null;

/* ================= CONFIG ================= */

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

function setFieldsDisabled(disabled){
  [phone,name,service,modality,start,end,completed,paid,amount]
    .forEach(el => el.disabled = disabled);
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

      const duration =
        p.patientType === "mutual" ? 30 : 60;

      const [h,m] = start.value.split(":").map(Number);

      const endDate = new Date(0,0,0,h,m+duration);
      end.value =
        timeString(endDate.getHours(),endDate.getMinutes());

      if(p.patientType === "mutual"){
        amount.value =
          p.mutual?.pricePerSession || 0;
      }

      suggestions.innerHTML = "";
    };

    suggestions.appendChild(item);
  });
}

phone.addEventListener("input", e => searchPatients(e.target.value));
name.addEventListener("input", e => searchPatients(e.target.value));

document.addEventListener("click", (e)=>{
  if(!e.target.closest(".autocomplete-wrapper")){
    suggestions.innerHTML = "";
  }
});

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

async function createInvoice(data, appointmentId){

  if(data.invoiceId) return;

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

/* ================= SAVE ================= */

document.getElementById("save").onclick = async () => {

  const user = auth.currentUser;
  if(!user || !currentSlot) return;

  const monday = mondayOf(baseDate);
  const weekStart = formatDate(monday);

  const availRef = doc(db,"availability",`${user.uid}_${weekStart}`);
  const availSnap = await getDoc(availRef);

  const availabilityData = availSnap.exists() ? availSnap.data() : {};
  const availabilitySlots = availabilityData.slots || {};
  const availabilityLocations = availabilityData.locations || {};

  const startTime = start.value;
  const endTime = end.value;

  const startMin = minutesOf(startTime);
  const endMin = minutesOf(endTime);

  const dayIndex = new Date(currentSlot.date).getDay();
  const dayKey = DAYS[(dayIndex + 6) % 7];

  /* VALIDAR SEDE DEL DÍA */

  const baseLocation = availabilityLocations[dayKey]?.base || "viladecans";

  if(modality.value !== "online" && modality.value !== baseLocation){
    alert("La modalidad no coincide con la sede configurada para ese día");
    return;
  }

  /* VALIDAR DISPONIBILIDAD */

  for(let m = startMin; m < endMin; m += 30){
    const h = Math.floor(m/60);
    const min = m % 60;
    const slotKey = `${dayKey}_${h}_${min}`;

    if(!availabilitySlots[slotKey]){
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
    alert("Solapamiento con otra cita");
    return;
  }

  /* GUARDAR */

  const data = {
    therapistId: user.uid,
    patientId: selectedPatient?.id || null,
    patient: selectedPatient || null,
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

  if(data.completed && data.paid && data.amount){
    await createInvoice(data,id);
  }

  /* ENVÍO WHATSAPP RESTAURADO */

  if(phone.value){
    const text = encodeURIComponent(
      `Hola ${name.value}, te confirmo tu cita el ${currentSlot.date} de ${startTime} a ${endTime}.`
    );
    window.open(`https://wa.me/${phone.value}?text=${text}`, "_blank");
  }

  modal.classList.remove("show");
  await renderWeek();
};
