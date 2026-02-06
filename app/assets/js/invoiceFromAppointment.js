// app/assets/js/invoiceFromAppointment.js

import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Marca sesión como realizada y crea factura
 */
export async function completeSessionAndInvoice({
  appointmentId,
  patientId,
  therapistId
}) {
  // 1️⃣ Crear factura
  const invoiceRef = await addDoc(collection(db, "invoices"), {
    patientId,
    therapistId,
    appointmentId,
    status: "draft",
    createdAt: serverTimestamp()
  });

  // 2️⃣ Actualizar cita
  await updateDoc(doc(db, "appointments", appointmentId), {
    status: "completed",
    invoiceId: invoiceRef.id
  });

  return invoiceRef.id;
}
