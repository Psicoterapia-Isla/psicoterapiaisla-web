import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
});

export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  onAuthStateChanged(getAuth(), async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    menu.innerHTML = `
      <a href="index.html">Inicio</a>
    `;

    if (role === "therapist") {
      menu.innerHTML += `
        <div class="menu-group">
          <button class="menu-group-toggle">
            Espacio terapeuta
            <span>▾</span>
          </button>
          <div class="menu-group-content">
            <a href="diario-terapeuta.html">Diarios pacientes</a>
            <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
            <a href="entries-by-patient.html">Respuestas por paciente</a>
            <a href="entries-by-exercise.html#pdf">Exportar informes (PDF)</a>
            <a href="exercises-admin.html">Gestionar ejercicios</a>
            <a href="agenda-terapeuta.html">Agenda profesional</a>
          </div>
        </div>
      `;
    }

    if (role === "patient") {
      menu.innerHTML += `
        <div class="menu-group">
          <button class="menu-group-toggle">
            Mi espacio
            <span>▾</span>
          </button>
          <div class="menu-group-content">
            <a href="diario.html">Mi diario</a>
            <a href="exercises-list.html">Ejercicios</a>
            <a href="mis-entradas.html">Mis respuestas</a>
            <a href="agenda-paciente.html">Agenda</a>
          </div>
        </div>
      `;
    }

    menu.innerHTML += `<a href="login.html">Salir</a>`;

    menu.querySelectorAll(".menu-group-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.parentElement.classList.toggle("open");
      });
    });
  });
}
