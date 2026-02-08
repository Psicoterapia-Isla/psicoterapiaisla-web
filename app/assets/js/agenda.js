import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";

import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

await requireAuth();
await loadMenu();

/* =========================
   STATE
========================= */

let currentDate = new Date();
let editingId = null;

const agendaEl = document.getElementById("hours"); // 🔧 CORREGIDO
const dateLabel = document.getElementById("dateLabel");

const modal = document.getElementById("modal");
const suggestions = document.getElementById("suggestions");

const phone = document.getElementById("phone");
const name = document.getElementById("name");
const service = document.getElementById("service");
const modality = document.getElementById("modality");
const start = document.getElementById("start");
const end = document.getElementById("end");
const completed = document.getElementById("completed");
const paid = document.getElementById("paid");
const amount = document.getElementById("amount");

/* =========================
   HELPERS
========================= */

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatHeaderDate(d) {
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function resetModal() {
  editingId = null;
  phone.value = "";
  name.value = "";
  service.value = "Visita Psicología";
  modality.value = "viladecans";
  start.value = "";
  end.value = "";
  completed.checked = false;
  paid.checked = false;
  amount.value = "";
  suggestions.innerHTML = "";
}

/* =========================
   RENDER AGENDA
========================= */

async function renderDay() {
  agendaEl.innerHTML = "";
  dateLabel.textContent = formatHeaderDate(currentDate);

  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, "appointments"),
    where("therapistId", "==", user.uid),
    where("date", "==", formatDate(currentDate))
  );

  const snap = await getDocs(q);
  const appointments = [];

  snap.forEach(d => {
    appointments.push({ id: d.id, ...d.data() });
  });

  if (!appointments.length) {
    const empty = document.createElement("div");
    empty.className = "agenda-empty";
    empty.textContent = "No hay citas este día";
    agendaEl.appendChild(empty);
    return;
  }

  appointments.sort((a, b) => a.start.localeCompare(b.start));

  const groups = {
    viladecans: [],
    badalona: [],
    online: []
  };

  appointments.forEach(a => {
    if (groups[a.modality]) groups[a.modality].push(a);
  });

  Object.entries(groups).forEach(([key, items]) => {
    if (!items.length) return;

    const section = document.createElement("div");
    section.className = "agenda-section";

    const title = document.createElement("h4");
    title.textContent =
      key === "viladecans" ? "Psicoterapia Isla · Viladecans"
      : key === "badalona" ? "Psicoterapia Isla · Badalona"
      : "Online";

    section.appendChild(title);

    items.forEach(a => {
      const block = document.createElement("div");
      block.className = "appointment";

      const isBlock =
        a.service?.toLowerCase().includes("pràctiques") ||
        a.service?.toLowerCase().includes("bloqueo");

      if (isBlock) block.classList.add("blocked");

      block.innerHTML = `
        <div class="time">${a.start} – ${a.end}</div>
        <div class="main">
          <strong>${a.name || "—"}</strong>
          <div class="service">${a.service}</div>
        </div>
      `;

      block.addEventListener("click", () => openEdit(a));
      section.appendChild(block);
    });

    agendaEl.appendChild(section);
  });
}

/* =========================
   MODAL
========================= */

function openNew(startTime = "09:00", endTime = "10:00") {
  resetModal();
  start.value = startTime;
  end.value = endTime;
  modal.classList.remove("hidden");
}

function openEdit(a) {
  editingId = a.id;
  phone.value = a.phone || "";
  name.value = a.name || "";
  service.value = a.service || "";
  modality.value = a.modality || "viladecans";
  start.value = a.start;
  end.value = a.end;
  completed.checked = !!a.completed;
  paid.checked = !!a.paid;
  amount.value = a.amount || "";
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

/* =========================
   AUTOCOMPLETE
========================= */

async function searchPatients(term) {
  if (!term || term.length < 1) {
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
    div.textContent = `${p.name} · ${p.phone}`;
    div.addEventListener("click", () => {
      phone.value = p.phone;
      name.value = p.name;
      suggestions.innerHTML = "";
    });
    suggestions.appendChild(div);
  });
}

phone.addEventListener("input", e => searchPatients(e.target.value));
name.addEventListener("input", e => searchPatients(e.target.value));

/* =========================
   SAVE
========================= */

document.getElementById("save").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const data = {
    therapistId: user.uid,
    date: formatDate(currentDate),
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

  if (editingId) {
    await updateDoc(doc(db, "appointments", editingId), data);
  } else {
    await addDoc(collection(db, "appointments"), {
      ...data,
      createdAt: Timestamp.now()
    });
  }

  closeModal();
  renderDay();
});

document.getElementById("close").addEventListener("click", closeModal);

/* =========================
   NAV
========================= */

document.getElementById("prevDay").onclick = () => {
  currentDate.setDate(currentDate.getDate() - 1);
  renderDay();
};

document.getElementById("nextDay").onclick = () => {
  currentDate.setDate(currentDate.getDate() + 1);
  renderDay();
};

document.getElementById("today").onclick = () => {
  currentDate = new Date();
  renderDay();
};

document.getElementById("newAppointment").onclick = () => openNew();

/* =========================
   INIT
========================= */

renderDay();
