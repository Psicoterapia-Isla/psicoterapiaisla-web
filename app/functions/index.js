const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

const { generateInvoicePDF } = require("./invoicePdf");
const { sendWhatsApp } = require("./whatsapp");

admin.initializeApp();
const db = admin.firestore();

exports.emitInvoice = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { appointmentId } = req.body;
      if (!appointmentId) {
        return res.status(400).send("Missing appointmentId");
      }

      const appRef = db.collection("appointments").doc(appointmentId);
      const appSnap = await appRef.get();

      if (!appSnap.exists) {
        return res.status(404).send("Appointment not found");
      }

      const app = appSnap.data();

      // 1️⃣ Crear invoice
      const invoiceRef = await db.collection("invoices").add({
        therapistId: app.therapistId,
        appointmentId,
        patientName: app.patientName,
        phone: app.patientId,
        amount: app.amount || 0,
        issued: true,
        issuedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2️⃣ Generar PDF
      const pdfBuffer = await generateInvoicePDF({
        invoiceId: invoiceRef.id,
        ...app
      });

      // 3️⃣ Enviar WhatsApp
      await sendWhatsApp({
        to: app.patientId,
        patientName: app.patientName,
        pdfBuffer
      });

      // 4️⃣ Marcar cita
      await appRef.update({
        invoiceId: invoiceRef.id,
        status: "invoiced"
      });

      res.status(200).send({ ok: true });

    } catch (err) {
      console.error(err);
      res.status(500).send("Invoice error");
    }
  });
});
