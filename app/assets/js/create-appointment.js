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
window.closeCreateModal = () => {
  document.getElementById("createModal").style.display = "none";
};

/* =========================
   AUTOCOMPLETE PACIENTE
========================= */
const phoneInput = document.getElementById("cPatientPhone");
const nameInput  = document.getElementById("cPatientName");

let patientFound = false;

if (phoneInput && nameInput) {
  phoneInput.addEventListener("input", async () => {
    const phone = phoneInput.value.trim();

    patientFound = false;
    nameInput.disabled = false;

    if (!/^\d{9}$/.test(phone)) {
      nameInput.value = "";
      return;
    }

    // 1️⃣ Intento directo
    let snap = await getDoc(doc(db, "patients", phone));

    // 2️⃣ Fallback normalizado
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
    } else {
      nameInput.value = "";
      nameInput.disabled = false;
    }
  });
}

/* =========================
   CREAR CITA
========================= */
window.createAppointment = async () => {

  const phone    = phoneInput.value.trim();
  const name     = nameInput.value.trim();
  const service  = document.getElementById("cService").value.trim();
  const modality = document.getElementById("cModality")?.value;
  const startH   = document.getElementById("cStart").value;
  const endH     = document.getElementById("cEnd").value;

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
    alert("Debes seleccionar modalidad");
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

  /* ===== FECHA ===== */
  const baseDate = new Date(window.__selectedDateISO);
  baseDate.setHours(0,0,0,0);

  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const start = new Date(baseDate);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(baseDate);
  end.setHours(eh, em, 0, 0);

  /* ===== CREAR CITA ===== */
  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,

    // ⚠️ Identificador administrativo (no auth)
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

  closeCreateModal();
  location.reload();
};
