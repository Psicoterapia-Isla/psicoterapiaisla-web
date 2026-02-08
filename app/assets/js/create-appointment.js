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
   ESTADO
========================= */
let patientFound = false;

/* =========================
   DOM
========================= */
const phoneInput = document.getElementById("cPatientPhone");
const nameInput  = document.getElementById("cPatientName");

const serviceInput  = document.getElementById("cService");
const modalityInput = document.getElementById("cModality");
const startInput    = document.getElementById("cStart");
const endInput      = document.getElementById("cEnd");

/* =========================
   AUTOCOMPLETE PACIENTE
========================= */
if (phoneInput && nameInput) {

  phoneInput.addEventListener("input", async () => {
    const phone = phoneInput.value.trim();

    patientFound = false;
    nameInput.disabled = false;
    nameInput.value = "";

    if (!/^\d{9}$/.test(phone)) {
      return;
    }

    try {
      // 1️⃣ intento directo
      let snap = await getDoc(doc(db, "patients", phone));

      // 2️⃣ fallback normalizado
      if (!snap.exists()) {
        snap = await getDoc(doc(db, "patients_normalized", phone));
      }

      if (snap.exists()) {
        const d = snap.data();

        nameInput.value =
          d.fullName ||
          [d.nombre, d.apellidos].filter(Boolean).join(" ");

        nameInput.disabled = true;
        patientFound = true;
      }

    } catch (err) {
      console.warn("Autocomplete paciente error:", err);
    }
  });
}

/* =========================
   CREAR CITA
========================= */
window.createAppointment = async () => {

  const phone    = phoneInput?.value.trim();
  const name     = nameInput?.value.trim();
  const service  = serviceInput?.value.trim();
  const modality = modalityInput?.value;
  const startH   = startInput?.value;
  const endH     = endInput?.value;

  /* ===== VALIDACIONES ===== */
  if (!/^\d{9}$/.test(phone)) {
    alert("Teléfono obligatorio (9 dígitos)");
    return;
  }

  if (!name) {
    alert("Nombre del paciente obligatorio");
    return;
  }

  if (!modality) {
    alert("Selecciona modalidad");
    return;
  }

  if (!startH || !endH) {
    alert("Hora inicio y fin obligatorias");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Usuario no autenticado");
    return;
  }

  if (!window.__selectedDateISO) {
    alert("Fecha no definida");
    return;
  }

  /* ===== FECHA ===== */
  const baseDate = new Date(window.__selectedDateISO);
  baseDate.setHours(0,0,0,0);

  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const start = new Date(baseDate);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(baseDate);
  end.setHours(eh, em, 0, 0);

  if (end <= start) {
    alert("La hora de fin debe ser posterior al inicio");
    return;
  }

  /* ===== CREAR CITA ===== */
  try {
    await addDoc(collection(db, "appointments"), {
      therapistId: user.uid,

      // identificador administrativo (no auth)
      patientId: phone,
      patientName: name,

      service: service || "Sesión",
      modality, // viladecans | badalona | online

      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),

      status: "scheduled",

      createdBy: user.uid,
      createdAt: serverTimestamp()
    });

    alert("Cita creada correctamente");
    location.reload();

  } catch (err) {
    console.error("Error creando cita:", err);
    alert("Error al crear la cita");
  }
};
