// app/assets/js/reservar.js

import { auth } from "./firebase.js";
import { db } from "./firebase.js";
import { createAppointment } from "./appointments.js";

import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ======================
// ELEMENTOS DOM
// ======================
const therapistSelect = document.getElementById("therapistId");
const slotSelect = document.getElementById("slotSelect");
const form = document.getElementById("reservationForm");

// ======================
// CARGAR TERAPEUTAS
// ======================
const therapistsSnap = await getDocs(collection(db, "therapists"));

therapistsSnap.forEach(d => {
  const therapist = d.data();

  const option = document.createElement("option");
  option.value = d.id;
  option.textContent = therapist.name || d.id;

  therapistSelect.appendChild(option);
});

// ======================
// CARGAR DISPONIBILIDAD
// ======================
therapistSelect.addEventListener("change", async () => {
  slotSelect.innerHTML = "<option value=''>Selecciona horario</option>";

  if (!therapistSelect.value) return;

  const q = query(
    collection(db, "availability"),
    where("therapistId", "==", therapistSelect.value)
  );

  const snap = await getDocs(q);

  snap.forEach(d => {
    const slot = d.data();

    const option = document.createElement("option");
    option.value = d.id;

    const start = new Date(slot.start.seconds * 1000);
    const end = new Date(slot.end.seconds * 1000);

    option.textContent =
      start.toLocaleString() + " – " + end.toLocaleString();

    option.dataset.start = start.toISOString();
    option.dataset.end = end.toISOString();

    slotSelect.appendChild(option);
  });
});

// ======================
// RESERVAR CITA (REAL)
// ======================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("No autenticado");
    return;
  }

  if (!slotSelect.value) {
    alert("Selecciona un horario disponible");
    return;
  }

  const patientId = user.uid;
  const therapistId = therapistSelect.value;
  const slotId = slotSelect.value;

  const selected = slotSelect.selectedOptions[0];
  const start = new Date(selected.dataset.start);
  const end = new Date(selected.dataset.end);

  try {
    // 1️⃣ Crear cita
    await createAppointment({
      patientId,
      therapistId,
      start,
      end
    });

    // 2️⃣ Eliminar disponibilidad
    await deleteDoc(doc(db, "availability", slotId));

    alert("Cita reservada correctamente");
    form.reset();
    slotSelect.innerHTML = "<option value=''>Selecciona horario</option>";

  } catch (err) {
    console.error(err);
    alert("Error al reservar la cita");
  }
});
