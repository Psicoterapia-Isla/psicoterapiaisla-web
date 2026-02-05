// app/assets/js/availability.js

import { auth } from "./firebase.js";
import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   FORM
========================= */
const form = document.getElementById("availabilityForm");

if (!form) {
  console.warn("availabilityForm no encontrado");
  return;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("No autenticado");
    return;
  }

  const startInput = document.getElementById("start").value;
  const endInput = document.getElementById("end").value;

  const start = new Date(startInput);
  const end = new Date(endInput);

  if (end <= start) {
    alert("La hora de fin debe ser posterior al inicio");
    return;
  }

  // ⏳ LÍMITE 3 SEMANAS
  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(now.getDate() + 21);

  if (start > maxDate) {
    alert("Solo puedes abrir disponibilidad hasta 3 semanas vista");
    return;
  }

  try {
    await addDoc(collection(db, "availability"), {
      therapistId: user.uid,

      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),

      status: "free",            // 👈 CLAVE
      createdAt: serverTimestamp()
    });

    alert("Disponibilidad añadida correctamente");
    form.reset();

  } catch (err) {
    console.error(err);
    alert("Error al guardar disponibilidad");
  }
});
