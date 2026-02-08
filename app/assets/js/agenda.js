import { auth, db } from "./firebase.js";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const { jsPDF } = window.jspdf;

/* ========= STATE ========= */
let uid = null;
let currentDate = new Date();
let currentHour = null;
let editingId = null;

/* ========= DOM ========= */
const agenda = document.getElementById("agenda");
const dayLabel = document.getElementById("dayLabel");
const modal = document.getElementById("modal");

/* botones navegación (ESTO ARREGLA EL ERROR) */
const btnPrev = document.getElementById("prev");
const btnNext = document.getElementById("next");
const btnToday = document.getElementById("today");
const btnNew = document.getElementById("new");

/* modal */
const search = document.getElementById("search");
const nameI = document.getElementById("name");
const phone = document.getElementById("phone");
const modality = document.getElementById("modality");
const done = document.getElementById("done");
const paid = document.getElementById("paid");
const amount = document.getElementById("amount");

const btnSave = document.getElementById("save");
const btnClose = document.getElementById("close");
const btnPdf = document.getElementById("pdf");
const btnWhatsapp = document.getElementById("whatsapp");

/* ========= AUTH SAFE ========= */
onAuthStateChanged(auth, user => {
  if (!user) return;
  uid = user.uid;
  loadDay();
});

/* ========= NAV ========= */
btnPrev.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadDay();
});

btnNext.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadDay();
});

btnToday.addEventListener("click", () => {
  currentDate = new Date();
  loadDay();
});

btnNew.addEventListener("click", () => openModal());

/* ========= LOAD DAY ========= */
async function loadDay() {
  if (!uid) return;

  agenda.innerHTML = "";
  dayLabel.textContent = currentDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const start = new Date(currentDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const snap = await getDocs(query(
    collection(db, "appointments"),
    where("therapistId", "==", uid),
    where("start", ">=", Timestamp.fromDate(start)),
    where("start", "<", Timestamp.fromDate(end))
  ));

  const byHour = {};
  snap.forEach(d => {
    const data = d.data();
    const h = data.start.toDate().getHours();
    byHour[h] = { ...data, id: d.id };
  });

  for (let h = 9; h < 21; h++) {
    const row = document.createElement("div");
    row.className = "slot " + (byHour[h] ? "busy" : "free");
    row.innerHTML = `
      <div class="time">${h}:00</div>
      <div>${byHour[h]?.patientName || "Libre"}</div>
    `;
    row.addEventListener("click", () => openModal(h, byHour[h]));
    agenda.appendChild(row);
  }
}

/* ========= MODAL ========= */
function openModal(hour = null, data = null) {
  currentHour = hour;
  editingId = data?.id || null;

  modal.style.display = "block";
  search.value = "";
  nameI.value = data?.patientName || "";
  phone.value = data?.patientId || "";
  modality.value = data?.modality || "";
  done.checked = data?.status === "completed";
  paid.checked = !!data?.invoiceId;
  amount.value = "";
}

btnClose.addEventListener("click", () => {
  modal.style.display = "none";
});

/* ========= AUTOCOMPLETE ========= */
search.addEventListener("input", async () => {
  const q = search.value.toLowerCase();
  if (q.length < 2) return;

  const snap = await getDocs(collection(db, "patients"));
  snap.forEach(d => {
    const p = d.data();
    if (
      p.fullName?.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    ) {
      nameI.value = p.fullName;
      phone.value = p.phone;
    }
  });
});

/* ========= SAVE ========= */
btnSave.addEventListener("click", async () => {
  const base = new Date(currentDate);
  base.setHours(currentHour ?? 9, 0, 0, 0);

  const payload = {
    therapistId: uid,
    patientName: nameI.value,
    patientId: phone.value,
    modality: modality.value,
    start: Timestamp.fromDate(base),
    end: Timestamp.fromDate(new Date(base.getTime() + 3600000)),
    status: done.checked ? "completed" : "scheduled"
  };

  let id = editingId;

  if (id) {
    await updateDoc(doc(db, "appointments", id), payload);
  } else {
    const ref = await addDoc(collection(db, "appointments"), payload);
    id = ref.id;
  }

  if (paid.checked) {
    const inv = await addDoc(collection(db, "invoices"), {
      therapistId: uid,
      appointmentId: id,
      patientName: nameI.value,
      amount: Number(amount.value || 0),
      issued: true,
      issuedAt: Timestamp.now()
    });
    await updateDoc(doc(db, "appointments", id), { invoiceId: inv.id });
  }

  modal.style.display = "none";
  loadDay();
});

/* ========= PDF ========= */
btnPdf.addEventListener("click", () => {
  const pdf = new jsPDF();
  pdf.text("Factura", 10, 10);
  pdf.text(`Paciente: ${nameI.value}`, 10, 20);
  pdf.text(`Importe: ${amount.value} €`, 10, 30);
  pdf.save("factura.pdf");
});

/* ========= WHATSAPP ========= */
btnWhatsapp.addEventListener("click", () => {
  const msg = encodeURIComponent(
    `Hola ${nameI.value}, tu cita es el ${currentDate.toLocaleDateString()} a las ${currentHour}:00`
  );
  window.open(`https://wa.me/${phone.value}?text=${msg}`, "_blank");
});
