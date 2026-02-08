const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

exports.sendWhatsApp = async ({ to, patientName }) => {
  return client.messages.create({
    from: "whatsapp:+14155238886",
    to: `whatsapp:+34${to}`,
    body:
`Hola ${patientName},

Tu factura de Psicoterapia Isla ya está disponible.
Gracias por tu confianza.`
  });
};
