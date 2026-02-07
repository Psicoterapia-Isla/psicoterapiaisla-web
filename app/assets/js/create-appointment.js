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

/* =========================
   MODAL
========================= */
window.openCreateModal = (dateISO) => {
  window.__selectedDateISO = dateISO;
  document.getElementById("createModal").style.display = "block";

  document.getElementById("cDateLabel").textContent =
    new Date(dateISO).toLocaleDateString("es-ES");

  const phone = document.getElementById("cPatientPhone");
  const name  = document.getElementById("cPatientName");

  phone.value = "";
  name.value  = "";
  name.disabled = false;

  phone.onblur = async () => {
    const value = phone.value.trim();
    if (!/^\d{9}$/.test(value)) return;

    // 🔍 buscar paciente
    let snap = await getDoc(doc(db, "patients", value));
    if (!snap.exists()) {
      snap = await getDoc(doc(db, "patients_normalized", value));
    }

    if (snap.exists()) {
      const d = snap.data();
      name.value =
        d.fullName || `${d.name || ""} ${d.surname || ""}`.trim();
      name.disabled = true;
    } else {
      name.disabled = false;
    }
  };
};

window.closeCreateModal = () => {
  document.getElementById("createModal").style.display = "none";
};

/* =========================
   CREAR CITA
========================= */
window.createAppointment = async () => {
  const phone   = document.getElementById("cPatientPhone").value.trim();
  const name    = document.getElementById("cPatientName").value.trim();
  const service = document.getElementById("cService").value.trim();
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

  // 📅 fecha correcta
  const base = new Date(window.__selectedDateISO);
  base.setHours(0,0,0,0);

  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const start = new Date(base);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(base);
  end.setHours(eh, em, 0, 0);

  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,
    patientId: phone,              // 🔑 UID paciente
    patientName: name,
    service,

    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),

    status: "scheduled",           // scheduled | completed
    paid: false,
    invoiceId: null,

    createdBy: user.uid,           // quién crea la cita
    createdAt: serverTimestamp()
  });

  closeCreateModal();
  location.reload();
};
