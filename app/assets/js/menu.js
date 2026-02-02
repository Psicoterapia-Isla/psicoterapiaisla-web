import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
});

export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  // 🔒 Estructura fija del menú (NO volver a tocar)
  menu.innerHTML = `<div class="app-menu-inner"></div>`;
  const container = menu.querySelector(".app-menu-inner");

  onAuthStateChanged(getAuth(), async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    // Limpieza segura
    container.innerHTML = "";

    // =====================
    // INICIO
    // =====================
    container.innerHTML += `
      <a href="index.html">Inicio</a>
    `;

    // =====================
    // TERAPEUTA
    // =====================
    if (role === "therapist") {
      container.innerHTML += `
        <div class="menu-group">
          <button type="button" class="menu-group-toggle">
            Espacio terapeuta
            <span class="arrow">▾</span>
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

    // =====================
    // PACIENTE
    // =====================
    if (role === "patient") {
      container.innerHTML += `
        <div class="menu-group">
          <button type="button" class="menu-group-toggle">
            Mi espacio
            <span class="arrow">▾</span>
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

    // =====================
    // SALIR
    // =====================
    container.innerHTML += `
      <a href="login.html">Salir</a>
    `;

    // =====================
    // TOGGLE DESPLEGABLE
    // =====================
    container.querySelectorAll(".menu-group-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".menu-group");
        group.classList.toggle("open");
      });
    });
  });
}
