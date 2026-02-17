import { requireAuth } from "./auth.js";
import { db } from "./firebase.js";
import { getCurrentClinicId } from "./clinic-context.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  limit
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
const sendAppointmentNotificationCF = httpsCallable(functions, "sendAppointmentNotification");
const emitInvoiceCF = httpsCallable(functions, "emitInvoice");
const getAvailabilityCF = httpsCallable(functions, "getAvailability");

/* ================= CONFIG ================= */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const MINUTES = [0, 30];
const DAYS = ["mon","tue","wed","thu","fri"];

let baseDate = new Date();
let editingId = null;
let currentSlot = null;

/* ================= DOM ================= */

const grid = document.getElementById("agendaGrid");
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("close");
const saveBtn = document.getElementById("save");

const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const serviceInput = document.getElementById("service");
const modalityInput = document.getElementById("modality");
const startInput = document.getElementById("start");
const endInput = document.getElementById("end");
const completedInput = document.getElementById("completed");
const paidInput = document.getElementById("paid");
const amountInput = document.getElementById("amount");

/* ================= AUTOCOMPLETE CORREGIDO ================= */

let selectedPatient = null;
let debounceTimer = null;

const autocompleteBox = document.createElement("div");
autocompleteBox.className = "autocomplete-box";
autocompleteBox.style.position = "absolute";
autocompleteBox.style.background = "#fff";
autocompleteBox.style.border = "1px solid #ddd";
autocompleteBox.style.borderRadius = "8px";
autocompleteBox.style.maxHeight = "200px";
autocompleteBox.style.overflowY = "auto";
autocompleteBox.style.zIndex = "9999";
autocompleteBox.style.display = "none";

nameInput.parentElement.appendChild(autocompleteBox);

function clearAutocomplete(){
  autocompleteBox.innerHTML = "";
  autocompleteBox.style.display = "none";
}

function selectPatient(patient){

  selectedPatient = patient;

  const fullName = `${patient.nombre || patient.name || ""} ${patient.apellidos || ""}`.trim();

  nameInput.value = fullName;
  phoneInput.value = patient.phone || patient.telefono || "";

  clearAutocomplete();
}

nameInput.addEventListener("input", (e) => {

  const text = e.target.value.trim().toLowerCase();

  selectedPatient = null;

  clearTimeout(debounceTimer);

  if (text.length < 2){
    clearAutocomplete();
    return;
  }

  debounceTimer = setTimeout(async () => {

    try {

      const snap = await getDocs(
        query(
          collection(db, "patients_normalized"),
          limit(50)
        )
      );

      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => {

          const name =
            `${p.nombre || p.name || ""} ${p.apellidos || ""}`
            .toLowerCase();

          const phone =
            `${p.phone || p.telefono || ""}`;

          return (
            name.includes(text) ||
            phone.includes(text)
          );
        })
        .slice(0, 8);

      if (!results.length){
        clearAutocomplete();
        return;
      }

      autocompleteBox.innerHTML = "";

      results.forEach(patient => {

        const item = document.createElement("div");

        item.style.padding = "8px";
        item.style.cursor = "pointer";
        item.style.borderBottom = "1px solid #eee";

        const name =
          `${patient.nombre || patient.name || ""} ${patient.apellidos || ""}`.trim();

        const phone =
          patient.phone || patient.telefono || "";

        item.innerHTML =
          `<strong>${name}</strong><br><small>${phone}</small>`;

        item.onclick = () => selectPatient(patient);

        autocompleteBox.appendChild(item);

      });

      autocompleteBox.style.display = "block";

    }
    catch(e){
      console.error(e);
    }

  }, 200);

});

