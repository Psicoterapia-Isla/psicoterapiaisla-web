import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function loadMenu() {
  const header = document.querySelector(".app-menu-inner");
  if (!header) return;

  const user = auth.currentUser;
  if (!user) return;

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const role = userSnap.exists() ? userSnap.data().role : "patient";
  const isTherapist = role === "therapist";

  header.innerHTML = `
    <a href="index.html">Inicio</a>
    <a href="foro.html">Foro</a>

    ${isTherapist ? therapistMenu() : patientMenu()}

    <button id="logout-btn">Salir</button>
  `;

  setupDropdowns();

  document
    .getElementById("logout-btn")
    .addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });
}

/* ======================
   MENÚ PACIENTE
====================== */
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

/* ======================
   MENÚ TERAPEUTA
====================== */
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

/* ======================
   DROPDOWNS
====================== */
function setupDropdowns() {
  document.querySelectorAll(".menu-group-toggle").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const group = btn.closest(".menu-group");
      group.classList.toggle("open");
    });
  });

  document.addEventListener("click", () => {
    document
      .querySelectorAll(".menu-group.open")
      .forEach(g => g.classList.remove("open"));
  });
}
