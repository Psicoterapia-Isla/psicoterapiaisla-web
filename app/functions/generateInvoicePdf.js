/**
 * Cloud Function
 * Genera PDF legal de factura
 *
 * Requiere:
 * - functions/
 *   ├─ generateInvoicePdf.js   (ESTE ARCHIVO)
 *   └─ factura.html            (plantilla HTML)
 */

import { onCall } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

initializeApp();

const db = getFirestore();
const storage = getStorage();

/* ======================================================
   FUNCIÓN PRINCIPAL
====================================================== */
export const generateInvoicePdf = onCall(
  { region: "europe-west1" },
  async (request) => {

    const { invoiceId } = request.data;

    if (!invoiceId) {
      throw new Error("invoiceId requerido");
    }

    /* =========================
       CARGAR FACTURA
    ========================= */
    const invoiceRef = db.collection("invoices").doc(invoiceId);
    const snap = await invoiceRef.get();

    if (!snap.exists) {
      throw new Error("Factura no encontrada");
    }

    const invoice = snap.data();

    /* =========================
       CARGAR HTML
    ========================= */
    const templatePath = path.join(
      process.cwd(),
      "factura.html"
    );

    let html = fs.readFileSync(templatePath, "utf8");

    /* =========================
       INYECTAR DATOS
    ========================= */
    const replacements = {
      "{{business.name}}": "Psicoterapia Isla",
      "{{business.nif}}": "PENDIENTE",
      "{{business.address}}": "España",
      "{{business.email}}": "contacto@psicoterapiaisla.com",

      "{{invoice.number}}": invoice.invoiceNumber,
      "{{invoice.date}}": new Date(
        invoice.issuedAt.toDate()
      ).toLocaleDateString("es-ES"),

      "{{client.name}}": invoice.patientName || "Paciente",
      "{{client.phone}}": invoice.patientId,

      "{{invoice.concept}}": invoice.concept,
      "{{invoice.amount}}": invoice.amount.toFixed(2),

      "{{payment.method}}":
        invoice.payment?.method || "—",
      "{{payment.status}}":
        invoice.payment?.paid ? "Pagado" : "Pendiente"
    };

    for (const key in replacements) {
      html = html.replaceAll(key, replacements[key]);
    }

    /* =========================
       GENERAR PDF
    ========================= */
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();

    /* =========================
       GUARDAR EN STORAGE
    ========================= */
    const bucket = storage.bucket();
    const filePath =
      `facturas/${invoice.year}/${invoice.invoiceNumber}.pdf`;

    const file = bucket.file(filePath);

    await file.save(pdfBuffer, {
      contentType: "application/pdf"
    });

    await file.makePublic();

    const publicUrl = file.publicUrl();

    /* =========================
       ACTUALIZAR FACTURA
    ========================= */
    await invoiceRef.update({
      "pdf.generated": true,
      "pdf.url": publicUrl
    });

    return {
      success: true,
      url: publicUrl
    };
  }
);
