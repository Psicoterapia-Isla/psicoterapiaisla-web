import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";
import { doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let menuRendered = false;

export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user || menuRendered) return;
    menuRendered = true;

    /* ======================
       ROL REAL
    ====================== */
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    const isAdmin = role === "admin";
    const isTherapist = role === "therapist" || isAdmin;

    /* ======================
       MENU
    ====================== */
    menu.innerHTML = `
      <div class="app-menu-inner">

        <!-- INICIO -->
        <button class="menu-group-toggle" data-link="index.html">
          Inicio
        </button>

        <!-- FORO -->
        <div class="menu-group">
          <button class="menu-group-toggle">Foro</button>
          <div class="menu-group-content">
            <a href="foro.html">Foro</a>
          </div>
        </div>

        <!-- ======================
             PACIENTE
        ====================== -->
        ${
          !isTherapist
            ? `
        <div class="menu-group">
          <button class="menu-group-toggle">
            Mi espacio
          </button>
          <div class="menu-group-content">
            <a href="espacio.html">Espacio personal</a>
            <a href="diario.html">Escribir diario</a>
            <a href="mi-diario.html">Mi diario</a>
            <a href="exercises-list.html">Ejercicios</a>

            <hr>

            <!-- NUEVO -->
            <a href="reservar.html">Reservar cita</a>
            <a href="agenda-paciente.html">Mis citas</a>
          </div>
        </div>
        `
            : ""
        }

        <!-- ======================
             TERAPEUTA
        ====================== -->
        ${
          isTherapist
            ? `
        <div class="menu-group">
          <button class="menu-group-toggle">
            Espacio terapeuta
          </button>
          <div class="menu-group-content">

            <!-- AGENDA -->
            <a href="agenda-terapeuta.html">Agenda profesional</a>
            <a href="disponibilidad.html">Definir disponibilidad</a>

            <hr>

            <!-- CLÍNICO -->
            <a href="diario-terapeuta.html">Diarios pacientes</a>
            <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
            <a href="entries-by-patient.html">Respuestas por paciente</a>

            <hr>

            <!-- CONTENIDO -->
            <a href="exercises-admin.html">Gestionar ejercicios</a>

            ${
              isAdmin
                ? `
                <hr>

                <!-- ADMIN -->
                <a href="patients-admin.html">Gestión de pacientes</a>
                <a href="patient-invoices.html">Facturación</a>
                `
                : ""
            }

          </div>
        </div>
        `
            : ""
        }

        <!-- SALIR -->
        <button class="menu-group-toggle" id="logout-btn">
          Salir
        </button>

      </div>
    `;

    /* ======================
       NAVEGACIÓN
    ====================== */
    menu.querySelectorAll("[data-link]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = btn.dataset.link;
      });
    });

    /* ======================
       DESPLEGABLES
    ====================== */
    menu.querySelectorAll(".menu-group > .menu-group-toggle")
      .forEach(btn => {
        btn.addEventListener("click", () => {
          const group = btn.parentElement;

          menu.querySelectorAll(".menu-group.open")
            .forEach(g => {
              if (g !== group) g.classList.remove("open");
            });

          group.classList.toggle("open");
        });
      });

    /* ======================
       LOGOUT
    ====================== */
    document.getElementById("logout-btn")
      .addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
      });
  });
}
