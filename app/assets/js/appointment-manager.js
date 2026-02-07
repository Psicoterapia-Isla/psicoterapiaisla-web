// app/assets/js/appointment-manager.js

import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
  getDoc
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
   - Se crea SIEMPRE como emitida
   - Permite marcar como pagada o no
   - Compatible con reglas actuales
====================================================== */
export async function invoiceAppointment(
  app,
  {
    amount = 60,
    paymentMethod = null,
    paid = false
  } = {}
) {
  if (!app?.id || !app?.therapistId || !app?.patientId) {
    throw new Error("Appointment data incomplete");
  }

  /* ===== PREVENIR FACTURA DUPLICADA ===== */
  if (app.invoiceId) {
    return app.invoiceId;
  }

  const year = new Date().getFullYear();
  const series = "A";
  const counterRef = doc(db, "invoice_counters", `${year}_${series}`);

  /* ===== NUMERACIÓN LEGAL ===== */
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
    }

    return `${year}-${String(current + 1).padStart(3, "0")}`;
  });

  /* ===== CREAR FACTURA ===== */
  const invoiceRef = await addDoc(collection(db, "invoices"), {
    invoiceNumber,
    series,
    year,

    appointmentId: app.id,
    therapistId: app.therapistId,
    patientId: app.patientId,
    patientName: app.patientName || null,

    concept: app.service || "Sesión de psicoterapia",
    amount: Number(amount),
    currency: "EUR",

    tax: {
      type: "exento",
      law: "Art. 20.1.3 LIVA"
    },

    issued: true,
    issuedAt: serverTimestamp(),

    payment: {
      method: paymentMethod || null,
      paid: paid === true,
      paidAt: paid ? serverTimestamp() : null
    },

    createdAt: serverTimestamp()
  });

  /* ===== VINCULAR A LA CITA ===== */
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

  const ref = doc(db, "invoices", invoiceId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Invoice not found");
  }

  await updateDoc(ref, {
    "payment.paid": true,
    "payment.method": paymentMethod || null,
    "payment.paidAt": serverTimestamp()
  });
}

/* ======================================================
   MARCAR FACTURA COMO EMITIDA
   (solo por compatibilidad futura)
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
