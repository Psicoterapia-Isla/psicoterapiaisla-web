// app/assets/js/reservar.js

import { auth } from "./firebase.js";
import { db } from "./firebase.js";
import { createAppointment } from "./appointments.js";

import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ELEMENTOS
========================= */
const therapistSelect = document.getElementById("therapistId");
const startInput = document.getElementById("start");
const endInput = document.getElementById("end");
const form = document.getElementById("reservationForm");

/* =========================
   CARGAR TERAPEUTAS
========================= */
async function loadTherapists() {
  therapistSelect.innerHTML =
    `<option value="">Selecciona terapeuta</option>`;

  const snap = await getDocs(collection(db, "therapists"));

  snap.forEach(doc => {
    const data = doc.data();

    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = data.name || "Terapeuta";

    therapistSelect.appendChild(option);
  });
}

/* =========================
   RESERVAR CITA
========================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("No autenticado");
    return;
  }

  const therapistId = therapistSelect.value;
  if (!therapistId) {
    alert("Selecciona terapeuta");
    return;
  }

  const start = new Date(startInput.value);
  const end = new Date(endInput.value);

  if (end <= start) {
    alert("La hora de fin debe ser posterior al inicio");
    return;
  }

  try {
    await createAppointment({
      patientId: user.uid,
      therapistId,
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end)
    });

    alert("Cita reservada correctamente");
    form.reset();

  } catch (err) {
    console.error(err);
    alert("Error al reservar la cita");
  }
});

/* =========================
   INIT
========================= */
await loadTherapists();
