import { requireAuth } from "./auth.js";
import { db } from "./firebase.js";
import { getCurrentClinicId } from "./clinic-context.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

/* ================= INIT ================= */

const user = await requireAuth();
const clinicId = await getCurrentClinicId();

if (!clinicId) {
  alert("No hay clínica seleccionada");
  throw new Error("ClinicId missing");
}

const functions = getFunctions(undefined, "us-central1");

const createAppointmentCF = httpsCallable(functions, "createAppointment");
const getAvailabilityCF = httpsCallable(functions, "getAvailability");

/* ================= CONFIG ================= */

const THERAPIST_ID = "LOSSPrBskLPpb547zED5hO2zYS62"; // <-- cambiar si es dinámico
const START_HOUR = 9;
const END_HOUR = 20;
const SLOT_INTERVAL = 30;

let baseDate = new Date();

/* ================= DOM ================= */

const agendaContainer = document.getElementById("agendaGrid");
const currentWeekLabel = document.getElementById("currentWeek");
const prevBtn = document.getElementById("prev-week");
const nextBtn = document.getElementById("next-week");

/* ================= HELPERS ================= */

function pad(n){ return String(n).padStart(2,"0"); }

function formatDate(date){
  return date.toISOString().split("T")[0];
}

function getMonday(d){
  const date = new Date(d);
  const day = (date.getDay()+6)%7;
  date.setDate(date.getDate()-day);
  date.setHours(0,0,0,0);
  return date;
}

function minutesOf(time){
  const [h,m]=time.split(":").map(Number);
  return h*60+m;
}

/* ================= RENDER ================= */

async function renderWeek(date){

  agendaContainer.innerHTML="";

  const monday=getMonday(date);

  currentWeekLabel.textContent=
    monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})+
    " - "+
    new Date(monday.getTime()+4*86400000)
      .toLocaleDateString("es-ES",{day:"numeric",month:"short"});

  const weekStart=formatDate(monday);
  const weekEnd=formatDate(new Date(monday.getTime()+4*86400000));

  /* ================= DISPONIBILIDAD ================= */

  const availabilityRes = await getAvailabilityCF({
    clinicId,
    therapistId: THERAPIST_ID,
    weekStart
  });

  const availability = availabilityRes.data.slots || {};

  /* ================= CITAS EXISTENTES (solo fechas y horas) ================= */

  const snap = await getDocs(query(
    collection(db,"clinics",clinicId,"appointments"),
    where("therapistId","==",THERAPIST_ID),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const appointments = snap.docs.map(d=>d.data());

  /* ================= HEADER ================= */

  agendaContainer.appendChild(document.createElement("div"));

  const days=["L","M","X","J","V"];

  days.forEach(day=>{
    const label=document.createElement("div");
    label.className="day-label";
    label.textContent=day;
    agendaContainer.appendChild(label);
  });

  /* ================= SLOTS ================= */

  for(let hour=START_HOUR;hour<END_HOUR;hour++){
    for(let min=0;min<60;min+=SLOT_INTERVAL){

      const hourLabel=document.createElement("div");
      hourLabel.className="hour-label";
      hourLabel.textContent=`${pad(hour)}:${min===0?"00":"30"}`;
      agendaContainer.appendChild(hourLabel);

      for(let i=0;i<5;i++){

        const day=new Date(monday);
        day.setDate(monday.getDate()+i);
        const dateStr=formatDate(day);

        const slot=document.createElement("div");
        slot.className="slot";

        const slotKey=`${["mon","tue","wed","thu","fri"][i]}_${hour}_${min}`;

        const start=`${pad(hour)}:${min===0?"00":"30"}`;

        const isAvailable=availability[slotKey];

        const isBooked=appointments.some(a=>{
          if(a.date!==dateStr) return false;
          const cur=minutesOf(start);
          return cur>=minutesOf(a.start) && cur<minutesOf(a.end);
        });

        if(isAvailable && !isBooked){

          slot.classList.add("available");

          slot.onclick=async()=>{

            try{

              slot.style.pointerEvents="none";

              const endDate=new Date(0,0,0,hour,min);
              endDate.setMinutes(endDate.getMinutes()+60);

              const end=`${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

              const result=await createAppointmentCF({
                clinicId,
                therapistId:THERAPIST_ID,
                date:dateStr,
                start,
                end,
                modality:"online"
              });

              if(result.data?.ok){
                await renderWeek(baseDate);
              }

            }catch(err){

              alert(err.message||"No se pudo reservar");
              slot.style.pointerEvents="auto";

            }
          };

        }else{

          slot.classList.add("disabled");

        }

        agendaContainer.appendChild(slot);
      }
    }
  }
}

/* ================= NAV ================= */

prevBtn.onclick=()=>{
  baseDate.setDate(baseDate.getDate()-7);
  renderWeek(baseDate);
};

nextBtn.onclick=()=>{
  baseDate.setDate(baseDate.getDate()+7);
  renderWeek(baseDate);
};

/* ================= START ================= */

renderWeek(baseDate);
