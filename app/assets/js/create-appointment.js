// app/assets/js/create-appointment.js

import { db, auth } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let selectedDateISO = null;

/* =========================
   MODAL CONTROL
========================= */
window.openCreateModal = (dateISO) => {
  selectedDateISO = dateISO;
  document.getElementById("createModal").style.display = "block";
};

window.closeCreateModal = () => {
  document.getElementById("createModal").style.display = "none";
};

/* =========================
   AUTOCOMPLETE PACIENTE
========================= */
const phoneInput = document.getElementById("cPatientPhone");
const nameInput  = document.getElementById("cPatientName");

phoneInput?.addEventListener("blur", async () => {
  const phone = phoneInput.value.trim();
  if (!/^\d{9}$/.test(phone)) return;

  // 1️⃣ patients (UID = teléfono)
  let snap = await getDoc(doc(db, "patients", phone));

  // 2️⃣ fallback patients_normalized
  if (!snap.exists()) {
    snap = await getDoc(doc(db, "patients_normalized", phone));
  }

  if (snap.exists()) {
    const data = snap.data();
    nameInput.value =
      data.fullName ||
      `${data.name || ""} ${data.surname || ""}`.trim();
    nameInput.disabled = true;
  } else {
    nameInput.value = "";
    nameInput.disabled = false;
  }
});

/* =========================
   CREAR CITA
========================= */
window.createAppointment = async () => {

  const phone   = phoneInput.value.trim();
  const name    = nameInput.value.trim();
  const service = document.getElementById("cService").value;
  const startH  = document.getElementById("cStart").value;
  const endH    = document.getElementById("cEnd").value;

  if (!/^\d{9}$/.test(phone)) {
    alert("Teléfono inválido");
    return;
  }

  if (!startH || !endH) {
    alert("Horas obligatorias");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  const base = new Date(selectedDateISO);
  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const start = new Date(base);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(base);
  end.setHours(eh, em, 0, 0);

  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,
    patientId: phone,        // 📌 UID = teléfono
    patientName: name,
    service,
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    status: "scheduled",
    createdAt: serverTimestamp()
  });

  closeCreateModal();
  location.reload();
};
