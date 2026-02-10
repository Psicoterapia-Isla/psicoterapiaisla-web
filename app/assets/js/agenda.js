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

/* ================= INIT ================= */
await requireAuth();
await loadMenu();

/* ================= STATE ================= */
let baseDate = new Date();
let editingId = null;
let selectedPatient = null;
let currentSlot = null;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];

/* ================= DOM ================= */
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

/* ================= HELPERS ================= */
const pad = n => String(n).padStart(2,"0");
const formatDate = d => d.toISOString().slice(0,10);

function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay()+6)%7;
  x.setDate(x.getDate()-n);
  x.setHours(0,0,0,0);
  return x;
}

function formatWeekLabel(monday){
  const end = new Date(monday);
  end.setDate(end.getDate()+6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

function dayFromKey(monday,key){
  const d = new Date(monday);
  d.setDate(d.getDate()+DAYS.indexOf(key));
  return d;
}

/* ================= MODAL ================= */
function resetModal(){
  editingId = null;
  selectedPatient = null;
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

function openNew(slot){
  resetModal();
  currentSlot = slot;

  start.value = `${pad(slot.hour)}:00`;
  end.value = `${pad(slot.hour + 1)}:00`;

  modal.classList.add("show");
}

function openEdit(a){
  resetModal();
  editingId = a.id;
  selectedPatient = a.patient || null;
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

document.getElementById("close").onclick =
  () => modal.classList.remove("show");

/* ================= AUTOCOMPLETE ================= */
async function searchPatients(term){
  if(!term || term.length < 2){
    suggestions.innerHTML = "";
    return;
  }

  const snap = await getDocs(query(
    collection(db,"patients_normalized"),
    where("keywords","array-contains",term.toLowerCase())
  ));

  suggestions.innerHTML = "";

  snap.forEach(d=>{
    const p = d.data();
    const div = document.createElement("div");
    div.textContent = `${p.nombre || ""} ${p.apellidos || ""} · ${p.telefono || ""}`;

    div.onclick = () => {
      selectedPatient = { id: d.id, ...p };

      phone.value = p.telefono || "";
      name.value = `${p.nombre || ""} ${p.apellidos || ""}`.trim();

      /* ⏱️ DURACIÓN AUTOMÁTICA */
      const duration = p.sessionDuration || 60;
      const [h,m] = start.value.split(":").map(Number);
      const endDate = new Date(0,0,0,h,m + duration);
      end.value = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

      /* 💰 PRECIO MUTUA */
      if(p.patientType === "mutual"){
        amount.value = p.mutual?.pricePerSession || 0;
      }

      suggestions.innerHTML = "";
    };

    suggestions.appendChild(div);
  });
}

phone.oninput = e => searchPatients(e.target.value);
name.oninput  = e => searchPatients(e.target.value);

/* ================= FACTURACIÓN ================= */
async function getNextInvoiceNumber(therapistId){
  const year = new Date().getFullYear();
  const ref = doc(db,"invoice_counters",`${therapistId}_${year}`);

  return await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    let next = 1;

    if(snap.exists()){
      next = snap.data().lastNumber + 1;
      tx.update(ref,{ lastNumber: next, updatedAt: Timestamp.now() });
    }else{
      tx.set(ref,{
        therapistId,
        year,
        lastNumber: 1,
        createdAt: Timestamp.now()
      });
    }

    return `PI-${year}-${String(next).padStart(4,"0")}`;
  });
}

async function maybeCreateInvoice(appointmentId,data){
  if(!data.completed || !data.paid || !data.amount) return;

  const num = await getNextInvoiceNumber(data.therapistId);

  const inv = await addDoc(collection(db,"invoices"),{
    therapistId: data.therapistId,
    appointmentId,
    invoiceNumber: num,
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

  await updateDoc(
    doc(db,"appointments",appointmentId),
    { invoiceId: inv.id }
  );
}

/* ================= SAVE ================= */
document.getElementById("save").onclick = async () => {
  const user = auth.currentUser;
  if(!user || !currentSlot) return;

  const data = {
    therapistId: user.uid,
    patientId: selectedPatient?.id || null,
    patient: selectedPatient || null,
    sessionDuration: selectedPatient?.sessionDuration || 60,
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

  let id;

  if(editingId){
    await updateDoc(doc(db,"appointments",editingId),data);
    id = editingId;
  }else{
    const ref = await addDoc(
      collection(db,"appointments"),
      { ...data, createdAt: Timestamp.now() }
    );
    id = ref.id;
  }

  await maybeCreateInvoice(id,data);
  modal.classList.remove("show");
  await renderWeek();

  openWhatsAppNotification(data);
};

/* ================= RENDER WEEK ================= */
async function renderWeek(){
  grid.innerHTML = "";
  const monday = mondayOf(baseDate);
  weekLabel.textContent = formatWeekLabel(monday);

  const user = auth.currentUser;
  if(!user) return;

  const availSnap = await getDocs(query(
    collection(db,"availability"),
    where("therapistId","==",user.uid),
    where("weekStart","==",formatDate(monday))
  ));

  const availability = {};
  availSnap.forEach(d =>
    Object.assign(availability,d.data().slots || {})
  );

  const apptSnap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",user.uid),
    where("date",">=",formatDate(monday)),
    where("date","<=",formatDate(new Date(monday.getTime()+6*86400000)))
  ));

  const bySlot = {};
  apptSnap.forEach(d=>{
    const a = { id:d.id, ...d.data() };
    bySlot[`${a.date}_${a.start}`] = a;
  });

  grid.appendChild(document.createElement("div"));

  DAYS.forEach((_,i)=>{
    const d = new Date(monday);
    d.setDate(d.getDate()+i);
    const h = document.createElement("div");
    h.className="day-label";
    h.textContent=d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(h);
  });

  HOURS.forEach(hour=>{
    const hl = document.createElement("div");
    hl.className="hour-label";
    hl.textContent=`${hour}:00`;
    grid.appendChild(hl);

    DAYS.forEach(day=>{
      const date = formatDate(dayFromKey(monday,day));
      const slotKey = `${day}_${hour}`;
      const apptKey = `${date}_${pad(hour)}:00`;

      const cell = document.createElement("div");
      cell.className="slot";

      if(bySlot[apptKey]){
        const a = bySlot[apptKey];
        cell.classList.add(
          a.paid ? "paid" : a.completed ? "done" : "busy"
        );
        cell.innerHTML =
          `<strong>${a.name || "—"}</strong>
           <span>${a.start}–${a.end}</span>`;
        cell.onclick = () => openEdit(a);
      }else if(availability[slotKey]){
        cell.classList.add("available");
        cell.textContent="Disponible";
        cell.onclick = () => openNew({ date, hour });
      }else{
        cell.classList.add("disabled");
      }

      grid.appendChild(cell);
    });
  });
}

/* ================= NAV ================= */
prevWeek.onclick = () => {
  baseDate.setDate(baseDate.getDate()-7);
  renderWeek();
};
nextWeek.onclick = () => {
  baseDate.setDate(baseDate.getDate()+7);
  renderWeek();
};
today.onclick = () => {
  baseDate = new Date();
  renderWeek();
};

renderWeek();
