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
 * Marca sesión como realizada y crea factura asociada
 */
export async function completeSessionAndInvoice({
  appointmentId,
  patientId,
  therapistId,
  amount = 60,              // importe por defecto (editable luego)
  concept = "Sesión de terapia"
}) {

  // 1️⃣ Crear factura (PREPARADA PARA FACTURACIÓN REAL)
  const invoiceRef = await addDoc(collection(db, "invoices"), {
    patientId,
    therapistId,
    appointmentId,

    concept,
    amount,

    status: "draft",        // draft | paid | cancelled
    issued: false,          // emitida o no
    paid: false,            // pagada o no

    createdAt: serverTimestamp()
  });

  // 2️⃣ Actualizar cita
  await updateDoc(doc(db, "appointments", appointmentId), {
    status: "completed",    // reserved → completed
    invoiceId: invoiceRef.id,
    completedAt: serverTimestamp()
  });

  return invoiceRef.id;
}
