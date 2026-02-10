import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   INIT
========================= */
await requireAuth();
await loadMenu();

/* =========================
   STATE
========================= */
let baseDate = new Date();
let editingId = null;
let selectedPatientId = null;
let selectedPatientDuration = 60;
let selectedPatientPrice = null;
let currentSlot = null;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const SUBSLOTS = ["00", "30"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/* =========================
   DOM
========================= */
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

/* =========================
   HELPERS
========================= */
const pad = n => String(n).padStart(2, "0");
const formatDate = d => d.toISOString().slice(0, 10);

function addMinutes(time, mins) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m + mins, 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mondayOf(d) {
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatWeekLabel(monday) {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

function dayFromKey(monday, key) {
  const idx = DAYS.indexOf(key);
  const d = new Date(monday);
  d.setDate(d.getDate() + idx);
  return d;
}

/* =========================
   MODAL
========================= */
function resetModal() {
  editingId = null;
  selectedPatientId = null;
  selectedPatientDuration = 60;
  selectedPatientPrice = null;
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
}

function openNew(slot) {
  resetModal();
  currentSlot = slot;

  start.value = slot.time;
  end.value = addMinutes(slot.time, 30);

  modal.classList.add("show");
}

function openEdit(a) {
  resetModal();
  editingId = a.id;
  selectedPatientId = a.patientId || null;
  selectedPatientDuration = a.duration || 60;
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

  modal.classList.add("show");
}

document.getElementById("close").onclick = () =>
  modal.classList.remove("show");

/* =========================
   AUTOCOMPLETE PACIENTES
========================= */
async function searchPatients(term) {
  if (!term || term.length < 2) {
    suggestions.innerHTML = "";
    return;
  }

  const q = query(
    collection(db, "patients_normalized"),
    where("keywords", "array-contains", term.toLowerCase())
  );

  const snap = await getDocs(q);
  suggestions.innerHTML = "";

  snap.forEach(d => {
    const p = d.data();
    const div = document.createElement("div");
    div.textContent = `${p.nombre || ""} ${p.apellidos || ""} · ${p.telefono || ""}`;
    div.onclick = () => {
      selectedPatientId = d.id;
      selectedPatientDuration = p.sessionDuration || 60;

      phone.value = p.telefono || "";
      name.value = `${p.nombre || ""} ${p.apellidos || ""}`.trim();

      end.value = addMinutes(start.value, selectedPatientDuration);

      // 👉 PRECIO AUTOMÁTICO
      if (p.patientType === "mutual" && p.mutual?.pricePerSession) {
        selectedPatientPrice = Number(p.mutual.pricePerSession);
        amount.value = selectedPatientPrice;
      } else {
        selectedPatientPrice = null;
        amount.value = "";
      }

      suggestions.innerHTML = "";
    };
    suggestions.appendChild(div);
  });
}

phone.oninput = e => {
  selectedPatientId = null;
  searchPatients(e.target.value);
};

name.oninput = e => {
  selectedPatientId = null;
  searchPatients(e.target.value);
};

start.onchange = () => {
  end.value = addMinutes(start.value, selectedPatientDuration);
};

/* =========================
   SAVE
========================= */
document.getElementById("save").onclick = async () => {
  const user = auth.currentUser;
  if (!user || !currentSlot) return;

  if (!selectedPatientId) {
    alert("Selecciona un paciente válido");
    return;
  }

  const data = {
    therapistId: user.uid,
    patientId: selectedPatientId,
    date: currentSlot.date,
    phone: phone.value,
    name: name.value,
    service: service.value,
    modality: modality.value,
    start: start.value,
    end: end.value,
    duration: selectedPatientDuration,
    completed: completed.checked,
    paid: paid.checked,
    amount: Number(amount.value || 0),
    updatedAt: Timestamp.now()
  };

  let appointmentId;

  if (editingId) {
    await updateDoc(doc(db, "appointments", editingId), data);
    appointmentId = editingId;
  } else {
    const ref = await addDoc(collection(db, "appointments"), {
      ...data,
      createdAt: Timestamp.now()
    });
    appointmentId = ref.id;
  }

  modal.classList.remove("show");
  await renderWeek();
};

/* =========================
   RENDER WEEK (SIN CAMBIOS)
========================= */
// … el resto del archivo queda EXACTAMENTE IGUAL
