import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  onAuthStateChanged(getAuth(), async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    // Limpieza
    menu.innerHTML = "";

    // =====================
    // BASE COMÚN
    // =====================
    menu.innerHTML += `
      <a href="index.html">Inicio</a>
    `;

    // =====================
    // TERAPEUTA
    // =====================
    if (role === "therapist") {
      menu.innerHTML += `
        <a href="agenda-terapeuta.html">Agenda profesional</a>

        <a href="diario-terapeuta.html">Diarios pacientes</a>

        <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
        <a href="entries-by-patient.html">Respuestas por paciente</a>

        <a href="entries-by-exercise.html#pdf">Exportar informes (PDF)</a>

        <a href="exercises-admin.html">Gestionar ejercicios</a>
      `;
    }

    // =====================
    // PACIENTE
    // =====================
    if (role === "patient") {
      menu.innerHTML += `
        <a href="agenda-paciente.html">Mi agenda</a>

        <a href="diario.html">Mi diario</a>

        <a href="exercises-list.html">Ejercicios</a>

        <a href="mis-entradas.html">Mis respuestas</a>
      `;
    }

    // =====================
    // SALIR
    // =====================
    menu.innerHTML += `
      <a href="login.html">Salir</a>
    `;
  });
}
