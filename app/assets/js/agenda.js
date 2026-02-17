import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";
import { getClinicId } from "./clinic-context.js";
import { loadAvailability } from "./availability.js";

import {
  collection,
  query,
  where,
  getDocs,
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
const emitInvoiceCF = httpsCallable(functions, "emitInvoice");

/* ================= STATE ================= */

let baseDate = new Date();
let editingId = null;
let selectedPatient = null;
let currentSlot = null;
let availability = {};
let clinicId = null;

/* ================= CONFIG ================= */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];
const DAYS = ["mon","tue","wed","thu","fri"];

/* ================= DOM ================= */

const grid = document.getElementById("agendaGrid");
const modal = document.getElementById("modal");

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

function timeString(h,m){
  return `${pad(h)}:${pad(m)}`;
}

function minutesOf(time){
  const [h,m] = time.split(":").map(Number);
  return h*60+m;
}

function dayFromKey(monday,key){
  const d=new Date(monday);
  d.setDate(d.getDate()+DAYS.indexOf(key));
  return d;
}

/* =====================================================
   RENDER WEEK
===================================================== */

async function renderWeek(){

  const user = auth.currentUser;
  if(!user) return;

  clinicId = await getClinicId();
  if(!clinicId) return;

  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  const weekStart = formatDate(monday);
  const weekEnd = formatDate(new Date(monday.getTime()+4*86400000));

  availability = await loadAvailability(weekStart);

  const apptSnap = await getDocs(query(
    collection(db,"clinics",clinicId,"appointments"),
    where("therapistId","==",user.uid),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const appointments = [];
  apptSnap.forEach(d=>appointments.push({id:d.id,...d.data()}));

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

        /* ===== SI HAY CITA ===== */

        if(appointment){

          const startM=minutesOf(appointment.start);
          const endM=minutesOf(appointment.end);
          const curM=hour*60+minute;

          if(curM===startM){

            const blocks=(endM-startM)/30;
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

        }

        /* ===== DISPONIBLE SEGÚN AVAILABILITY ===== */

        else if(availability[slotKey]){

          cell.classList.add("available");
          cell.onclick=()=>openNew({date,hour,minute});

        }

        /* ===== NO DISPONIBLE ===== */

        else{
          cell.classList.add("disabled");
        }

        grid.appendChild(cell);
      });
    });
  });
}

/* =====================================================
   MODAL
===================================================== */

function openNew(slot){
  editingId=null;
  selectedPatient=null;
  currentSlot=slot;

  document.getElementById("start").value=timeString(slot.hour,slot.minute);

  const endDate=new Date(0,0,0,slot.hour,slot.minute);
  endDate.setMinutes(endDate.getMinutes()+60);
  document.getElementById("end").value=timeString(endDate.getHours(),endDate.getMinutes());

  modal.classList.add("show");
}

function openEdit(a){

  editingId=a.id;
  currentSlot={date:a.date};

  document.getElementById("phone").value=a.phone||"";
  document.getElementById("name").value=a.name||"";
  document.getElementById("service").value=a.service||"";
  document.getElementById("modality").value=a.modality;
  document.getElementById("start").value=a.start;
  document.getElementById("end").value=a.end;
  document.getElementById("completed").checked=!!a.completed;
  document.getElementById("paid").checked=!!a.paid;
  document.getElementById("amount").value=a.amount||"";

  modal.classList.add("show");
}

/* =====================================================
   SAVE
===================================================== */

document.getElementById("save")?.addEventListener("click",async()=>{

  const user=auth.currentUser;
  if(!user||!currentSlot) return;

  const payload={
    therapistId:user.uid,
    clinicId,
    date:currentSlot.date,
    start:document.getElementById("start").value,
    end:document.getElementById("end").value,
    modality:document.getElementById("modality").value,
    patientId:selectedPatient?.id||null,
    name:document.getElementById("name").value,
    phone:document.getElementById("phone").value,
    service:document.getElementById("service").value,
    amount:Number(document.getElementById("amount").value||0),
    completed:document.getElementById("completed").checked,
    paid:document.getElementById("paid").checked
  };

  if(editingId){

    await updateDoc(
      doc(db,"clinics",clinicId,"appointments",editingId),
      {...payload,updatedAt:Timestamp.now()}
    );

    if(payload.completed&&payload.paid){
      await emitInvoiceCF({appointmentId:editingId,clinicId});
    }

  }else{

    const result=await createAppointmentCF(payload);
    const appointmentId=result.data.appointmentId;

    await sendAppointmentNotification({appointmentId,clinicId});

    if(payload.completed&&payload.paid){
      await emitInvoiceCF({appointmentId,clinicId});
    }
  }

  modal.classList.remove("show");
  await renderWeek();
});

/* ================= START ================= */

renderWeek();
