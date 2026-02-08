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

/* =========================
   ESTADO GLOBAL (ANTI-BUCLE)
========================= */
let menuInitialized = false;
let authListenerAttached = false;

/* =========================
   API PÚBLICA
========================= */
export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  if (menuInitialized) return;
  menuInitialized = true;

  const auth = getAuth();

  if (!authListenerAttached) {
    authListenerAttached = true;

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        menu.innerHTML = "";
        return;
      }

      await renderMenu(menu, user, auth);
    });
  }
}

/* =========================
   RENDER MENÚ
========================= */
async function renderMenu(menu, user, auth) {

  /* ===== ROL REAL ===== */
  let role = "patient";

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      role = snap.data().role || "patient";
    }
  } catch (e) {
    console.warn("menu.js → error leyendo rol", e);
  }

  const isAdmin = role === "admin";
  const isTherapist = role === "therapist" || isAdmin;

  /* ===== HTML ===== */
  menu.innerHTML = `
    <div class="app-menu-inner">

      <button data-link="index.html">Inicio</button>

      <div class="menu-group">
        <button class="menu-group-toggle">Foro</button>
        <div class="menu-group-content">
          <a href="foro.html">Foro</a>
        </div>
      </div>

      ${
        !isTherapist ? `
        <div class="menu-group">
          <button class="menu-group-toggle">Mi espacio</button>
          <div class="menu-group-content">
            <a href="espacio.html">Espacio personal</a>
            <a href="diario.html">Escribir diario</a>
            <a href="mi-diario.html">Mi diario</a>
            <a href="exercises-list.html">Ejercicios</a>
            <hr>
            <a href="reservar.html">Reservar cita</a>
            <a href="agenda-paciente.html">Mis citas</a>
          </div>
        </div>
        ` : ""
      }

      ${
        isTherapist ? `
        <div class="menu-group">
          <button class="menu-group-toggle">Espacio terapeuta</button>
          <div class="menu-group-content">
            <a href="agenda-semanal.html">Agenda semanal</a>
            <a href="agenda-diaria.html">Agenda diaria</a>
            <a href="disponibilidad.html">Definir disponibilidad</a>
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
        ` : ""
      }

      <button id="logout-btn">Salir</button>

    </div>
  `;

  bindMenuEvents(menu, auth);
}

/* =========================
   EVENTOS (DELEGADOS)
========================= */
function bindMenuEvents(menu, auth) {

  /* navegación */
  menu.querySelectorAll("[data-link]").forEach(btn => {
    btn.onclick = () => {
      window.location.href = btn.dataset.link;
    };
  });

  /* desplegables */
  menu.querySelectorAll(".menu-group-toggle").forEach(btn => {
    btn.onclick = () => {
      const group = btn.closest(".menu-group");

      menu.querySelectorAll(".menu-group.open")
        .forEach(g => {
          if (g !== group) g.classList.remove("open");
        });

      if (group) {
        group.classList.toggle("open");
      }
    };
  });

  /* logout */
  const logoutBtn = menu.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut(auth);
      window.location.href = "login.html";
    };
  }
}
