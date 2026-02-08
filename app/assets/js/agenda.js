import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";

import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

await requireAuth();
await loadMenu();

let currentDate = new Date();
let editingId = null;

const hoursEl = document.getElementById("hours");
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

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function renderDay() {
  hoursEl.innerHTML = "";
  dateLabel.textContent = currentDate.toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  for (let h = 9; h <= 20; h++) {
    const div = document.createElement("div");
    div.className = "hour-row";
    div.textContent = `${h}:00`;
    div.addEventListener("click", () => openModal(`${h}:00`, `${h + 1}:00`));
    hoursEl.appendChild(div);
  }
}

function openModal(s, e) {
  editingId = null;
  modal.classList.remove("hidden");
  phone.value = "";
  name.value = "";
  start.value = s;
  end.value = e;
  amount.value = "";
  completed.checked = false;
  paid.checked = false;
  suggestions.innerHTML = "";
}

function closeModal() {
  modal.classList.add("hidden");
}

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

document.getElementById("save").addEventListener("click", async () => {
  const user = auth.currentUser;

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
});

document.getElementById("close").addEventListener("click", closeModal);

document.getElementById("prevDay").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  renderDay();
});

document.getElementById("nextDay").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  renderDay();
});

document.getElementById("today").addEventListener("click", () => {
  currentDate = new Date();
  renderDay();
});

document.getElementById("newAppointment")
  .addEventListener("click", () => openModal("09:00", "10:00"));

renderDay();
