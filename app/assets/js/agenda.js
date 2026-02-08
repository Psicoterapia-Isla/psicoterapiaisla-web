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
let currentSlot = null;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
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
   DATE HELPERS
========================= */
const formatDate = d => d.toISOString().slice(0, 10);

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
  start.value = `${slot.hour}:00`;
  end.value = `${slot.hour + 1}:00`;
  modal.classList.add("show");
}

function openEdit(a) {
  resetModal();
  editingId = a.id;
  selectedPatientId = a.patientId || null;
  currentSlot = { date: a.date, hour: Number(a.start.split(":")[0]) };

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
   AUTOCOMPLETE
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
      phone.value = p.telefono || "";
      name.value = `${p.nombre || ""} ${p.apellidos || ""}`.trim();
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

/* =========================
   INVOICE NUMBER
========================= */
async function getNextInvoiceNumber(therapistId) {
  const year = new Date().getFullYear();
  const ref = doc(db, "invoice_counters", `${therapistId}_${year}`);

  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    let next = 1;

    if (snap.exists()) {
      next = snap.data().lastNumber + 1;
      tx.update(ref, { lastNumber: next, updatedAt: Timestamp.now() });
    } else {
      tx.set(ref, {
        therapistId,
        year,
        lastNumber: 1,
        createdAt: Timestamp.now()
      });
    }

    return `PI-${year}-${String(next).padStart(4,"0")}`;
  });
}

/* =========================
   FACTURA AUTOMÁTICA LEGAL
========================= */
async function maybeCreateInvoice(appointmentId, data) {
  if (!data.completed || !data.paid) return;
  if (!data.amount || data.amount <= 0) return;
  if (data.invoiceId) return;

  const invoiceNumber = await getNextInvoiceNumber(data.therapistId);

  const invoiceRef = await addDoc(collection(db, "invoices"), {
    therapistId: data.therapistId,
    appointmentId,

    invoiceNumber,
    issueDate: Timestamp.now(),

    patientId: data.patientId || null,
    patientName: data.name || null,

    concept: data.service,
    baseAmount: data.amount,
    vatRate: 0,
    vatExemptReason: "Exento IVA – Art. 20.3 Ley 37/1992",
    totalAmount: data.amount,

    status: "paid",
    createdAt: Timestamp.now()
  });

  await updateDoc(doc(db, "appointments", appointmentId), {
    invoiceId: invoiceRef.id
  });
}

/* =========================
   SAVE
========================= */
document.getElementById("save").onclick = async () => {
  const user = auth.currentUser;
  if (!user || !currentSlot) return;

  const data = {
    therapistId: user.uid,
    patientId: selectedPatientId || null,
    date: currentSlot.date,
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

  await maybeCreateInvoice(appointmentId, data);

  modal.classList.remove("show");
  renderWeek();
};
openWhatsAppNotification({
  phone: phone.value,
  name: name.value,
  date: currentSlot.date,
  start: start.value,
  end: end.value,
  modality: modality.value
});
/* =========================
   RENDER WEEK
========================= */
async function renderWeek() {
  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  weekLabel.textContent = formatWeekLabel(monday);

  const user = auth.currentUser;
  if (!user) return;

  /* AVAILABILITY */
  const availSnap = await getDocs(
    query(
      collection(db, "availability"),
      where("therapistId", "==", user.uid),
      where("weekStart", "==", formatDate(monday))
    )
  );

  const availability = {};
  availSnap.forEach(d => Object.assign(availability, d.data().slots || {}));

  /* APPOINTMENTS */
  const from = formatDate(monday);
  const to = formatDate(new Date(monday.getTime() + 6 * 86400000));

  const apptSnap = await getDocs(
    query(
      collection(db, "appointments"),
      where("therapistId", "==", user.uid),
      where("date", ">=", from),
      where("date", "<=", to)
    )
  );

  const bySlot = {};
  apptSnap.forEach(d => {
    const a = { id: d.id, ...d.data() };
    bySlot[`${a.date}_${a.start}`] = a;
  });

  /* HEADER */
  grid.appendChild(document.createElement("div"));
  DAYS.forEach((_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const h = document.createElement("div");
    h.className = "day-label";
    h.textContent = d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(h);
  });

  /* GRID */
  HOURS.forEach(hour => {
    const hl = document.createElement("div");
    hl.className = "hour-label";
    hl.textContent = `${hour}:00`;
    grid.appendChild(hl);

    DAYS.forEach(day => {
      const date = formatDate(dayFromKey(monday, day));
      const slotKey = `${day}_${hour}`;
      const apptKey = `${date}_${hour}:00`;

      const cell = document.createElement("div");
      cell.className = "slot";

      if (bySlot[apptKey]) {
        const a = bySlot[apptKey];
        cell.classList.add(
          a.paid ? "paid" :
          a.completed ? "done" :
          "busy"
        );
        cell.innerHTML = `<strong>${a.name || "—"}</strong><span>${a.start}–${a.end}</span>`;
        cell.onclick = () => openEdit(a);
      } else if (availability[slotKey]) {
        cell.classList.add("available");
        cell.textContent = "Disponible";
        cell.onclick = () => openNew({ date, hour });
      } else {
        cell.classList.add("disabled");
      }

      grid.appendChild(cell);
    });
  });
}

/* =========================
   NAV
========================= */
prevWeek.onclick = () => { baseDate.setDate(baseDate.getDate() - 7); renderWeek(); };
nextWeek.onclick = () => { baseDate.setDate(baseDate.getDate() + 7); renderWeek(); };
today.onclick = () => { baseDate = new Date(); renderWeek(); };
function openWhatsAppNotification({ phone, name, date, start, end, modality }) {
  if (!phone) return;

  // Normalizar teléfono (España por defecto)
  let cleanPhone = phone.replace(/\s+/g, "");
  if (!cleanPhone.startsWith("+")) {
    if (cleanPhone.startsWith("6") || cleanPhone.startsWith("7")) {
      cleanPhone = "34" + cleanPhone;
    }
  }

  const modalityText =
    modality === "online"
      ? "online"
      : "presencial";

  const message = `
Hola ${name || ""} 😊

Te confirmo tu cita en *Psicoterapia Isla*:

📅 ${date}
⏰ ${start} – ${end}
📍 Modalidad: ${modalityText}

Cualquier cosa me dices.
`.trim();

  const url =
    "https://wa.me/" +
    cleanPhone +
    "?text=" +
    encodeURIComponent(message);

  window.open(url, "_blank");
}
/* =========================
   START
========================= */
renderWeek();
