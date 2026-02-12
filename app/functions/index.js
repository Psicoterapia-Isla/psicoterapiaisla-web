const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { generateInvoicePDF } = require("./invoicePdf");
const { sendWhatsApp } = require("./whatsapp");

admin.initializeApp();
const db = admin.firestore();

/* =====================================================
   EMITIR FACTURA (Callable)
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
    const { appointmentId } = data || {};

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
       EVITAR DUPLICADOS
    ========================= */

    if (app.invoiceId) {
      return {
        ok: true,
        invoiceId: app.invoiceId,
        alreadyExists: true
      };
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

    const invoiceId = invoiceRef.id;

    /* =========================
       GENERAR PDF
    ========================= */

    const pdfBuffer = await generateInvoicePDF({
      invoiceId,
      invoiceData: {
        ...app,
        invoiceId
      }
    });

    /* =========================
       ENVIAR WHATSAPP
    ========================= */

    if (app.phone && pdfBuffer) {
      await sendWhatsApp({
        to: app.phone,
        patientName: app.name || "",
        pdfBuffer
      });
    }

    /* =========================
       ACTUALIZAR CITA
    ========================= */

    await appRef.update({
      invoiceId,
      status: "invoiced",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    /* =========================
       RESPUESTA
    ========================= */

    return {
      ok: true,
      invoiceId
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


/* =====================================================
   GENERAR PDF DESDE FACTURAS.HTML (Callable)
   Compatible con httpsCallable("generateInvoicePdf")
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

    // Aquí deberías subir el PDF a Storage y devolver URL pública
    // Por ahora asumimos que generateInvoicePDF ya devuelve URL

    return {
      ok: true,
      url: `https://storage.googleapis.com/YOUR_BUCKET/invoices/${invoiceId}.pdf`
    };

  } catch (err) {

    console.error("GenerateInvoicePdf error:", err);

    if (err instanceof functions.https.HttpsError) {
      throw err;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error generando PDF"
    );
  }
});
