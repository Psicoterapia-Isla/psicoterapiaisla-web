import { db, auth } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   MODAL CONTROL
========================= */
window.closeCreateModal = () => {
  document.getElementById("createModal").style.display = "none";
};

/* =========================
   CREAR CITA
========================= */
window.createAppointment = async () => {

  const phone = document.getElementById("cPatientPhone").value.trim();
  const name  = document.getElementById("cPatientName").value.trim();
  const service = document.getElementById("cService").value.trim();
  const startH = document.getElementById("cStart").value;
  const endH   = document.getElementById("cEnd").value;

  /* VALIDACIONES */
  if (!/^\d{9}$/.test(phone)) {
    alert("Teléfono inválido (9 dígitos)");
    return;
  }

  if (!startH || !endH) {
    alert("Horas obligatorias");
    return;
  }

  if (!window.__selectedDateISO) {
    alert("Fecha no definida");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Usuario no autenticado");
    return;
  }

  /* =========================
     CONSTRUIR FECHAS (CLAVE)
  ========================= */
  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const baseDate = new Date(window.__selectedDateISO + "T12:00:00");

  const start = new Date(baseDate);
  start.setHours(Number(sh), Number(sm), 0, 0);

  const end = new Date(baseDate);
  end.setHours(Number(eh), Number(em), 0, 0);

  /* =========================
     GUARDAR EN FIRESTORE
  ========================= */
  try {
    await addDoc(collection(db, "appointments"), {
      therapistId: user.uid,
      patientId: phone,          // UID = teléfono
      patientName: name || "Paciente",
      service: service || "Sesión de terapia",
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),
      status: "scheduled",
      createdAt: serverTimestamp()
    });

    closeCreateModal();
    location.reload();

  } catch (err) {
    console.error("Error creando cita:", err);
    alert("Error al guardar la cita");
  }
};
