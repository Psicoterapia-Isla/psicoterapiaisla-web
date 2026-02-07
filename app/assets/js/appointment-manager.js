// app/assets/js/appointment-manager.js

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
export async function markAppointmentCompleted(appointment) {
  await updateDoc(
    doc(db, "appointments", appointment.id),
    {
      status: "completed",
      completedAt: serverTimestamp()
    }
  );
}

/* =========================
   CREAR FACTURA
========================= */
export async function invoiceAppointment(appointment, amount = 60) {

  // 1️⃣ crear factura
  const invoiceRef = await addDoc(collection(db, "invoices"), {
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    therapistId: appointment.therapistId,

    concept: appointment.service || "Sesión de terapia",
    amount,

    status: "issued",   // issued | paid
    issued: true,
    paid: false,

    createdAt: serverTimestamp()
  });

  // 2️⃣ enlazar cita con factura
  await updateDoc(
    doc(db, "appointments", appointment.id),
    {
      invoiceId: invoiceRef.id,
      invoiceIssued: true
    }
  );
}

/* =========================
   MARCAR FACTURA PAGADA
========================= */
export async function markInvoicePaid(invoiceId) {
  await updateDoc(
    doc(db, "invoices", invoiceId),
    {
      paid: true,
      status: "paid",
      paidAt: serverTimestamp()
    }
  );
}
