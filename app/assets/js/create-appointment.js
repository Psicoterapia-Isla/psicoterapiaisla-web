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

if (phoneInput && nameInput) {
  phoneInput.addEventListener("blur", async () => {
    const phone = phoneInput.value.trim();
    if (!/^\d{9}$/.test(phone)) return;

    let snap = await getDoc(doc(db, "patients", phone));
    if (!snap.exists()) {
      snap = await getDoc(doc(db, "patients_normalized", phone));
    }

    if (snap.exists()) {
      const d = snap.data();
      nameInput.value =
        d.fullName ||
        `${d.nombre || ""} ${d.apellidos || ""}`.trim();
      nameInput.disabled = true;
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

  if (!modality) {
    alert("Debes seleccionar modalidad / ubicación");
    return;
  }

  if (!startH || !endH) {
    alert("Hora de inicio y fin obligatorias");
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

  /* ===== GUARDAR ===== */
  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,
    patientId: phone,                 // UID paciente = teléfono
    patientName: name || "Sin nombre",
    service: service || "Sesión",
    modality,                          // viladecans | badalona | online
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    status: "scheduled",
    createdBy: user.uid,
    createdAt: serverTimestamp()
  });

  closeCreateModal();
  location.reload();
};