document.addEventListener("click", (e) => {

  if (!autocompleteBox.contains(e.target) && e.target !== nameInput){
    clearAutocomplete();
  }

});

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

  const availabilityRes = await getAvailabilityCF({
    clinicId,
    therapistId: user.uid,
    weekStart
  });

  const availability = availabilityRes.data.slots || {};

  const snap = await getDocs(query(
    collection(db,"clinics",clinicId,"appointments"),
    where("therapistId","==",user.uid),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const appointments = snap.docs.map(d=>({id:d.id,...d.data()}));

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

      const label = document.createElement("div");
      label.className="hour-label";
      label.textContent = `${pad(hour)}:${minute===0?"00":"30"}`;
      grid.appendChild(label);

      DAYS.forEach((day,dayIndex)=>{

        const dateObj = new Date(monday);
        dateObj.setDate(monday.getDate()+dayIndex);
        const date = formatDate(dateObj);

        const slotKey = `${day}_${hour}_${minute}`;

        const cell = document.createElement("div");
        cell.className="slot";

        const appointment = appointments.find(a=>{
          if(a.date !== date) return false;
          const cur = hour*60+minute;
          return cur >= minutesOf(a.start) && cur < minutesOf(a.end);
        });

        if (appointment){

          const startMin = minutesOf(appointment.start);
          const endMin = minutesOf(appointment.end);
          const currentMin = hour*60+minute;

          if(currentMin===startMin){

            const blocks=(endMin-startMin)/30;
            cell.style.gridRow=`span ${blocks}`;

            cell.classList.add(
              appointment.paid ? "paid" :
              appointment.completed ? "done" : "busy"
            );

            cell.innerHTML=`<strong>${appointment.patientName||"—"}</strong>`;
            cell.onclick=()=>openEdit(appointment);

          } else {
            cell.style.display="none";
          }

        } else if (availability[slotKey]) {

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

  nameInput.value="";
  phoneInput.value="";
  selectedPatient=null;

  startInput.value=`${pad(slot.hour)}:${slot.minute===0?"00":"30"}`;

  const endDate=new Date(0,0,0,slot.hour,slot.minute);
  endDate.setMinutes(endDate.getMinutes()+60);

  endInput.value=`${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

  modal.classList.add("show");
}

function openEdit(a){

  if(a.invoiceId){
    alert("Cita facturada. No editable.");
    return;
  }

  editingId=a.id;
  currentSlot={date:a.date};

  nameInput.value=a.patientName||"";
  phoneInput.value=a.phone||"";
  serviceInput.value=a.service||"";
  modalityInput.value=a.modality||"";
  startInput.value=a.start;
  endInput.value=a.end;
  completedInput.checked=!!a.completed;
  paidInput.checked=!!a.paid;
  amountInput.value=a.amount||"";

  modal.classList.add("show");
}

closeBtn.onclick=()=>modal.classList.remove("show");

/* ================= SAVE ================= */

saveBtn.onclick=async()=>{

  if(!currentSlot) return;

  if (!selectedPatient) {
  alert("Debes seleccionar un paciente existente");
  return;
}

const payload = {
  clinicId,
  therapistId: user.uid,
  patientId: selectedPatient.id,
  date: currentSlot.date,
  start: startInput.value,
  end: endInput.value,
  modality: modalityInput.value,
  name: `${selectedPatient.nombre || ""} ${selectedPatient.apellidos || ""}`.trim(),
  phone: selectedPatient.phone || "",
  service: serviceInput.value,
  amount: Number(amountInput.value || 0),
  completed: completedInput.checked,
  paid: paidInput.checked
};

  try{

    if(editingId){

      await updateDoc(
        doc(db,"clinics",clinicId,"appointments",editingId),
        {...payload,updatedAt:Timestamp.now()}
      );

      if(payload.completed && payload.paid){
        await emitInvoiceCF({clinicId,appointmentId:editingId});
      }

    }else{

      const result=await createAppointmentCF(payload);
      const appointmentId=result.data.appointmentId;

      if(appointmentId){

        const wa = await sendAppointmentNotificationCF({clinicId,appointmentId});

        if(wa.data?.whatsappUrl){
          window.open(wa.data.whatsappUrl,"_blank");
        }

        if(payload.completed && payload.paid){
          await emitInvoiceCF({clinicId,appointmentId});
        }
      }
    }

    modal.classList.remove("show");
    await renderWeek();

  }catch(err){
    alert(err.message||"Error guardando cita");
  }
};

renderWeek();
