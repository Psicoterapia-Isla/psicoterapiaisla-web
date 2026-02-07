import { db, auth } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   MODAL
========================= */
window.closeCreateModal = () => {
  document.getElementById("createModal").style.display = "none";
};

/* =========================
   AUTOCOMPLETE PACIENTE (REAL)
========================= */
const phoneInput = document.getElementById("cPatientPhone");
const nameInput  = document.getElementById("cPatientName");

let resolvedPatient = null;

if (phoneInput && nameInput) {

  phoneInput.addEventListener("input", async () => {
    const phone = phoneInput.value.trim();
    resolvedPatient = null;

    if (!/^\d{9}$/.test(phone)) {
      nameInput.value = "";
      nameInput.disabled = false;
      return;
    }

    const q = query(
      collection(db, "patients_normalized"),
      where("phone", "==", phone)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data();

      resolvedPatient = {
        id: docSnap.id,
        phone,
        name:
          data.fullName ||
          `${data.nombre || ""} ${data.apellidos || ""}`.trim()
      };

      nameInput.value = resolvedPatient.name;
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

  /* ===== GUARDAR ===== */
  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,
    patientId: phone,              // coherente con reglas actuales
    patientName: resolvedPatient?.name || name || "Sin nombre",
    service: service || "Sesión",
    modality,
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    status: "scheduled",
    createdBy: user.uid,
    createdAt: serverTimestamp()
  });

  closeCreateModal();
  location.reload();
};
