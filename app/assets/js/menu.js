import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
});

export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

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
            <a href="foro.html">Temas del foro</a>
          </div>
        </div>

        <!-- BLOQUE TERAPEUTA -->
        ${role === "therapist" ? therapistBlock() : ""}

        <!-- BLOQUE PACIENTE -->
        ${role === "patient" ? patientBlock() : ""}

        <!-- SALIR -->
        <button class="menu-group-toggle" id="logout-btn">
          Salir
        </button>

      </div>
    `;

    /* ---------- navegación directa ---------- */
    menu.querySelectorAll("[data-link]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = btn.dataset.link;
      });
    });

    /* ---------- logout ---------- */
    const logoutBtn = menu.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await auth.signOut();
        window.location.href = "login.html";
      });
    }

    /* ---------- desplegables ---------- */
    menu.querySelectorAll(".menu-group > .menu-group-toggle").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const group = btn.parentElement;

        // cerrar otros desplegables
        menu.querySelectorAll(".menu-group.open").forEach(g => {
          if (g !== group) g.classList.remove("open");
        });

        group.classList.toggle("open");
      });
    });

    // cerrar al hacer click fuera
    document.addEventListener("click", () => {
      menu.querySelectorAll(".menu-group.open").forEach(g => {
        g.classList.remove("open");
      });
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
        <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
        <a href="entries-by-patient.html">Respuestas por paciente</a>
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
