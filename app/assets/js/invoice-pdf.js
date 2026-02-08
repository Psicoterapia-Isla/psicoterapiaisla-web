import jsPDF from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js";

/**
 * Genera y descarga factura PDF
 * @param {Object} invoice
 * @param {Object} appointment
 */
export function exportInvoicePDF(invoice, appointment) {

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  let y = 20;

  /* ======================
     CABECERA
  ====================== */
  pdf.setFontSize(16);
  pdf.text("FACTURA", 20, y);

  pdf.setFontSize(10);
  y += 8;
  pdf.text(`Fecha emisión: ${new Date().toLocaleDateString("es-ES")}`, 20, y);

  y += 6;
  pdf.text(`Factura ID: ${invoice.id}`, 20, y);

  /* ======================
     DATOS TERAPEUTA
  ====================== */
  y += 12;
  pdf.setFontSize(12);
  pdf.text("Datos del profesional", 20, y);

  pdf.setFontSize(10);
  y += 6;
  pdf.text("Psicoterapia Isla", 20, y);
  y += 5;
  pdf.text("Servicio de psicología sanitaria", 20, y);
  y += 5;
  pdf.text("NIF: ———", 20, y);
  y += 5;
  pdf.text("España", 20, y);

  /* ======================
     DATOS PACIENTE
  ====================== */
  y += 12;
  pdf.setFontSize(12);
  pdf.text("Datos del paciente", 20, y);

  pdf.setFontSize(10);
  y += 6;
  pdf.text(`Nombre: ${invoice.patientName}`, 20, y);
  y += 5;
  pdf.text(`Teléfono: ${invoice.patientId}`, 20, y);

  /* ======================
     CONCEPTO
  ====================== */
  y += 12;
  pdf.setFontSize(12);
  pdf.text("Concepto", 20, y);

  pdf.setFontSize(10);
  y += 6;
  pdf.text(
    appointment.service || "Sesión de psicoterapia",
    20,
    y
  );

  /* ======================
     IMPORTE
  ====================== */
  y += 12;
  pdf.setFontSize(12);
  pdf.text("Importe", 20, y);

  pdf.setFontSize(10);
  y += 6;
  pdf.text(`Base imponible: ${invoice.amount.toFixed(2)} €`, 20, y);
  y += 5;
  pdf.text("IVA: Exento (Art. 20.1.3 LIVA)", 20, y);
  y += 5;
  pdf.text(`TOTAL: ${invoice.amount.toFixed(2)} €`, 20, y);

  /* ======================
     PAGO
  ====================== */
  y += 12;
  pdf.setFontSize(12);
  pdf.text("Pago", 20, y);

  pdf.setFontSize(10);
  y += 6;
  pdf.text(
    `Método: ${invoice.payment?.method || "—"}`,
    20,
    y
  );
  y += 5;
  pdf.text(
    `Pagada: ${invoice.payment?.paid ? "Sí" : "No"}`,
    20,
    y
  );

  /* ======================
     PIE LEGAL
  ====================== */
  y += 20;
  pdf.setFontSize(8);
  pdf.text(
    "Factura exenta de IVA según Artículo 20.1.3 de la Ley del IVA.",
    20,
    y
  );

  /* ======================
     DESCARGA
  ====================== */
  pdf.save(`factura_${invoice.id}.pdf`);
}
