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

/* ================= FUNCTIONS ================= */

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

function minutesOf(time){
  const [h,m] = time.split(":").map(Number);
  return h*60 + m;
}

function timeString(h,m){
  return `${pad(h)}:${pad(m)}`;
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
    item.textContent = `${p.nombre} ${p.apellidos} · ${p.telefono || ""}`;

    item.onclick = () => {

      selectedPatient = { id: d.id, ...p };

      phone.value = p.telefono || "";
      name.value = `${p.nombre} ${p.apellidos}`;

      const duration = p.patientType === "mutual" ? 30 : 60;

      const [h,m] = start.value.split(":").map(Number);
      const endDate = new Date(0,0,0,h,m);
      endDate.setMinutes(endDate.getMinutes() + duration);
      end.value = timeString(endDate.getHours(), endDate.getMinutes());

      if(p.patientType === "mutual"){
        amount.value = p.mutual?.pricePerSession || 0;
      }

      suggestions.innerHTML = "";
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
  if(!user) return;

  const availSnap = await getDoc(doc(db,"availability",`${user.uid}_${weekStart}`));
  const availability = availSnap.exists() ? availSnap.data().slots || {} : {};

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
    const d=new Date(monday);
    d.setDate(d.getDate()+i);
    const h=document.createElement("div");
    h.className="day-label";
    h.textContent=d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
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
        const slotKey=`${day}_${hour}_${minute}`;

        const cell=document.createElement("div");
        cell.className="slot";

        const appointment=appointments.find(a=>{
          if(a.date!==date) return false;
          const cur=hour*60+minute;
          return cur>=minutesOf(a.start) && cur<minutesOf(a.end);
        });

        if(appointment){

          const startMin=minutesOf(appointment.start);
          const endMin=minutesOf(appointment.end);
          const currentMin=hour*60+minute;

          if(currentMin===startMin){

            const blocks=(endMin-startMin)/30;
            cell.style.gridRow=`span ${blocks}`;

            cell.classList.add(
              appointment.paid ? "paid" :
              appointment.completed ? "done" : "busy"
            );

            cell.innerHTML=`<strong>${appointment.name || "—"}</strong>`;
            cell.onclick=()=>openEdit(appointment);

          }else{
            cell.style.display="none";
          }

        } else if(availability[slotKey]) {

          cell.classList.add("available");
          cell.onclick=()=>openNew({date,hour,minute});

        } else {

          cell.classList.add("disabled");

        }

        grid.appendChild(cell);
      });
    });
  });
}

/* ================= MODAL ================= */

function openNew(slot){
  editingId=null;
  selectedPatient=null;
  currentSlot=slot;

  start.value=timeString(slot.hour,slot.minute);
  const endDate=new Date(0,0,0,slot.hour,slot.minute);
  endDate.setMinutes(endDate.getMinutes()+60);
  end.value=timeString(endDate.getHours(),endDate.getMinutes());

  modal.classList.add("show");
}

function openEdit(a){
  editingId=a.id;
  currentSlot={date:a.date};

  phone.value=a.phone||"";
  name.value=a.name||"";
  service.value=a.service||"";
  modality.value=a.modality;
  start.value=a.start;
  end.value=a.end;
  completed.checked=!!a.completed;
  paid.checked=!!a.paid;
  amount.value=a.amount||"";

  modal.classList.add("show");
}

/* ================= SAVE ================= */

document.getElementById("save")?.addEventListener("click", async ()=>{

  const user=auth.currentUser;
  if(!user||!currentSlot) return;

  if(!editingId && !selectedPatient){
    alert("Debes seleccionar un paciente válido.");
    return;
  }

  const payload={
    therapistId:user.uid,
    date:currentSlot.date,
    start:start.value,
    end:end.value,
    modality:modality.value,
    patientId:selectedPatient?.id||null,
    name:name.value,
    phone:phone.value,
    service:service.value,
    amount:Number(amount.value||0),
    completed:completed.checked,
    paid:paid.checked
  };

  try{

    let appointmentId;

    if(editingId){

      await updateDoc(doc(db,"appointments",editingId),{
        ...payload,
        updatedAt:Timestamp.now()
      });

      appointmentId=editingId;

    }else{

      const result=await createAppointmentCF(payload);
      appointmentId=result.data.appointmentId;

      await sendAppointmentNotification({appointmentId});
    }

    if(completed.checked && paid.checked){
      await emitInvoiceCF({appointmentId});
    }

    modal.classList.remove("show");
    await renderWeek();

  }catch(err){
    console.error(err);
    alert("Error guardando cita.");
  }
});

/* ================= START ================= */

renderWeek();
