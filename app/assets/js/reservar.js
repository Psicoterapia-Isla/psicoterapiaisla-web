// app/assets/js/reservar.js

import { auth } from "./firebase.js";
import { db } from "./firebase.js";
import { createAppointment } from "./appointments.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ======================
// CARGAR TERAPEUTAS
// ======================
const therapistSelect = document.getElementById("therapistId");

const therapistsSnap = await getDocs(collection(db, "therapists"));

therapistsSnap.forEach(doc => {
  const therapist = doc.data();

  const option = document.createElement("option");
  option.value = doc.id;
  option.textContent = therapist.name || doc.id;

  therapistSelect.appendChild(option);
});

// ======================
// RESERVAR CITA
// ======================
const form = document.getElementById("reservationForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("No autenticado");
    return;
  }

  const patientId = user.uid;
  const therapistId = therapistSelect.value;
  const start = new Date(document.getElementById("start").value);
  const end = new Date(document.getElementById("end").value);

  if (end <= start) {
    alert("La hora de fin debe ser posterior al inicio");
    return;
  }

  try {
    await createAppointment({
      patientId,
      therapistId,
      start,
      end
    });

    alert("Cita reservada correctamente");
    form.reset();

  } catch (err) {
    console.error(err);
    alert("Error al reservar la cita");
  }
});
