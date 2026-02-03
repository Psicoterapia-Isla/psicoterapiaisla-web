import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
});

export function loadMenu() {
  const menuInner = document.querySelector(".app-menu-inner");
  if (!menuInner) return;

  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    menuInner.innerHTML = `
      <button data-link="index.html">Inicio</button>

      <div class="menu-group">
        <button class="menu-group-toggle">Foro</button>
        <div class="menu-group-content">
          <a href="foro.html">Temas del foro</a>
        </div>
      </div>

      ${role === "therapist" ? therapistBlock() : ""}
      ${role === "patient" ? patientBlock() : ""}

      <button id="logout-btn">Salir</button>
    `;

    // navegación directa
    menuInner.querySelectorAll("[data-link]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = btn.dataset.link;
      });
    });

    // logout
    const logoutBtn = menuInner.querySelector("#logout-btn");
    logoutBtn?.addEventListener("click", async () => {
      await auth.signOut();
      window.location.href = "login.html";
    });

    // desplegables
    menuInner.querySelectorAll(".menu-group-toggle").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const group = btn.closest(".menu-group");

        menuInner.querySelectorAll(".menu-group.open").forEach(g => {
          if (g !== group) g.classList.remove("open");
        });

        group?.classList.toggle("open");
      });
    });

    document.addEventListener("click", () => {
      menuInner
        .querySelectorAll(".menu-group.open")
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
      <button class="menu-group-toggle">Espacio terapeuta</button>
      <div class="menu-group-content">
        <a href="diario-terapeuta.html">Diario pacientes</a>
        <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
        <a href="entries-by-patient.html">Respuestas por paciente</a>
        <a href="agenda-terapeuta.html">Agenda profesional</a>
        <a href="exercises-admin.html">Gestionar ejercicios</a>
      </div>
    </div>
  `;
}

function patientBlock() {
  return `
    <div class="menu-group">
      <button class="menu-group-toggle">Mi espacio</button>
      <div class="menu-group-content">
        <a href="diario.html">Mi diario</a>
        <a href="exercises-list.html">Ejercicios</a>
        <a href="mis-entradas.html">Mis respuestas</a>
        <a href="agenda-paciente.html">Agenda</a>
      </div>
    </div>
  `;
}
