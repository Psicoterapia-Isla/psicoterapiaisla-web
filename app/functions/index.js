const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { generateInvoicePDF } = require("./invoicePdf");
const { sendWhatsApp } = require("./whatsapp");

admin.initializeApp();
const db = admin.firestore();

/* =====================================================
   EMITIR FACTURA (Callable – compatible con httpsCallable)
===================================================== */

exports.emitInvoice = functions.https.onCall(async (data, context) => {

  try {

    /* =========================
       SEGURIDAD
    ========================= */

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Usuario no autenticado"
      );
    }

    const therapistId = context.auth.uid;
    const { appointmentId } = data;

    if (!appointmentId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Falta appointmentId"
      );
    }

    /* =========================
       OBTENER CITA
    ========================= */

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

    /* =========================
       CREAR FACTURA
    ========================= */

    const invoiceRef = await db.collection("invoices").add({
      therapistId: therapistId,
      appointmentId: appointmentId,
      patientId: app.patientId || null,
      patientName: app.name || null,
      phone: app.phone || null,
      concept: app.service || "Sesión de psicología",
      totalAmount: Number(app.amount || 0),
      status: "issued",
      issueDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    /* =========================
       GENERAR PDF
    ========================= */

    const pdfBuffer = await generateInvoicePDF({
      invoiceId: invoiceRef.id,
      invoiceData: {
        ...app,
        invoiceId: invoiceRef.id
      }
    });

    /* =========================
       ENVIAR WHATSAPP
    ========================= */

    if (app.phone) {
      await sendWhatsApp({
        to: app.phone,
        patientName: app.name,
        pdfBuffer
      });
    }

    /* =========================
       ACTUALIZAR CITA
    ========================= */

    await appRef.update({
      invoiceId: invoiceRef.id,
      status: "invoiced",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    /* =========================
       RESPUESTA
    ========================= */

    return {
      ok: true,
      invoiceId: invoiceRef.id
    };

  } catch (err) {

    console.error("EmitInvoice error:", err);

    if (err instanceof functions.https.HttpsError) {
      throw err;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error al emitir factura"
    );
  }
});
