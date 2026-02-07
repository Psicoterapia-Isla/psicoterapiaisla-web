// app/assets/js/appointment-manager.js

import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ======================================================
   MARCAR SESIÓN COMO REALIZADA
====================================================== */
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

/* ======================================================
   CREAR FACTURA (LEGAL, NUMERADA)
   - Marca automáticamente como EMITIDA
   - Permite pago previo o posterior
====================================================== */
export async function invoiceAppointment(
  app,
  {
    amount = 60,
    paymentMethod = null, // "efectivo" | "tarjeta" | "transferencia"
    paid = false
  } = {}
) {
  if (!app?.id || !app?.therapistId || !app?.patientId) {
    throw new Error("Appointment data incomplete");
  }

  const year = new Date().getFullYear();
  const series = "A";
  const counterRef = doc(db, "invoice_counters", `${year}_${series}`);

  // 🔒 Transacción para numeración legal
  const invoiceNumber = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);

    let current = 0;
    if (snap.exists()) {
      current = snap.data().current || 0;
      tx.update(counterRef, { current: current + 1 });
    } else {
      tx.set(counterRef, {
        year,
        series,
        current: 1,
        createdAt: serverTimestamp()
      });
      current = 0;
    }

    return `${year}-${String(current + 1).padStart(3, "0")}`;
  });

  // 🧾 Crear factura
  const invoiceRef = await addDoc(
    collection(db, "invoices"),
    {
      invoiceNumber,
      series,
      year,

      appointmentId: app.id,
      therapistId: app.therapistId,
      patientId: app.patientId,
      patientName: app.patientName || null,

      concept: app.service || "Sesión de psicoterapia",
      amount,
      currency: "EUR",

      tax: {
        type: "exento",
        law: "Art. 20.1.3 LIVA"
      },

      issued: true,
      issuedAt: serverTimestamp(),

      payment: {
        method: paymentMethod, // puede ser null
        paid: paid === true,
        paidAt: paid ? serverTimestamp() : null
      },

      pdf: {
        generated: false,
        url: null
      },

      createdAt: serverTimestamp()
    }
  );

  // 🔗 Vincular factura a la cita
  await updateDoc(
    doc(db, "appointments", app.id),
    {
      invoiceId: invoiceRef.id
    }
  );

  return invoiceRef.id;
}

/* ======================================================
   MARCAR FACTURA COMO PAGADA
====================================================== */
export async function markInvoicePaid(invoiceId, paymentMethod = null) {
  if (!invoiceId) {
    throw new Error("Invoice ID missing");
  }

  await updateDoc(
    doc(db, "invoices", invoiceId),
    {
      "payment.paid": true,
      "payment.method": paymentMethod,
      "payment.paidAt": serverTimestamp()
    }
  );
}

/* ======================================================
   MARCAR FACTURA COMO EMITIDA (si se creó en borrador)
====================================================== */
export async function markInvoiceIssued(invoiceId) {
  if (!invoiceId) {
    throw new Error("Invoice ID missing");
  }

  await updateDoc(
    doc(db, "invoices", invoiceId),
    {
      issued: true,
      issuedAt: serverTimestamp()
    }
  );
}
