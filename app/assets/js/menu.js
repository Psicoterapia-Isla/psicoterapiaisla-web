import { getAuth, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================================================
   AUTO INIT (para HTML nuevos)
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  safeInitMenu();
});

/* =====================================================
   EXPORT (para HTML antiguos)
===================================================== */
export async function loadMenu() {
  safeInitMenu();
}

/* =====================================================
   INIT SEGURO (UNA SOLA VEZ)
===================================================== */
let menuInitialized = false;

function safeInitMenu() {
  if (menuInitialized) return;

  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    renderMenu(menu, role);
    setupInteractions(menu, auth);

    menuInitialized = true;
  });
}

/* =====================================================
   RENDER
===================================================== */
function renderMenu(menu, role) {
  menu.innerHTML = `
    <div class="app-menu-inner">

      <button class="menu-link" data-link="index.html">Inicio</button>
      <button class="menu-link" data-link="foro.html">Foro</button>

      ${role === "patient" ? patientMenu() : ""}
      ${role === "therapist" ? therapistMenu() : ""}

      <button class="menu-link" id="logout-btn">Salir</button>

    </div>
  `;
}

/* =====================================================
   MENÚS POR ROL
===================================================== */
function patientMenu() {
  return `
    <div class="menu-group">
      <button class="menu-group-toggle">Mi espacio</button>
      <div class="menu-group-content">
        <a href="espacio.html">Espacio personal</a>
        <a href="diario.html">Escribir diario</a>
        <a href="mi-diario.html">Mi diario</a>
        <a href="exercises-list.html">Ejercicios</a>
        <a href="agenda-paciente.html">Agenda</a>
      </div>
    </div>
  `;
}

function therapistMenu() {
  return `
    <div class="menu-group">
      <button class="menu-group-toggle">Espacio terapeuta</button>
      <div class="menu-group-content">
        <a href="agenda-terapeuta.html">Agenda profesional</a>
        <a href="diario-terapeuta.html">Diario pacientes</a>
        <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
        <a href="entries-by-patient.html">Respuestas por paciente</a>
        <a href="crear-ejercicio.html">Gestionar ejercicios</a>
      </div>
    </div>
  `;
}

/* =====================================================
   INTERACCIONES
===================================================== */
function setupInteractions(menu, auth) {

  // navegación
  menu.querySelectorAll("[data-link]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = btn.dataset.link;
    });
  });

  // logout
  const logoutBtn = menu.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });
  }

  // desplegables
  menu.querySelectorAll(".menu-group-toggle").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const group = btn.closest(".menu-group");

      menu.querySelectorAll(".menu-group.open")
        .forEach(g => g !== group && g.classList.remove("open"));

      group.classList.toggle("open");
    });
  });

  document.addEventListener("click", () => {
    menu.querySelectorAll(".menu-group.open")
      .forEach(g => g.classList.remove("open"));
  });
}
