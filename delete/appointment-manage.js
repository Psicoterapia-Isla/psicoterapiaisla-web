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
   ACTUALIZAR ESTADO
========================= */
export async function updateAppointment(appointmentId, data) {
  await updateDoc(doc(db, "appointments", appointmentId), data);
}

/* =========================
   FACTURAR
========================= */
export async function invoiceAppointment({
  appointmentId,
  patientId,
  therapistId,
  amount,
  concept
}) {
  const invoiceRef = await addDoc(collection(db, "invoices"), {
    appointmentId,
    patientId,
    therapistId,

    concept,
    amount,

    status: "draft",
    issued: false,
    paid: false,

    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "appointments", appointmentId), {
    invoiceId: invoiceRef.id,
    billedAt: serverTimestamp()
  });

  return invoiceRef.id;
}
