import { getClinicContext } from "./clinic-context.js";
import {
  searchPatients,
  getPatientByPhone,
  createPatient
} from "./patients-service.js";
import { createAppointment } from "./appointments-service.js";

document.addEventListener("DOMContentLoaded", async () => {
  const { clinicId } = await getClinicContext();

  const inputPhone = document.getElementById("patientPhone");
  const inputName = document.getElementById("patientName");
  const inputStart = document.getElementById("start");
  const inputEnd = document.getElementById("end");
  const form = document.getElementById("createAppointmentForm");

  inputPhone.addEventListener("input", async (e) => {
    const value = e.target.value.trim();
    if (value.length < 3) return;

    const results = await searchPatients({
      clinicId,
      queryText: value
    });

    renderAutocomplete(results);
  });

  function renderAutocomplete(results) {
    let container = document.getElementById("autocomplete-list");

    if (!container) {
      container = document.createElement("div");
      container.id = "autocomplete-list";
      container.style.border = "1px solid #ddd";
      container.style.background = "#fff";
      container.style.position = "absolute";
      container.style.zIndex = "1000";
      inputPhone.parentNode.appendChild(container);
    }

    container.innerHTML = "";

    results.forEach(patient => {
      const item = document.createElement("div");
      item.style.padding = "8px";
      item.style.cursor = "pointer";
      item.textContent = `${patient.fullName} - ${patient.phoneRaw}`;

      item.addEventListener("click", () => {
        inputPhone.value = patient.phoneRaw;
        inputName.value = patient.fullName;
        container.innerHTML = "";
      });

      container.appendChild(item);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = inputPhone.value.trim();
    const name = inputName.value.trim();
    const start = new Date(inputStart.value);
    const end = new Date(inputEnd.value);

    let patient = await getPatientByPhone({
      clinicId,
      phone
    });

    if (!patient) {
      const patientId = await createPatient({
        clinicId,
        data: {
          fullName: name,
          phoneRaw: phone
        }
      });

      patient = { id: patientId };
    }

    await createAppointment({
      clinicId,
      data: {
        patientId: patient.id,
        patientName: name,
        patientPhone: phone,
        start,
        end,
        status: "scheduled"
      }
    });

    form.reset();
    alert("Cita creada correctamente");
  });
});
