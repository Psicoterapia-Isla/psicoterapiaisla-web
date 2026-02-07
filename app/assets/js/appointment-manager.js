// assets/js/appointment-manager.js

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
  if (!appointment?.id) throw new Error("Cita inválida");

  await updateDoc(doc(db, "appointments", appointment.id), {
    status: "completed",
    completedAt: serverTimestamp()
  });
}

/* =========================
   CREAR FACTURA DESDE CITA
========================= */
export async function invoiceAppointment(appointment, amount = 60) {
  if (!appointment?.id) throw new Error("Cita inválida");

  const invoiceRef = await addDoc(collection(db, "invoices"), {
    appointmentId: appointment.id,
    therapistId: appointment.therapistId,
    patientId: appointment.patientId,

    concept: appointment.service || "Sesión de terapia",
    amount,

    status: "draft",
    issued: false,
    paid: false,

    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "appointments", appointment.id), {
    invoiceId: invoiceRef.id,
    invoicedAt: serverTimestamp()
  });

  return invoiceRef.id;
}

/* =========================
   MARCAR FACTURA PAGADA
========================= */
export async function markInvoicePaid(invoiceId) {
  if (!invoiceId) throw new Error("Factura inválida");

  await updateDoc(doc(db, "invoices", invoiceId), {
    paid: true,
    paidAt: serverTimestamp()
  });
}
