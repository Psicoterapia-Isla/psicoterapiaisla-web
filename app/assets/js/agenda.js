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
let selectedPatientId = null;

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

const formatDate = d => d.toISOString().slice(0, 10);

const startOfWeek = d => {
  const x = new Date(d);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - day + 1);
  return x;
};

const endOfWeek = d => {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return x;
};

const formatHeaderRange = (a,b) =>
  `${a.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${b.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;

const weekdayLabel = d =>
  new Date(d).toLocaleDateString("es-ES",{weekday:"long",day:"numeric"});

/* =========================
   MODAL
========================= */

function resetModal() {
  editingId = null;
  selectedPatientId = null;
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

function openNew(startTime="09:00", endTime="10:00", date=null) {
  resetModal();
  if (date) currentDate = new Date(date);
  start.value = startTime;
  end.value = endTime;
  modal.classList.remove("hidden");
}

function openEdit(a) {
  resetModal();
  editingId = a.id;
  selectedPatientId = a.patientId || null;
  currentDate = new Date(a.date);
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

document.getElementById("close").onclick = () =>
  modal.classList.add("hidden");

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
    div.textContent = `${p.name} · ${p.phone}`;
    div.onclick = () => {
      selectedPatientId = d.id;
      phone.value = p.phone;
      name.value = p.name;
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
   SAVE
========================= */

document.getElementById("save").onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const data = {
    therapistId: user.uid,
    patientId: selectedPatientId || null,
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

  modal.classList.add("hidden");
  renderWeek();
};

/* =========================
   RENDER WEEK
========================= */

async function renderWeek() {
  agendaEl.innerHTML = "";

  const from = startOfWeek(currentDate);
  const to = endOfWeek(currentDate);
  dateLabel.textContent = formatHeaderRange(from,to);

  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db,"appointments"),
    where("therapistId","==",user.uid),
    where("date",">=",formatDate(from)),
    where("date","<=",formatDate(to))
  );

  const snap = await getDocs(q);
  const byDay = {};

  snap.forEach(d=>{
    const a={id:d.id,...d.data()};
    (byDay[a.date]??=[]).push(a);
  });

  Object.keys(byDay).sort().forEach(date=>{
    const day=document.createElement("div");
    day.className="agenda-day";

    const h=document.createElement("h3");
    h.textContent=weekdayLabel(date);
    day.appendChild(h);

    ["viladecans","badalona","online"].forEach(loc=>{
      const items=(byDay[date]||[]).filter(a=>a.modality===loc);
      if(!items.length) return;

      const sec=document.createElement("div");
      sec.className="agenda-section";

      const t=document.createElement("h4");
      t.textContent=loc==="viladecans"
        ?"Psicoterapia Isla · Viladecans"
        :loc==="badalona"
        ?"Psicoterapia Isla · Badalona"
        :"Online";

      sec.appendChild(t);

      items.sort((a,b)=>a.start.localeCompare(b.start))
        .forEach(a=>{
          const b=document.createElement("div");
          b.className="appointment";
          if(/bloqueo|pràctiques/i.test(a.service||""))
            b.classList.add("blocked");

          b.innerHTML=`
            <div class="time">${a.start} – ${a.end}</div>
            <div class="main">
              <strong>${a.name||"—"}</strong>
              <div class="service">${a.service}</div>
            </div>`;
          b.onclick=()=>openEdit(a);
          sec.appendChild(b);
        });

      day.appendChild(sec);
    });

    agendaEl.appendChild(day);
  });
}

/* =========================
   NAV
========================= */

prevDay.onclick=()=>{currentDate.setDate(currentDate.getDate()-7);renderWeek();}
nextDay.onclick=()=>{currentDate.setDate(currentDate.getDate()+7);renderWeek();}
today.onclick=()=>{currentDate=new Date();renderWeek();}
newAppointment.onclick=()=>openNew();

/* =========================
   INIT
========================= */

renderWeek();
