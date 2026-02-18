const PDFDocument = require("pdfkit");

exports.generateInvoicePDF = ({ invoiceId, patientName, amount }) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    doc.fontSize(18).text("Factura Psicoterapia Isla", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Factura Nº: ${invoiceId}`);
    doc.text(`Paciente: ${patientName}`);
    doc.text(`Importe: ${amount} €`);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`);

    doc.end();
  });
};
