import jsPDF from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js";

export function exportPatientCasePDF({
  patientId,
  entries
}) {
  const pdf = new jsPDF("p", "mm", "a4");

  let y = 15;

  pdf.setFontSize(16);
  pdf.text("Estudio de caso clínico", 15, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.setTextColor(120);
  pdf.text(`Paciente: ${patientId}`, 15, y);
  y += 10;

  pdf.setTextColor(0);

  entries.forEach((entry, index) => {
    if (y > 260) {
      pdf.addPage();
      y = 15;
    }

    pdf.setFont(undefined, "bold");
    pdf.text(
      `${index + 1}. ${entry.exerciseTitle || entry.type || "Ejercicio"}`,
      15,
      y
    );
    y += 6;

    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(120);
    pdf.text(entry.date || "", 15, y);
    y += 6;

    pdf.setFontSize(11);
    pdf.setTextColor(0);

    entry.lines.forEach(line => {
      const wrapped = pdf.splitTextToSize(line, 175);

      wrapped.forEach(w => {
        if (y > 270) {
          pdf.addPage();
          y = 15;
        }
        pdf.text(w, 18, y);
        y += 5;
      });

      y += 2;
    });

    y += 6;
  });

  pdf.save(`Estudio_caso_${patientId}.pdf`);
}
