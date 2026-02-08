import { auth, db } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   MODAL CONTROL
========================= */
window.openCreateModal = (dateISO, hour) => {
  window.__selectedDateISO = dateISO;
  document.getElementById("cStart").value = `${String(hour).padStart(2,"0")}:00`;
  document.getElementById("cEnd").value   = `${String(hour+1).padStart(2,"0")}:00`;
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

    // patients
    let snap = await getDoc(doc(db, "patients", phone));

    // fallback normalized
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
  const modality = document.getElementById("cModality").value;
  const startH   = document.getElementById("cStart").value;
  const endH     = document.getElementById("cEnd").value;

  /* VALIDACIONES */
  if (!/^\d{9}$/.test(phone)) {
    alert("Teléfono inválido");
    return;
  }

  if (!name) {
    alert("Nombre obligatorio");
    return;
  }

  if (!modality) {
    alert("Selecciona modalidad");
    return;
  }

  if (!startH || !endH) {
    alert("Hora inicio/fin obligatoria");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("No autenticado");
    return;
  }

  /* FECHA */
  const baseDate = new Date(window.__selectedDateISO);
  baseDate.setHours(0,0,0,0);

  const [sh, sm] = startH.split(":");
  const [eh, em] = endH.split(":");

  const start = new Date(baseDate);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(baseDate);
  end.setHours(eh, em, 0, 0);

  if (end <= start) {
    alert("La hora de fin debe ser posterior");
    return;
  }

  /* CREACIÓN */
  await addDoc(collection(db, "appointments"), {
    therapistId: user.uid,

    patientId: phone,
    patientName: name,

    service: service || "Sesión de psicoterapia",
    modality,

    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),

    status: "scheduled",

    createdAt: serverTimestamp(),
    createdBy: user.uid
  });

  closeCreateModal();
  location.reload();
};
