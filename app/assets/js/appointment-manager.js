import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   MARCAR SESIÓN REALIZADA
========================= */
export async function markAppointmentCompleted(app) {

  if (!app?.id) {
    throw new Error("Appointment ID missing");
  }

  await updateDoc(
    doc(db, "appointments", app.id),
    {
      status: "completed",
      completedAt: serverTimestamp()
    }
  );
}

/* =========================
   CREAR FACTURA DESDE CITA
========================= */
export async function invoiceAppointment(app, amount = 60) {

  if (!app?.id || !app?.therapistId || !app?.patientId) {
    throw new Error("Appointment data incomplete");
  }

  // 1️⃣ Crear factura
  const invoiceRef = await addDoc(
    collection(db, "invoices"),
    {
      appointmentId: app.id,
      therapistId: app.therapistId,
      patientId: app.patientId,

      concept: app.service || "Sesión de terapia",
      amount,

      issued: false,
      paid: false,

      createdAt: serverTimestamp()
    }
  );

  // 2️⃣ Reflejar en la cita
  await updateDoc(
    doc(db, "appointments", app.id),
    {
      invoiceId: invoiceRef.id,
      invoiceIssued: false,
      invoicePaid: false
    }
  );

  return invoiceRef.id;
}

/* =========================
   MARCAR FACTURA EMITIDA
========================= */
export async function markInvoiceIssued(invoiceId, appointmentId) {

  if (!invoiceId || !appointmentId) {
    throw new Error("Missing IDs");
  }

  // 1️⃣ Actualizar factura
  await updateDoc(
    doc(db, "invoices", invoiceId),
    {
      issued: true,
      issuedAt: serverTimestamp()
    }
  );

  // 2️⃣ Reflejar en cita
  await updateDoc(
    doc(db, "appointments", appointmentId),
    {
      invoiceIssued: true
    }
  );
}

/* =========================
   MARCAR FACTURA PAGADA
========================= */
export async function markInvoicePaid(invoiceId, appointmentId) {

  if (!invoiceId || !appointmentId) {
    throw new Error("Missing IDs");
  }

  // 1️⃣ Actualizar factura
  await updateDoc(
    doc(db, "invoices", invoiceId),
    {
      paid: true,
      paidAt: serverTimestamp()
    }
  );

  // 2️⃣ Reflejar en cita
  await updateDoc(
    doc(db, "appointments", appointmentId),
    {
      invoicePaid: true
    }
  );
}
