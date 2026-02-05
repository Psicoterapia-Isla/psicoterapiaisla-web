// app/assets/js/reservar.js

import { createAppointment } from "./appointments.js";
import { Timestamp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById("reservarBtn").addEventListener("click", async () => {
  const patientId = document.getElementById("patientId").value;
  const therapistId = document.getElementById("therapistId").value;
  const startValue = document.getElementById("start").value;
  const endValue = document.getElementById("end").value;

  if (!patientId || !therapistId || !startValue || !endValue) {
    alert("Faltan datos");
    return;
  }

  const start = Timestamp.fromDate(new Date(startValue));
  const end = Timestamp.fromDate(new Date(endValue));

  try {
    await createAppointment({
      patientId,
      therapistId,
      start,
      end
    });

    alert("Cita reservada correctamente");
  } catch (e) {
    console.error(e);
    alert("Error al reservar");
  }
});
