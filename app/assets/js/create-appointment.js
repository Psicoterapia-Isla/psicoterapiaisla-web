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

  // ✅ FECHA CORRECTA (CLAVE)
  const baseDate = new Date(window.__selectedDateISO);
  baseDate.setHours(0,0,0,0);

  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const start = new Date(baseDate);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(baseDate);
  end.setHours(eh, em, 0, 0);

  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,
    patientId: phone,           // UID = teléfono
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
