const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/* =====================================================
   HELPER: validar pertenencia clínica
===================================================== */

async function validateClinicAccess(uid, clinicId) {
  const userSnap = await db.collection("users").doc(uid).get();

  if (!userSnap.exists) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Usuario no registrado"
    );
  }

  const userData = userSnap.data();

  if (!userData.clinicIds || !userData.clinicIds.includes(clinicId)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No perteneces a esta clínica"
    );
  }

  return userData;
}

/* =====================================================
   CREATE APPOINTMENT
===================================================== */

exports.createAppointment = functions.https.onCall(async (data, context) => {

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuario no autenticado"
    );
  }

  const uid = context.auth.uid;
  const {
    clinicId,
    patientId,
    date,
    start,
    end,
    modality,
    name,
    phone,
    service,
    amount,
    completed,
    paid
  } = data;

  if (!clinicId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "clinicId requerido"
    );
  }

  await validateClinicAccess(uid, clinicId);

  const appointmentRef = db
    .collection("clinics")
    .doc(clinicId)
    .collection("appointments")
    .doc();

  await appointmentRef.set({
    therapistId: uid,
    patientId,
    date,
    start,
    end,
    modality,
    name,
    phone,
    service,
    amount: Number(amount || 0),
    completed: !!completed,
    paid: !!paid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    ok: true,
    appointmentId: appointmentRef.id
  };
});

/* =====================================================
   GET AVAILABILITY
===================================================== */

exports.getAvailability = functions.https.onCall(async (data, context) => {

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuario no autenticado"
    );
  }

  const uid = context.auth.uid;
  const { clinicId, weekStart } = data;

  await validateClinicAccess(uid, clinicId);

  const snap = await db
    .collection("clinics")
    .doc(clinicId)
    .collection("availability")
    .where("therapistId", "==", uid)
    .get();

  const slots = {};

  snap.forEach(doc => {
    slots[doc.id] = doc.data();
  });

  return { slots };
});

/* =====================================================
   EMIT INVOICE
===================================================== */

exports.emitInvoice = functions.https.onCall(async (data, context) => {

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuario no autenticado"
    );
  }

  const uid = context.auth.uid;
  const { clinicId, appointmentId } = data;

  await validateClinicAccess(uid, clinicId);

  const appRef = db
    .collection("clinics")
    .doc(clinicId)
    .collection("appointments")
    .doc(appointmentId);

  const appSnap = await appRef.get();

  if (!appSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Cita no encontrada");
  }

  const app = appSnap.data();

  if (app.therapistId !== uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No puedes facturar esta cita"
    );
  }

  const invoiceRef = db
    .collection("clinics")
    .doc(clinicId)
    .collection("invoices")
    .doc();

  await invoiceRef.set({
    therapistId: uid,
    appointmentId,
    patientId: app.patientId,
    patientName: app.name,
    phone: app.phone,
    concept: app.service,
    totalAmount: Number(app.amount || 0),
    status: "issued",
    issueDate: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await appRef.update({
    invoiceId: invoiceRef.id,
    status: "invoiced",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    ok: true,
    invoiceId: invoiceRef.id
  };
});