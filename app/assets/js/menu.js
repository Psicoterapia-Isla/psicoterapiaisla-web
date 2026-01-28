import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  onAuthStateChanged(getAuth(), async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    // Limpieza total
    menu.innerHTML = "";

    // 🔹 COMÚN
    menu.innerHTML += `
      <a href="index.html">Inicio</a>
    `;

    // 🔹 PACIENTE
    if (role === "patient") {
      menu.innerHTML += `
        <a href="diario.html">Diario</a>
        <a href="exercises-list.html">Ejercicios</a>
        <a href="mis-entradas.html">Mis entradas</a>
      `;
    }

    // 🔹 TERAPEUTA
    if (role === "therapist") {
      menu.innerHTML += `
        <a href="diario-terapeuta">Diarios pacientes</a>
        <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
        <a href="entries-by-patient.html">Por paciente</a>
      `;
    }

    // 🔹 SALIR
    menu.innerHTML += `
      <a href="login.html">Salir</a>
    `;
  });
}
