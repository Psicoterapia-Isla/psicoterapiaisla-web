// app/assets/js/appointments-manager.js

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ESTADO GLOBAL
========================= */
let currentAppointmentId = null;
let currentAppointmentData = null;

/* =========================
   ABRIR MODAL
========================= */
window.openAppointmentModal = async (appointmentId) => {
  currentAppointmentId = appointmentId;

  const ref = doc(db, "appointments", appointmentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("La cita no existe");
    return;
  }

  currentAppointmentData = snap.data();

  // UI
  document.getElementById("amPatient").textContent =
    currentAppointmentData.patientName || "Paciente";

  const s = currentAppointmentData.start.toDate();
  const e = currentAppointmentData.end.toDate();

  document.getElementById("amDateTime").textContent =
    `${s.toLocaleDateString("es-ES")} · ${s.getHours()}:00 – ${e.getHours()}:00`;

  document.getElementById("amCompleted").checked =
    currentAppointmentData.status === "completed";

  document.getElementById("amIssued").checked =
    !!currentAppointmentData.invoiceIssued;

  document.getElementById("amPaid").checked =
    !!currentAppointmentData.invoicePaid;

  document.getElementById("appointmentModal").style.display = "block";
};

/* =========================
   CERRAR MODAL
========================= */
window.closeAppointmentModal = () => {
  document.getElementById("appointmentModal").style.display = "none";
  currentAppointmentId = null;
  currentAppointmentData = null;
};

/* =========================
   GUARDAR CAMBIOS
========================= */
async function persistAppointmentChanges(extra = {}) {
  if (!currentAppointmentId) return;

  await updateDoc(
    doc(db, "appointments", currentAppointmentId),
    {
      ...extra,
      updatedAt: serverTimestamp()
    }
  );
}

/* =========================
   CHECKS
========================= */
document.addEventListener("change", async (e) => {

  if (!currentAppointmentId) return;

  if (e.target.id === "amCompleted") {
    await persistAppointmentChanges({
      status: e.target.checked ? "completed" : "reserved"
    });
  }

  if (e.target.id === "amIssued") {
    await persistAppointmentChanges({
      invoiceIssued: e.target.checked
    });
  }

  if (e.target.id === "amPaid") {
    await persistAppointmentChanges({
      invoicePaid: e.target.checked
    });
  }
});

/* =========================
   FACTURAR
========================= */
document.addEventListener("click", async (e) => {
  if (e.target.id !== "amInvoiceBtn") return;
  if (!currentAppointmentData) return;

  // ya tiene factura
  if (currentAppointmentData.invoiceId) {
    alert("Esta cita ya tiene factura");
    return;
  }

  const invoiceRef = await addDoc(collection(db, "invoices"), {
    appointmentId: currentAppointmentId,
    patientId: currentAppointmentData.patientId,
    therapistId: currentAppointmentData.therapistId,

    concept: currentAppointmentData.service || "Sesión de terapia",
    amount: currentAppointmentData.amount || 60,

    status: "draft",
    issued: false,
    paid: false,

    createdAt: serverTimestamp()
  });

  await updateDoc(
    doc(db, "appointments", currentAppointmentId),
    {
      invoiceId: invoiceRef.id,
      invoiceIssued: false,
      invoicePaid: false
    }
  );

  alert("Factura creada en borrador");
});
