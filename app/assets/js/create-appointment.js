// app/assets/js/create-appointment.js

import { db, auth } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentDateISO = null;

/* =========================
   MODAL
========================= */
window.openCreateModal = (dateISO) => {
  currentDateISO = dateISO;

  if (!currentDateISO) {
    alert("Fecha no válida");
    return;
  }

  document.getElementById("createModal").style.display = "block";
};

window.closeCreateModal = () => {
  document.getElementById("createModal").style.display = "none";
};

/* =========================
   CREATE APPOINTMENT
========================= */
window.createAppointment = async () => {
  if (!currentDateISO) {
    alert("No hay fecha seleccionada");
    return;
  }

  const phone   = document.getElementById("cPatientPhone").value.trim();
  const name    = document.getElementById("cPatientName").value.trim();
  const service = document.getElementById("cService").value;
  const startH  = document.getElementById("cStart").value;
  const endH    = document.getElementById("cEnd").value;

  if (!/^\d{9}$/.test(phone)) {
    alert("Teléfono inválido (9 dígitos)");
    return;
  }

  if (!name) {
    alert("Nombre obligatorio");
    return;
  }

  if (!startH || !endH) {
    alert("Horas obligatorias");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Usuario no autenticado");
    return;
  }

  /* =========================
     FECHAS CORRECTAS
  ========================= */
  const baseDate = new Date(currentDateISO);

  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const start = new Date(baseDate);
  start.setHours(Number(sh), Number(sm), 0, 0);

  const end = new Date(baseDate);
  end.setHours(Number(eh), Number(em), 0, 0);

  if (end <= start) {
    alert("La hora de fin debe ser posterior");
    return;
  }

  /* =========================
     FIRESTORE
  ========================= */
  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,
    patientId: phone,          // UID paciente = teléfono
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
