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

let authListener = null;

export async function loadMenu() {
  const container = document.querySelector(".app-menu");
  if (!container) return;

  const auth = getAuth();

  // Evitar múltiples listeners
  if (authListener) return;

  authListener = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      container.innerHTML = "";
      return;
    }

    /* ======================
       ROL
    ====================== */
    let role = "patient";
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().role) {
        role = snap.data().role;
      }
    } catch (_) {}

    const isAdmin = role === "admin";
    const isTherapist = role === "therapist" || isAdmin;

    /* ======================
       MENU HTML
    ====================== */
    container.innerHTML = `
      <nav class="menu-bar">
        <div class="menu-left">
          <button id="menu-toggle" class="menu-toggle" aria-label="Abrir menú">☰</button>
          <span class="menu-logo">Psicoterapia Isla</span>
        </div>

        <div class="menu-right">
          <button id="logout-btn" class="menu-logout">Salir</button>
        </div>
      </nav>

      <aside class="menu-drawer" id="menu-drawer">
        <div class="menu-section">
          <a href="index.html">Inicio</a>
          <a href="foro.html">Foro</a>
        </div>

        ${
          !isTherapist ? `
          <div class="menu-section">
            <h4>Mi espacio</h4>
            <a href="espacio.html">Espacio personal</a>
            <a href="agenda-paciente.html">Mis citas</a>
            <a href="reservar.html">Reservar cita</a>
            <a href="diario.html">Diario</a>
            <a href="exercises-list.html">Ejercicios</a>
          </div>
        ` : ""}

        ${
          isTherapist ? `
          <div class="menu-section">
            <h4>Espacio terapeuta</h4>
            <a href="agenda.html">Agenda</a>
            <a href="disponibilidad.html">Disponibilidad</a>
            <a href="patients-admin.html">Pacientes</a>
            <a href="patient-invoices.html">Facturación</a>
          </div>
        ` : ""}

        ${
          isAdmin ? `
          <div class="menu-section">
            <h4>Administración</h4>
            <a href="exercises-admin.html">Gestionar ejercicios</a>
          </div>
        ` : ""}
      </aside>

      <div class="menu-overlay" id="menu-overlay"></div>
    `;

    /* ======================
       INTERACCIÓN
    ====================== */
    const drawer = document.getElementById("menu-drawer");
    const overlay = document.getElementById("menu-overlay");
    const toggle = document.getElementById("menu-toggle");
    const logoutBtn = document.getElementById("logout-btn");

    // abrir / cerrar menú
    toggle.addEventListener("click", () => {
      drawer.classList.toggle("open");
      overlay.classList.toggle("show");
    });

    overlay.addEventListener("click", () => {
      drawer.classList.remove("open");
      overlay.classList.remove("show");
    });

    // cerrar menú al navegar (CLAVE PARA MÓVIL)
    drawer.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        drawer.classList.remove("open");
        overlay.classList.remove("show");
      });
    });

    // logout
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });
  });
}
