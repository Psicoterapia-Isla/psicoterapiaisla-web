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

  await updateDoc(
    doc(db,"appointments",app.id),
    {
      status: "completed",
      completedAt: serverTimestamp()
    }
  );
}

/* =========================
   CREAR FACTURA
========================= */
export async function invoiceAppointment(app, amount = 60) {

  const invoiceRef = await addDoc(
    collection(db,"invoices"),
    {
      appointmentId: app.id,
      therapistId: app.therapistId,
      patientId: app.patientId,

      amount,
      concept: app.service || "Sesión de terapia",

      issued: false,
      paid: false,

      createdAt: serverTimestamp()
    }
  );

  await updateDoc(
    doc(db,"appointments",app.id),
    {
      invoiceId: invoiceRef.id
    }
  );

  return invoiceRef.id;
}

/* =========================
   ACTUALIZAR ESTADO FACTURA
========================= */
export async function updateInvoiceStatus(invoiceId, data) {

  await updateDoc(
    doc(db,"invoices",invoiceId),
    data
  );
}
