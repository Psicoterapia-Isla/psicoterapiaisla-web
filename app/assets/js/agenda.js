import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";
import { getCurrentClinicId } from "./clinic-context.js";

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

const clinicId = await getCurrentClinicId();
if (!clinicId) throw new Error("No clinic selected");

/* ================= CLOUD ================= */

const functions = getFunctions(undefined, "us-central1");

const createAppointmentCF = httpsCallable(functions, "createAppointment");
const sendAppointmentNotification = httpsCallable(functions, "sendAppointmentNotification");
const emitInvoiceCF = httpsCallable(functions, "emitInvoice");

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

function minutesOf(t){
  const [h,m] = t.split(":").map(Number);
  return h*60 + m;
}

/* ================= AUTOCOMPLETE ================= */

async function searchPatients(term){

  if(!term || term.length < 2){
    suggestions.innerHTML = "";
    return;
  }

  const snap = await getDocs(query(
    collection(db, "patients_normalized"),
    where("keywords", "array-contains", term.toLowerCase())
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
      name.value = `${p.nombre || ""} ${p.apellidos || ""}`.trim();

      const duration = p.patientType === "mutual" ? 30 : 60;

      if(start.value){
        const [h,m] = start.value.split(":").map(Number);
        const dEnd = new Date(0,0,0,h,m);
        dEnd.setMinutes(dEnd.getMinutes()+duration);
        end.value = timeString(dEnd.getHours(), dEnd.getMinutes());
      }

      if(p.patientType === "mutual"){
        amount.value = p.mutual?.pricePerSession || 0;
      }

      suggestions.innerHTML="";
    };

    suggestions.appendChild(item);
  });
}

phone?.addEventListener("input", e => searchPatients(e.target.value));
name?.addEventListener("input", e => searchPatients(e.target.value));

/* ================= RENDER ================= */

async function renderWeek(){

  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  const weekStart = formatDate(monday);
  const weekEnd = formatDate(new Date(monday.getTime()+4*86400000));

  const user = auth.currentUser;

  const apptSnap = await getDocs(query(
    collection(db,"clinics",clinicId,"appointments"),
    where("therapistId","==",user.uid),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const appointments = apptSnap.docs.map(d=>({ id:d.id, ...d.data() }));

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
        const cell=document.createElement("div");
        cell.className="slot";

        const appointment = appointments.find(a=>{
          if(a.date !== date) return false;
          const cur = hour*60+minute;
          return cur>=minutesOf(a.start) && cur<minutesOf(a.end);
        });

        if(appointment){

          const startMin = minutesOf(appointment.start);
          const curMin = hour*60+minute;

          if(curMin === startMin){

            const blocks=(minutesOf(appointment.end)-startMin)/30;
            cell.style.gridRow=`span ${blocks}`;

            cell.classList.add(
              appointment.paid ? "paid" :
              appointment.completed ? "done" : "busy"
            );

            cell.innerHTML=`<strong>${appointment.name||"—"}</strong>`;
            cell.onclick=()=>openEdit(appointment);

          } else {
            cell.style.display="none";
          }

        } else {

          cell.classList.add("available");
          cell.onclick=()=>openNew({date,hour,minute});
        }

        grid.appendChild(cell);
      });
    });
  });
}

/* ================= SAVE ================= */

document.getElementById("save")?.addEventListener("click", async () => {

  const user = auth.currentUser;

  const payload = {
    clinicId,
    therapistId: user.uid,
    date: currentSlot.date,
    start: start.value,
    end: end.value,
    modality: modality.value,
    patientId: selectedPatient?.id || null,
    name: name.value,
    phone: phone.value,
    service: service.value,
    amount: Number(amount.value||0),
    completed: completed.checked,
    paid: paid.checked
  };

  if(editingId){

    await updateDoc(
      doc(db,"clinics",clinicId,"appointments",editingId),
      {...payload,updatedAt:Timestamp.now()}
    );

    if(completed.checked && paid.checked){
      await emitInvoiceCF({clinicId,appointmentId:editingId});
    }

  } else {

    const result = await createAppointmentCF(payload);

    if(!result.data?.ok){
      alert("Error creando cita");
      return;
    }

    const appointmentId = result.data.appointmentId;

    await sendAppointmentNotification({clinicId,appointmentId});

    if(completed.checked && paid.checked){
      await emitInvoiceCF({clinicId,appointmentId});
    }
  }

  modal.classList.remove("show");
  await renderWeek();
});

/* ================= START ================= */

renderWeek();
