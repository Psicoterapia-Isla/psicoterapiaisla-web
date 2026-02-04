invoices {
  // Identificación legal
  invoiceNumber: "2026-0001",     // correlativo, inmutable
  year: 2026,

  // Relación con paciente
  patientId: "IORPT4B3j1d7hrTT9rOj",
  patientSnapshot: {
    nombre: "Carlos",
    apellidos: "Bravo",
    dni: "12345678N",
    email: "cebp974x@hotmail.com"
  },

  // Importes
  baseAmount: 60,
  ivaPercent: 0,
  ivaAmount: 0,
  totalAmount: 60,

  // Estado legal
  status: "draft", 
  // draft | issued | paid | cancelled

  // Fechas
  createdAt,
  issuedAt: null,
  paidAt: null,
  cancelledAt: null,

  // Antifraude
  hash: null,        // SHA-256 al emitir
  qrData: null,      // string fiscal
  pdfUrl: null,      // storage

  // Auditoría
  createdBy: "ADMIN_UID"
}
