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
    } catch {}

    const isAdmin = role === "admin";
    const isTherapist = role === "therapist" || isAdmin;

    container.innerHTML = `
      <nav class="top-nav">

        <div class="top-left">
          <a href="index.html" class="nav-link">Inicio</a>
          <a href="foro.html" class="nav-link">Foro</a>

          ${
            isTherapist ? `
              <a href="agenda.html" class="nav-link">Agenda</a>
              <a href="disponibilidad.html" class="nav-link">Disponibilidad</a>
              <a href="patients-admin.html" class="nav-link">Pacientes</a>
              <a href="add-patient.html" class="nav-link nav-highlight">+ Añadir paciente</a>
              <a href="facturas.html" class="nav-link">Facturación</a>
              <a href="diario-terapeuta.html" class="nav-link">Diario terapeuta</a>
              <a href="entries-by-patient.html" class="nav-link">Entradas por paciente</a>
              <a href="entries-by-exercise.html" class="nav-link">Entradas por ejercicio</a>
              ${
                isAdmin
                  ? `<a href="exercises-admin.html" class="nav-link">Ejercicios admin</a>
                     <a href="users-admin.html" class="nav-link">Usuarios</a>`
                  : ""
              }
            `
            :
            `
              <a href="espacio.html" class="nav-link">Mi espacio</a>
              <a href="mi-diario.html" class="nav-link">Mi diario</a>
              <a href="mis-entradas.html" class="nav-link">Mis entradas</a>
              <a href="exercises-list.html" class="nav-link">Ejercicios</a>
              <a href="reservar.html" class="nav-link">Reservar</a>
              <a href="agenda-paciente.html" class="nav-link">Mis citas</a>
            `
          }
        </div>

        <div class="top-right">
          <button id="logout-btn" class="nav-link logout">
            Salir
          </button>
        </div>

      </nav>
    `;

    document.getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
      });

  });
}
