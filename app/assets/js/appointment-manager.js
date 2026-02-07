import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  addDoc,
  getDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================================================
   MARCAR SESIÓN REALIZADA
===================================================== */
export async function markAppointmentCompleted(app) {
  if (!app?.id) throw new Error("Appointment ID missing");

  await updateDoc(
    doc(db, "appointments", app.id),
    {
      status: "completed",
      completedAt: serverTimestamp()
    }
  );
}

/* =====================================================
   CREAR FACTURA
   - Se crea ya como EMITIDA
   - Importe editable (default 60)
===================================================== */
export async function invoiceAppointment(app, amount = 60) {
  if (!app?.id || !app?.therapistId || !app?.patientId) {
    throw new Error("Appointment data incomplete");
  }

  // 1️⃣ Crear factura (emitida automáticamente)
  const invoiceRef = await addDoc(
    collection(db, "invoices"),
    {
      appointmentId: app.id,
      therapistId: app.therapistId,
      patientId: app.patientId,

      concept: app.service || "Sesión de terapia",
      amount: Number(amount),

      issued: true,
      issuedAt: serverTimestamp(),

      paid: false,
      paymentMethod: null,

      createdAt: serverTimestamp()
    }
  );

  // 2️⃣ Vincular factura a la cita
  await updateDoc(
    doc(db, "appointments", app.id),
    {
      invoiceId: invoiceRef.id
    }
  );

  return invoiceRef.id;
}

/* =====================================================
   MARCAR FACTURA COMO EMITIDA (manual)
===================================================== */
export async function markInvoiceIssued(invoiceId) {
  if (!invoiceId) throw new Error("Invoice ID missing");

  await updateDoc(
    doc(db, "invoices", invoiceId),
    {
      issued: true,
      issuedAt: serverTimestamp()
    }
  );
}

/* =====================================================
   MARCAR FACTURA COMO PAGADA
   - Puede estar pagada SIN estar emitida
   - Guarda método de pago
===================================================== */
export async function markInvoicePaid(
  invoiceId,
  {
    paymentMethod = "efectivo", // efectivo | tarjeta | transferencia | bizum
    amountPaid = null
  } = {}
) {
  if (!invoiceId) throw new Error("Invoice ID missing");

  const updateData = {
    paid: true,
    paidAt: serverTimestamp(),
    paymentMethod
  };

  if (amountPaid !== null) {
    updateData.amountPaid = Number(amountPaid);
  }

  await updateDoc(
    doc(db, "invoices", invoiceId),
    updateData
  );
}

/* =====================================================
   OBTENER ESTADO COMPLETO DE FACTURA
   (para agendas diaria / semanal)
===================================================== */
export async function getInvoiceStatus(invoiceId) {
  if (!invoiceId) return null;

  const snap = await getDoc(doc(db, "invoices", invoiceId));
  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() };
}
