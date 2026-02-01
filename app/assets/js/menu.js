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

    menu.innerHTML = `
      <nav class="menu-box">
        <a class="menu-link" href="index.html">Inicio</a>

        ${
          role === "therapist"
            ? `
          <div class="menu-section">
            <button class="menu-toggle" type="button">
              Espacio terapeuta
            </button>
            <div class="menu-content">
              <a href="diario-terapeuta.html">Diarios pacientes</a>
              <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
              <a href="entries-by-patient.html">Respuestas por paciente</a>
              <a href="entries-by-exercise.html#pdf">Exportar informes (PDF)</a>
              <a href="exercises-admin.html">Gestionar ejercicios</a>
              <a href="agenda-terapeuta.html">Agenda profesional</a>
            </div>
          </div>`
            : ""
        }

        ${
          role === "patient"
            ? `
          <div class="menu-section">
            <button class="menu-toggle" type="button">
              Mi espacio
            </button>
            <div class="menu-content">
              <a href="diario.html">Mi diario</a>
              <a href="exercises-list.html">Ejercicios</a>
              <a href="mis-entradas.html">Mis respuestas</a>
              <a href="agenda-paciente.html">Agenda</a>
            </div>
          </div>`
            : ""
        }

        <a class="menu-link logout" href="login.html">Salir</a>
      </nav>
    `;

    // Toggle
    menu.querySelectorAll(".menu-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.parentElement.classList.toggle("open");
      });
    });
  });
}
