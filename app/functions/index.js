const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { generateInvoicePDF } = require("./invoicePdf");
const { sendWhatsApp } = require("./whatsapp");

admin.initializeApp();
const db = admin.firestore();

/* =====================================================
   HELPER: Validar auth + clinic
===================================================== */

async function validateClinicAccess(context, clinicId) {

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuario no autenticado"
    );
  }

  if (!clinicId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Falta clinicId"
    );
  }

  const userRef = db.collection("users").doc(context.auth.uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Usuario no válido"
    );
  }

  const userData = userSnap.data();

  if (!userData.clinicIds || !userData.clinicIds.includes(clinicId)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No perteneces a esta clínica"
    );
  }

  return {
    uid: context.auth.uid,
    role: userData.role
  };
}

/* =====================================================
   GET AVAILABILITY
===================================================== */

exports.getAvailability = functions.https.onCall(async (data, context) => {

  const { clinicId, therapistId, weekStart } = data || {};

  const { uid } = await validateClinicAccess(context, clinicId);

  if (uid !== therapistId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No autorizado"
    );
  }

  const snap = await db
    .collection("clinics")
    .doc(clinicId)
    .collection("availability")
    .where("therapistId", "==", therapistId)
    .where("weekStart", "==", weekStart)
    .get();

  const slots = {};

  snap.forEach(doc => {
    slots[doc.id] = doc.data();
  });

  return { slots };
});

/* =====================================================
   GET CLINIC STATS
===================================================== */

exports.getClinicStats = functions.https.onCall(async (data, context) => {

  const { clinicId } = data || {};
  const { uid } = await validateClinicAccess(context, clinicId);

  const snap = await db
    .collection("clinics")
    .doc(clinicId)
    .collection("appointments")
    .where("therapistId", "==", uid)
    .get();

  let totalRevenue = 0;
  let paidRevenue = 0;
  let pendingRevenue = 0;
  let noShows = 0;
  let cancellations = 0;

  snap.forEach(doc => {

    const a = doc.data();
    const amount = Number(a.amount || 0);

    totalRevenue += amount;

    if (a.paid) {
      paidRevenue += amount;
    } else {
      pendingRevenue += amount;
    }

    if (a.status === "no-show") noShows++;
    if (a.status === "cancelled") cancellations++;
  });

  return {
    totalRevenue,
    paidRevenue,
    pendingRevenue,
    noShows,
    cancellations,
    totalAppointments: snap.size
  };
});

/* =====================================================
   CREATE APPOINTMENT
===================================================== */

exports.createAppointment = functions.https.onCall(async (data, context) => {

  const { clinicId } = data || {};
  const { uid } = await validateClinicAccess(context, clinicId);

  if (uid !== data.therapistId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No autorizado"
    );
  }

  const ref = await db
    .collection("clinics")
    .doc(clinicId)
    .collection("appointments")
    .add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

  return { id: ref.id };
});

/* =====================================================
   EMIT INVOICE
===================================================== */

exports.emitInvoice = functions.https.onCall(async (data, context) => {

  const { clinicId, appointmentId } = data || {};
  const { uid } = await validateClinicAccess(context, clinicId);

  if (!appointmentId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Falta appointmentId"
    );
  }

  const appRef = db
    .collection("clinics")
    .doc(clinicId)
    .collection("appointments")
    .doc(appointmentId);

  const appSnap = await appRef.get();

  if (!appSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Cita no encontrada"
    );
  }

  const app = appSnap.data();

  if (app.therapistId !== uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No puedes facturar esta cita"
    );
  }

  if (app.invoiceId) {
    return {
      ok: true,
      invoiceId: app.invoiceId,
      alreadyExists: true
    };
  }

  const invoiceRef = await db
    .collection("clinics")
    .doc(clinicId)
    .collection("invoices")
    .add({
      therapistId: uid,
      appointmentId,
      patientId: app.patientId || null,
      patientName: app.name || null,
      phone: app.phone || null,
      concept: app.service || "Sesión de psicología",
      totalAmount: Number(app.amount || 0),
      status: "issued",
      issueDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

  const invoiceId = invoiceRef.id;

  const pdfBuffer = await generateInvoicePDF({
    invoiceId,
    invoiceData: { ...app, invoiceId }
  });

  if (app.phone && pdfBuffer) {
    await sendWhatsApp({
      to: app.phone,
      patientName: app.name || "",
      pdfBuffer
    });
  }

  await appRef.update({
    invoiceId,
    status: "invoiced",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { ok: true, invoiceId };
});

/* =====================================================
   GENERATE INVOICE PDF
===================================================== */

exports.generateInvoicePdf = functions.https.onCall(async (data, context) => {

  const { clinicId, invoiceId } = data || {};
  const { uid } = await validateClinicAccess(context, clinicId);

  const invoiceRef = db
    .collection("clinics")
    .doc(clinicId)
    .collection("invoices")
    .doc(invoiceId);

  const invoiceSnap = await invoiceRef.get();

  if (!invoiceSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Factura no encontrada"
    );
  }

  const invoice = invoiceSnap.data();

  if (invoice.therapistId !== uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No puedes acceder a esta factura"
    );
  }

  const pdfBuffer = await generateInvoicePDF({
    invoiceId,
    invoiceData: invoice
  });

  if (!pdfBuffer) {
    throw new functions.https.HttpsError(
      "internal",
      "No se pudo generar el PDF"
    );
  }

  return { ok: true };
});
