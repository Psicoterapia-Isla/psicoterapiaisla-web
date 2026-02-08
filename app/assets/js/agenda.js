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

const agendaEl = document.getElementById("agenda");
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
   DATE HELPERS
========================= */

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function endOfWeek(d) {
  const date = startOfWeek(d);
  date.setDate(date.getDate() + 6);
  return date;
}

function formatHeaderRange(from, to) {
  return `${from.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${to.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;
}

function weekdayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric"
  });
}

/* =========================
   MODAL
========================= */

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
    div.onclick = () => {
      phone.value = p.phone;
      name.value = p.name;
      suggestions.innerHTML = "";
    };
    suggestions.appendChild(div);
  });
}

phone.oninput = e => searchPatients(e.target.value);
name.oninput = e => searchPatients(e.target.value);

/* =========================
   SAVE
========================= */

document.getElementById("save").onclick = async () => {
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
  renderWeek();
};

document.getElementById("close").onclick = closeModal;

/* =========================
   RENDER WEEK
========================= */

async function renderWeek() {
  agendaEl.innerHTML = "";

  const from = startOfWeek(currentDate);
  const to = endOfWeek(currentDate);

  dateLabel.textContent = formatHeaderRange(from, to);

  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, "appointments"),
    where("therapistId", "==", user.uid),
    where("date", ">=", formatDate(from)),
    where("date", "<=", formatDate(to))
  );

  const snap = await getDocs(q);
  const byDay = {};

  snap.forEach(d => {
    const a = { id: d.id, ...d.data() };
    if (!byDay[a.date]) byDay[a.date] = [];
    byDay[a.date].push(a);
  });

  Object.keys(byDay).sort().forEach(date => {
    const dayBlock = document.createElement("div");
    dayBlock.className = "agenda-day";

    const h = document.createElement("h3");
    h.textContent = weekdayLabel(date);
    dayBlock.appendChild(h);

    const groups = { viladecans: [], badalona: [], online: [] };

    byDay[date].forEach(a => groups[a.modality]?.push(a));

    Object.entries(groups).forEach(([key, items]) => {
      if (!items.length) return;

      items.sort((a, b) => a.start.localeCompare(b.start));

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

        if (
          a.service?.toLowerCase().includes("bloqueo") ||
          a.service?.toLowerCase().includes("pràctiques")
        ) block.classList.add("blocked");

        block.innerHTML = `
          <div class="time">${a.start} – ${a.end}</div>
          <div class="main">
            <strong>${a.name || "—"}</strong>
            <div class="service">${a.service}</div>
          </div>
        `;

        block.onclick = () => openEdit(a);
        section.appendChild(block);
      });

      dayBlock.appendChild(section);
    });

    agendaEl.appendChild(dayBlock);
  });
}

/* =========================
   NAV
========================= */

document.getElementById("prevDay").onclick = () => {
  currentDate.setDate(currentDate.getDate() - 7);
  renderWeek();
};

document.getElementById("nextDay").onclick = () => {
  currentDate.setDate(currentDate.getDate() + 7);
  renderWeek();
};

document.getElementById("today").onclick = () => {
  currentDate = new Date();
  renderWeek();
};

document.getElementById("newAppointment").onclick = () => openNew();

/* =========================
   INIT
========================= */

renderWeek();
