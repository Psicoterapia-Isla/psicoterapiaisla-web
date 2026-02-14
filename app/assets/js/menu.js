import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export async function loadMenu() {

  const header = document.querySelector(".app-menu");
  if (!header) return;

  const currentPage = window.location.pathname.split("/").pop();

  header.innerHTML = `
    <div class="menu-brand">
      Psicoterapia Isla
    </div>

    <nav class="menu-links">

      <a href="agenda.html" 
         class="menu-link ${currentPage === "agenda.html" ? "active" : ""}">
         Agenda
      </a>

      <a href="availability.html" 
         class="menu-link ${currentPage === "availability.html" ? "active" : ""}">
         Disponibilidad
      </a>

      <a href="patients-admin.html" 
         class="menu-link ${
           currentPage === "patients-admin.html" ||
           currentPage === "add-patient.html"
             ? "active"
             : ""
         }">
         Pacientes
      </a>

      <a href="invoices.html" 
         class="menu-link ${currentPage === "invoices.html" ? "active" : ""}">
         Facturas
      </a>

      <a href="entries.html" 
         class="menu-link ${currentPage === "entries.html" ? "active" : ""}">
         Diario
      </a>

      <a href="exercises.html" 
         class="menu-link ${currentPage === "exercises.html" ? "active" : ""}">
         Ejercicios
      </a>

      <a href="therapist-notes.html" 
         class="menu-link ${currentPage === "therapist-notes.html" ? "active" : ""}">
         Notas
      </a>

      <a href="forums.html" 
         class="menu-link ${currentPage === "forums.html" ? "active" : ""}">
         Foro
      </a>

      <a href="#" class="menu-link menu-logout" id="logoutBtn">
         Salir
      </a>

    </nav>
  `;

  const logoutBtn = document.getElementById("logoutBtn");

  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = "index.html";
  });
}
