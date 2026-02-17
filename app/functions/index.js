const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { generateInvoicePDF } = require("./invoicePdf");
const { sendWhatsApp } = require("./whatsapp");

admin.initializeApp();
const db = admin.firestore();

/* =====================================================
   GET CLINIC STATS (Callable)
   Usado por dashboard-clinic.js
===================================================== */

exports.getClinicStats = functions.https.onCall(async (data, context) => {

  try {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Usuario no autenticado"
      );
    }

    const therapistId = context.auth.uid;

    const snap = await db
      .collection("appointments")
      .where("therapistId", "==", therapistId)
      .get();

    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;
    let noShows = 0;
    let cancellations = 0;

    snap.forEach(doc => {
      const data = doc.data();
      const amount = Number(data.amount || 0);

      totalRevenue += amount;

      if (data.paid) {
        paidRevenue += amount;
      } else {
        pendingRevenue += amount;
      }

      if (data.status === "no-show") noShows++;
      if (data.status === "cancelled") cancellations++;
    });

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      noShows,
      cancellations,
      totalAppointments: snap.size
    };

  } catch (err) {

    console.error("getClinicStats error:", err);

    if (err instanceof functions.https.HttpsError) {
      throw err;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error obteniendo estadísticas"
    );
  }
});


/* =====================================================
   EMITIR FACTURA (Callable)
===================================================== */

exports.emitInvoice = functions.https.onCall(async (data, context) => {

  try {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Usuario no autenticado"
      );
    }

    const therapistId = context.auth.uid;
    const { appointmentId } = data || {};

    if (!appointmentId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Falta appointmentId"
      );
    }

    const appRef = db.collection("appointments").doc(appointmentId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Cita no encontrada"
      );
    }

    const app = appSnap.data();

    if (app.therapistId !== therapistId) {
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

    const invoiceRef = await db.collection("invoices").add({
      therapistId,
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

    return {
      ok: true,
      invoiceId
    };

  } catch (err) {

    console.error("emitInvoice error:", err);

    if (err instanceof functions.https.HttpsError) {
      throw err;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error al emitir factura"
    );
  }
});


/* =====================================================
   GENERAR PDF DESDE FACTURAS.HTML (Callable)
===================================================== */

exports.generateInvoicePdf = functions.https.onCall(async (data, context) => {

  try {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Usuario no autenticado"
      );
    }

    const therapistId = context.auth.uid;
    const { invoiceId } = data || {};

    if (!invoiceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Falta invoiceId"
      );
    }

    const invoiceRef = db.collection("invoices").doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Factura no encontrada"
      );
    }

    const invoice = invoiceSnap.data();

    if (invoice.therapistId !== therapistId) {
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

    return {
      ok: true,
      message: "PDF generado correctamente"
    };

  } catch (err) {

    console.error("generateInvoicePdf error:", err);

    if (err instanceof functions.https.HttpsError) {
      throw err;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error generando PDF"
    );
  }
});
