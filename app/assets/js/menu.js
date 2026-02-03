import { getAuth, onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
});

export function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  onAuthStateChanged(getAuth(), async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    /* =========================
       ESTRUCTURA BASE MENÚ
    ========================= */
    menu.innerHTML = `
      <div class="app-menu-inner">

        <!-- INICIO -->
        <button class="menu-group-toggle" data-link="index.html">
          Inicio
        </button>

        <!-- FORO -->
        <div class="menu-group">
          <button class="menu-group-toggle">
            Foro
          </button>
          <div class="menu-group-content">
            <a href="foro.html">Ver temas</a>
          </div>
        </div>

        ${role === "therapist" ? therapistBlock() : ""}
        ${role === "patient" ? patientBlock() : ""}

        <!-- SALIR -->
        <button class="menu-group-toggle" data-link="login.html">
          Salir
        </button>

      </div>
    `;

    /* =========================
       NAVEGACIÓN DIRECTA
    ========================= */
    menu.querySelectorAll("[data-link]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = btn.dataset.link;
      });
    });

    /* =========================
       DESPLEGABLES
    ========================= */
    menu.querySelectorAll(".menu-group > .menu-group-toggle")
      .forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();

          const group = btn.parentElement;

          // cerrar otros
          menu.querySelectorAll(".menu-group.open").forEach(g => {
            if (g !== group) g.classList.remove("open");
          });

          group.classList.toggle("open");
        });
      });

    // cerrar al hacer click fuera
    document.addEventListener("click", () => {
      menu.querySelectorAll(".menu-group.open")
        .forEach(g => g.classList.remove("open"));
    });
  });
}

/* =========================
   BLOQUES POR ROL
========================= */

function therapistBlock() {
  return `
    <div class="menu-group">
      <button class="menu-group-toggle">
        Espacio terapeuta
      </button>
      <div class="menu-group-content">
        <a href="diario-terapeuta.html">Diarios pacientes</a>
        <a href="entries-by-exercise.html">Por ejercicio</a>
        <a href="entries-by-patient.html">Por paciente</a>
        <a href="entries-by-exercise.html#pdf">Exportar informes</a>
        <a href="exercises-admin.html">Gestionar ejercicios</a>
        <a href="agenda-terapeuta.html">Agenda profesional</a>
      </div>
    </div>
  `;
}

function patientBlock() {
  return `
    <div class="menu-group">
      <button class="menu-group-toggle">
        Mi espacio
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
