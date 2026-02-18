import { requireAuth } from "./auth.js";
import { db } from "./firebase.js";
import { getClinicContext } from "./clinic-context.js";

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

console.log("DB instance:", db);

/* ================= INIT ================= */

const user = await requireAuth();
const { clinicId } = await getClinicContext();

if (!clinicId) {
  alert("No hay clínica seleccionada");
  throw new Error("ClinicId missing");
}

import { app } from "./firebase.js";
const functions = getFunctions(app);

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

/* ================= AUTOCOMPLETE ================= */

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

function normalizePhone(phone){
  return (phone || "").replace(/\D/g, "");
}

function clearAutocomplete(){
  autocompleteBox.innerHTML = "";
  autocompleteBox.style.display = "none";
}

function selectPatient(patient){
  selectedPatient = patient;

  const fullName =
    `${patient.nombre || patient.name || ""} ${patient.apellidos || ""}`.trim();

  nameInput.value = fullName;
  phoneInput.value = patient.phone || patient.telefono || "";

  clearAutocomplete();
}

nameInput.addEventListener("input", (e)=>{

  const raw = e.target.value.trim();
  const text = raw.toLowerCase();

  selectedPatient = null;
  clearTimeout(debounceTimer);

  if(text.length < 2){
    clearAutocomplete();
    return;
  }

  debounceTimer = setTimeout(async ()=>{

    const snap = await getDocs(
      query(
        collection(
          doc(db,"clinics",clinicId),
          "patients_normalized"
        ),
        limit(100)
      )
    );

    const isPhoneSearch = /^\+?\d+$/.test(raw);

    let results = snap.docs
      .map(d=>({id:d.id,...d.data()}))
      .filter(p=>{

        const name =
          `${p.nombre || p.name || ""} ${p.apellidos || ""}`.toLowerCase();

        const phone =
          normalizePhone(p.phone || p.telefono || "");

        if(isPhoneSearch){
          return phone.includes(normalizePhone(raw));
        }

        return name.includes(text);
      });

    if(isPhoneSearch){
      const exact = results.find(p =>
        normalizePhone(p.phone || p.telefono) === normalizePhone(raw)
      );
      if(exact){
        selectPatient(exact);
        return;
      }
    }

    results = results.slice(0,8);

    if(!results.length){
      clearAutocomplete();
      return;
    }

    autocompleteBox.innerHTML = "";

    results.forEach(patient=>{
      const item=document.createElement("div");
      item.style.padding="8px";
      item.style.cursor="pointer";
      item.style.borderBottom="1px solid #eee";

      const name =
        `${patient.nombre || patient.name || ""} ${patient.apellidos || ""}`;

      const phone =
        patient.phone || patient.telefono || "";

      item.innerHTML=
        `<strong>${name}</strong><br><small>${phone}</small>`;

      item.onclick=()=>selectPatient(patient);

      autocompleteBox.appendChild(item);
    });

    autocompleteBox.style.display="block";

  },200);
});

/* ================= RENDER ================= */

async function renderWeek(){

  grid.innerHTML = "";

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((baseDate.getDay()+6)%7));

  const weekStart = monday.toISOString().slice(0,10);
  const weekEnd = new Date(monday.getTime()+4*86400000).toISOString().slice(0,10);

  const availabilityRes = await getAvailabilityCF({
    clinicId,
    therapistId: user.uid,
    weekStart
  });

  const snap = await getDocs(query(
    collection(
      doc(db,"clinics",clinicId),
      "appointments"
    ),
    where("therapistId","==",user.uid),
    where("date",">=",weekStart),
    where("date","<=",weekEnd)
  ));

  const appointments = snap.docs.map(d=>({id:d.id,...d.data()}));

  console.log("Appointments:", appointments);
}

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
    }else{
      await createAppointmentCF(payload);
    }

    modal.classList.remove("show");
    await renderWeek();

  }catch(err){
    alert(err.message||"Error guardando cita");
  }
};

renderWeek();
