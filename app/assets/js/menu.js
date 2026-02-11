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

  const container = document.querySelector(".app-menu");
  if (!container) return;

  const auth = getAuth();
  if (unsubscribeAuth) return;

  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {

    if (!user) {
      container.innerHTML = "";
      return;
    }

    let role = "patient";

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().role) {
        role = snap.data().role;
      }
    } catch {
      console.warn("No se pudo leer rol.");
    }

    const isAdmin = role === "admin";
    const isTherapist = role === "therapist" || isAdmin;

    container.innerHTML = `
      <nav class="app-nav">
        <div class="nav-left">

          <a href="index.html" class="nav-link">Inicio</a>
          <a href="foro.html" class="nav-link">Foro</a>

          ${
            isTherapist ? `
            <div class="nav-dropdown">
              <button class="nav-link dropdown-toggle">
                Espacio terapeuta
              </button>

              <div class="dropdown-menu">
                <a href="agenda.html">Agenda</a>
                <a href="disponibilidad.html">Disponibilidad</a>
                <hr>
                <a href="patients-admin.html">Pacientes</a>
                <a href="diario-terapeuta.html">Diarios pacientes</a>
                <a href="entries-by-patient.html">Registros por paciente</a>
                <hr>
                <a href="patient-invoices.html">Facturación</a>
                ${
                  isAdmin ? `
                  <hr>
                  <a href="exercises-admin.html">Gestionar ejercicios</a>
                  ` : ""
                }
              </div>
            </div>
            ` : `
            <div class="nav-dropdown">
              <button class="nav-link dropdown-toggle">
                Mi espacio
              </button>
              <div class="dropdown-menu">
                <a href="espacio.html">Espacio personal</a>
                <a href="diario.html">Escribir diario</a>
                <a href="mi-diario.html">Mi diario</a>
                <a href="exercises-list.html">Ejercicios</a>
                <hr>
                <a href="reservar.html">Reservar cita</a>
                <a href="agenda-paciente.html">Mis citas</a>
              </div>
            </div>
            `
          }

        </div>

        <div class="nav-right">
          <button id="logout-btn" class="nav-link logout">
            Salir
          </button>
        </div>
      </nav>
    `;

    /* ======================
       DROPDOWN
    ====================== */

    document.querySelectorAll(".dropdown-toggle").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const menu = btn.nextElementSibling;
        closeAllDropdowns();
        menu.classList.toggle("open");
      });
    });

    document.addEventListener("click", closeAllDropdowns);

    function closeAllDropdowns() {
      document.querySelectorAll(".dropdown-menu")
        .forEach(m => m.classList.remove("open"));
    }

    /* ======================
       LOGOUT
    ====================== */

    document.getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
      });

  });
}
