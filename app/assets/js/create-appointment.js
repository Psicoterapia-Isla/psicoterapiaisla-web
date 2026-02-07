// app/assets/js/create-appointment.js

import { db, auth } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.openCreateModal = (dateISO) => {
  window.__selectedDateISO = dateISO;
  document.getElementById("createModal").style.display = "block";
};

window.closeCreateModal = () => {
  document.getElementById("createModal").style.display = "none";
};

window.createAppointment = async () => {

  const phone = cPatientPhone.value.trim();
  const name = cPatientName.value.trim();
  const service = cService.value.trim();
  const modality = cModality.value; // 👈 NUEVO
  const startH = cStart.value;
  const endH = cEnd.value;

  /* ================= VALIDACIONES ================= */

  if (!/^\d{9}$/.test(phone)) {
    alert("Debes introducir un teléfono válido de 9 dígitos");
    return;
  }

  if (!modality) {
    alert("Debes seleccionar la modalidad de la sesión");
    return;
  }

  if (!startH || !endH) {
    alert("Horas obligatorias");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  /* ================= FECHA ================= */

  const baseDate = new Date(window.__selectedDateISO);
  baseDate.setHours(0, 0, 0, 0);

  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const start = new Date(baseDate);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(baseDate);
  end.setHours(eh, em, 0, 0);

  /* ================= GUARDAR ================= */

  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,
    patientId: phone,
    patientName: name,
    service,
    modality,              // 👈 NUEVO CAMPO CLAVE

    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),

    status: "scheduled",
    createdBy: user.uid,
    createdByRole: "therapist",

    createdAt: serverTimestamp()
  });

  closeCreateModal();
  location.reload();
};
