// app/assets/js/menu.js

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let unsubscribeAuth = null;

export async function loadMenu() {

  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  const auth = getAuth();

  // 🔒 Evitar múltiples listeners
  if (unsubscribeAuth) return;

  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {

    if (!user) {
      menu.innerHTML = "";
      return;
    }

    /* ======================
       OBTENER ROL REAL
    ====================== */

    let role = "patient";

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().role) {
        role = snap.data().role;
      }
    } catch (err) {
      console.warn("menu.js → no se pudo leer rol");
    }

    const isAdmin = role === "admin";
    const isTherapist = role === "therapist" || isAdmin;

    /* ======================
       CONSTRUIR MENÚ
    ====================== */

    menu.innerHTML = `
      <div class="app-menu-inner">

        <!-- INICIO -->
        <button class="menu-item" data-link="index.html">
          Inicio
        </button>

        <!-- FORO -->
        <div class="menu-group">
          <button class="menu-group-toggle">Foro</button>
          <div class="menu-group-content">
            <a href="foro.html">Foro</a>
          </div>
        </div>

        ${
          !isTherapist ? `
        <!-- ======================
             PACIENTE
        ====================== -->
        <div class="menu-group">
          <button class="menu-group-toggle">Mi espacio</button>
          <div class="menu-group-content">
            <a href="espacio.html">Espacio personal</a>
            <a href="diario.html">Escribir diario</a>
            <a href="mi-diario.html">Mi diario</a>
            <a href="exercises-list.html">Ejercicios</a>
            <hr>
            <a href="reservar.html">Reservar cita</a>
            <a href="agenda-paciente.html">Mi agenda</a>
          </div>
        </div>
        ` : ""}

        ${
          isTherapist ? `
        <!-- ======================
             TERAPEUTA
        ====================== -->
        <div class="menu-group">
          <button class="menu-group-toggle">Espacio terapeuta</button>
          <div class="menu-group-content">

            <!-- AGENDA -->
            <a href="agenda.html">Agenda</a>
            <a href="disponibilidad.html">Disponibilidad</a>

            <hr>

            <!-- PACIENTES -->
            <a href="patients-admin.html">Pacientes</a>
            <a href="diario-terapeuta.html">Diarios pacientes</a>
            <a href="entries-by-patient.html">Registros por paciente</a>

            <hr>

            <!-- FACTURACIÓN -->
            <a href="patient-invoices.html">Facturación</a>

            ${
              isAdmin ? `
              <hr>
              <!-- ADMIN -->
              <a href="exercises-admin.html">Gestionar ejercicios</a>
              ` : ""
            }

          </div>
        </div>
        ` : ""}

        <!-- SALIR -->
        <button class="menu-item" id="logout-btn">
          Salir
        </button>

      </div>
    `;

    /* ======================
       NAVEGACIÓN DIRECTA
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

        btn.addEventListener("click", (e) => {

          e.stopPropagation();
          const group = btn.parentElement;

          menu.querySelectorAll(".menu-group.open")
            .forEach(g => {
              if (g !== group) g.classList.remove("open");
            });

          group.classList.toggle("open");
        });

      });

    document.addEventListener("click", () => {
      menu.querySelectorAll(".menu-group.open")
        .forEach(g => g.classList.remove("open"));
    });

    /* ======================
       LOGOUT
    ====================== */

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
      });
    }

  });
}
