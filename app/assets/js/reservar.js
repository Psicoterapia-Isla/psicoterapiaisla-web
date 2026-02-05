import { createAppointment } from "./appointments.js";

document
  .getElementById("reservationForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const patientId = document.getElementById("patientId").value;
    const therapistId = document.getElementById("therapistId").value;

    const start = new Date(document.getElementById("start").value);
    const end = new Date(document.getElementById("end").value);

    await createAppointment({
      patientId,
      therapistId,
      start,
      end
    });

    alert("Cita reservada");
  });
