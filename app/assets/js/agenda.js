import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

/* ================= INIT ================= */

await requireAuth();
await loadMenu();

/* ================= CLOUD FUNCTIONS ================= */

const functions = getFunctions(undefined, "us-central1");

const createAppointmentCF = httpsCallable(functions, "createAppointment");
const sendAppointmentNotification = httpsCallable(functions, "sendAppointmentNotification");

/* ================= STATE ================= */

let baseDate = new Date();
let editingId = null;
let selectedPatient = null;
let currentSlot = null;

/* ================= CONFIG ================= */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];
const DAYS = ["mon","tue","wed","thu","fri"];

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

/* ================= SAVE ================= */

document.getElementById("save")?.addEventListener("click", async () => {

  const user = auth.currentUser;
  if(!user || !currentSlot) return;

  const monday = mondayOf(baseDate);
const weekStart = formatDate(monday);

const [y,m,d] = currentSlot.date.split("-");
  const monday = mondayOf(baseDate);
  const weekStart = formatDate(monday);

  const availRef = doc(db,"availability",`${user.uid}_${weekStart}`);
  const availSnap = await getDoc(availRef);

  const availability = availSnap.exists() ? availSnap.data().slots || {} : {};
  const locations = availSnap.exists() ? availSnap.data().locations || {} : {};

  const startMin = minutesOf(start.value);
  const endMin = minutesOf(end.value);

  const realDate = new Date(y, m-1, d);
  const dayNumber = realDate.getDay();
  const map = {1:"mon",2:"tue",3:"wed",4:"thu",5:"fri"};
  const dayKey = map[dayNumber];

  if (!dayKey) return alert("Día no permitido");

  /* VALIDAR SEDE */

  const baseLocation = locations[dayKey]?.base || null;

  if(baseLocation && modality.value !== baseLocation && modality.value !== "online"){
    return alert("La sede no coincide con la disponibilidad del día");
  }

  /* VALIDAR SLOT DISPONIBLE */

  for (let minCursor = startMin; minCursor < endMin; minCursor += 30) {

    const h = Math.floor(minCursor / 60);
    const min = minCursor % 60;
    const slotKey = `${dayKey}_${h}_${min}`;

    if (!availability[slotKey] && !editingId) {
      return alert("Horario fuera de disponibilidad");
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

  /* ================= CREAR O ACTUALIZAR ================= */

  if(editingId){

    await updateDoc(doc(db,"appointments",editingId),{
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
    });

    modal.classList.remove("show");
    await renderWeek();
    return;
  }

  /* === CREACIÓN SEGURA DESDE CLOUD FUNCTION === */

  const result = await createAppointmentCF({
    therapistId: user.uid,
    date: currentSlot.date,
    start: start.value,
    modality: modality.value
  });

  if(!result.data?.ok){
    return alert("Error creando cita");
  }

  /* === ENVIAR WHATSAPP === */

  try {

    const newSnap = await getDocs(query(
      collection(db,"appointments"),
      where("therapistId","==",user.uid),
      where("date","==",currentSlot.date),
      where("start","==",start.value)
    ));

    const newAppointment = newSnap.docs[0];

    if(newAppointment){
      const wa = await sendAppointmentNotification({
        appointmentId: newAppointment.id
      });

      if(wa.data?.whatsappUrl){
        window.open(wa.data.whatsappUrl, "_blank");
      }
    }

  } catch (err) {
    console.error("Error enviando aviso:", err);
  }

  modal.classList.remove("show");
  await renderWeek();
});
