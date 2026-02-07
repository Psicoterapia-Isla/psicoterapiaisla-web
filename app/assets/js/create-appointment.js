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

if (phoneInput) {
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
        d.nombre
          ? `${d.nombre} ${d.apellidos || ""}`.trim()
          : d.fullName || "";
      nameInput.disabled = true;
    } else {
      nameInput.disabled = false;
    }
  });
}

/* =========================
   CREAR CITA
========================= */
window.createAppointment = async () => {
  const phone   = phoneInput.value.trim();
  const name    = nameInput.value.trim();
  const service = document.getElementById("cService").value.trim();
  const startH  = document.getElementById("cStart").value;
  const endH    = document.getElementById("cEnd").value;

  if (!/^\d{9}$/.test(phone)) {
    alert("Teléfono obligatorio (9 dígitos)");
    return;
  }

  if (!startH || !endH) {
    alert("Horas obligatorias");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

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
    patientId: phone,
    patientName: name,
    service,
    modality: document.getElementById("cModality")?.value || "presencial",
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    status: "scheduled",
    createdAt: serverTimestamp()
  });

  closeCreateModal();
  location.reload();
};
