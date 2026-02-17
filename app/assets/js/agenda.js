import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";
import { getActiveClinicId } from "./clinic-context.js";

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

const clinicId = await getActiveClinicId();

if (!clinicId) {
  alert("No hay clínica activa");
  throw new Error("clinicId missing");
}

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

/* ================= CONFIG ================= */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];
const DAYS = ["mon","tue","wed","thu","fri"];

/* ================= DOM ================= */

const grid = document.getElementById("agendaGrid");
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

  const appointments = apptSnap.docs.map(d=>({ id:d.id,...d.data() }));

  const availabilitySnap = await getDoc(
    doc(db,"clinics",clinicId,"availability",`${user.uid}_${weekStart}`)
  );

  const availability = availabilitySnap.exists()
    ? availabilitySnap.data().slots || {}
    : {};

  grid.appendChild(document.createElement("div"));

  DAYS.forEach((_,i)=>{
    const d = new Date(monday);
    d.setDate(d.getDate()+i);
    const label = document.createElement("div");
    label.className="day-label";
    label.textContent=d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(label);
  });

  HOURS.forEach(hour=>{
    MINUTES.forEach(minute=>{

      const label=document.createElement("div");
      label.className="hour-label";
      label.textContent=`${pad(hour)}:${pad(minute)}`;
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
          const cur=hour*60+minute;

          if(cur===startMin){

            const blocks=(endMin-startMin)/30;
            cell.style.gridRow=`span ${blocks}`;

            cell.classList.add(
              appointment.paid?"paid":
              appointment.completed?"done":"busy"
            );

            cell.innerHTML=`<strong>${appointment.name||"—"}</strong>`;
            cell.onclick=()=>openEdit(appointment);

          } else {
            cell.style.display="none";
          }

        } else if(availability[slotKey]){

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
  currentSlot=slot;
  start.value=`${pad(slot.hour)}:${pad(slot.minute)}`;
  const endDate=new Date(0,0,0,slot.hour,slot.minute);
  endDate.setMinutes(endDate.getMinutes()+60);
  end.value=`${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
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

closeBtn?.addEventListener("click",()=>modal.classList.remove("show"));

/* ================= SAVE ================= */

document.getElementById("save")?.addEventListener("click",async()=>{

  const user=auth.currentUser;
  if(!user||!currentSlot) return;

  const payload={
    clinicId,
    therapistId:user.uid,
    date:currentSlot.date,
    start:start.value,
    end:end.value,
    modality:modality.value,
    patientId:null,
    name:name.value,
    phone:phone.value,
    service:service.value,
    amount:Number(amount.value||0),
    completed:completed.checked,
    paid:paid.checked
  };

  if(editingId){

    await updateDoc(
      doc(db,"clinics",clinicId,"appointments",editingId),
      {...payload,updatedAt:Timestamp.now()}
    );

    if(payload.completed && payload.paid){
      await emitInvoiceCF({appointmentId:editingId});
    }

  } else {

    const result=await createAppointmentCF(payload);

    if(!result.data?.ok){
      alert("Error creando cita");
      return;
    }

    const appointmentId=result.data.appointmentId;

    await sendAppointmentNotification({appointmentId});

    if(payload.completed && payload.paid){
      await emitInvoiceCF({appointmentId});
    }
  }

  modal.classList.remove("show");
  await renderWeek();
});

/* ================= START ================= */

renderWeek();
