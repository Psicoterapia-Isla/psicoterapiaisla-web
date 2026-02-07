import { onCall } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import PDFDocument from "pdfkit";
import { getStorage } from "firebase-admin/storage";

admin.initializeApp();

export const generateInvoicePdf = onCall(async (req) => {
  const { invoiceId } = req.data;
  const uid = req.auth?.uid;

  if (!uid) {
    throw new Error("No autenticado");
  }

  const db = admin.firestore();
  const invoiceRef = db.collection("invoices").doc(invoiceId);
  const invoiceSnap = await invoiceRef.get();

  if (!invoiceSnap.exists) {
    throw new Error("Factura no encontrada");
  }

  const invoice = invoiceSnap.data();

  // Seguridad: solo terapeuta o admin
  if (invoice.therapistId !== uid) {
    throw new Error("No autorizado");
  }

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  const bucket = getStorage().bucket();
  const filePath = `invoices/${invoiceId}.pdf`;
  const file = bucket.file(filePath);
  const stream = file.createWriteStream({
    contentType: "application/pdf",
  });

  doc.pipe(stream);

  /* =========================
     CONTENIDO PDF
  ========================= */
  doc.fontSize(18).text("FACTURA", { align: "right" });
  doc.moveDown();

  doc.fontSize(12).text(`Factura Nº: ${invoiceId}`);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`);
  doc.moveDown();

  doc.text("Emitido por:");
  doc.text("Psicoterapia Isla");
  doc.text("NIF: XXXXXXXX");
  doc.text("Dirección: Viladecans / Badalona");
  doc.moveDown();

  doc.text("Paciente:");
  doc.text(invoice.patientId);
  doc.moveDown();

  doc.text(`Concepto: ${invoice.concept}`);
  doc.text(`Importe: ${invoice.amount} €`);
  doc.text(`Método de pago: ${invoice.paymentMethod || "—"}`);
  doc.moveDown();

  doc.text(
    invoice.paid ? "Factura pagada" : "Factura pendiente",
    { align: "right" }
  );

  doc.end();

  await new Promise((res) => stream.on("finish", res));

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "2035-01-01",
  });

  await invoiceRef.update({
    pdfUrl: url,
    issued: true,
    issuedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { pdfUrl: url };
});
