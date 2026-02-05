// app/assets/js/reservar.js

import { createAppointment } from "./appointments.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById("reservationForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 1️⃣ Leer valores del formulario
  const patientId = document.getElementById("patientId").value.trim();
  const therapistId = document.getElementById("therapistId").value.trim();
  const startInput = document.getElementById("start").value;
  const endInput = document.getElementById("end").value;

  if (!patientId || !therapistId || !startInput || !endInput) {
    alert("Faltan datos");
    return;
  }

  // 2️⃣ Convertir fechas HTML → Firestore Timestamp
  const start = Timestamp.fromDate(new Date(startInput));
  const end = Timestamp.fromDate(new Date(endInput));

  try {
    // 3️⃣ Crear cita REAL en Firestore
    await createAppointment({
      patientId,
      therapistId,
      start,
      end
    });

    alert("Cita reservada correctamente");
    form.reset();

  } catch (error) {
    console.error("Error al reservar cita:", error);
    alert("Error al reservar la cita");
  }
});
