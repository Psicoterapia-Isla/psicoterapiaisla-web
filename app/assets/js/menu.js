import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export async function loadMenu() {

  const header = document.querySelector(".app-menu");
  if (!header) return;

  const currentPage = window.location.pathname.split("/").pop();

  header.innerHTML = `
    <div class="menu-glass">

      <div class="menu-brand">
        Psicoterapia Isla
      </div>

      <nav class="menu-nav">

        <!-- GENERAL -->
        <div class="menu-group">
          <button class="menu-toggle">General</button>
          <div class="menu-dropdown">
            <a href="index.html" class="${currentPage === "index.html" ? "active" : ""}">
              Inicio
            </a>
            <a href="agenda.html" class="${currentPage === "agenda.html" ? "active" : ""}">
              Agenda
            </a>
            <a href="agenda-paciente.html" class="${currentPage === "agenda-paciente.html" ? "active" : ""}">
              Agenda paciente
            </a>
            <a href="crear-cita.html" class="${currentPage === "crear-cita.html" ? "active" : ""}">
              Crear cita
            </a>
            <a href="disponibilidad.html" class="${currentPage === "disponibilidad.html" ? "active" : ""}">
              Disponibilidad
            </a>
          </div>
        </div>

        <!-- PACIENTES -->
        <div class="menu-group">
          <button class="menu-toggle">Pacientes</button>
          <div class="menu-dropdown">
            <a href="patients-admin.html" class="${
              currentPage === "patients-admin.html" ? "active" : ""
            }">
              Lista pacientes
            </a>
            <a href="add-patient.html" class="${
              currentPage === "add-patient.html" ? "active" : ""
            }">
              Añadir paciente
            </a>
            <a href="patients-invoices.html" class="${
              currentPage === "patients-invoices.html" ? "active" : ""
            }">
              Facturas por paciente
            </a>
          </div>
        </div>

        <!-- DIARIO Y ENTRADAS -->
        <div class="menu-group">
          <button class="menu-toggle">Diario</button>
          <div class="menu-dropdown">
            <a href="diario.html" class="${currentPage === "diario.html" ? "active" : ""}">
              Diario paciente
            </a>
            <a href="diario-terapeuta.html" class="${
              currentPage === "diario-terapeuta.html" ? "active" : ""
            }">
              Diario terapeuta
            </a>
            <a href="mis-entradas.html" class="${
              currentPage === "mis-entradas.html" ? "active" : ""
            }">
              Mis entradas
            </a>
            <a href="entries-list.html" class="${
              currentPage === "entries-list.html" ? "active" : ""
            }">
              Lista general entradas
            </a>
            <a href="entries-by-patient.html" class="${
              currentPage === "entries-by-patient.html" ? "active" : ""
            }">
              Entradas por paciente
            </a>
            <a href="entradas-terapeuta.html" class="${
              currentPage === "entradas-terapeuta.html" ? "active" : ""
            }">
              Entradas terapeuta
            </a>
            <a href="entries-by-exercise.html" class="${
              currentPage === "entries-by-exercise.html" ? "active" : ""
            }">
              Entradas por ejercicio
            </a>
          </div>
        </div>

        <!-- EJERCICIOS -->
        <div class="menu-group">
          <button class="menu-toggle">Ejercicios</button>
          <div class="menu-dropdown">
            <a href="exercises.html" class="${currentPage === "exercises.html" ? "active" : ""}">
              Listado ejercicios
            </a>
          </div>
        </div>

        <!-- FORO -->
        <div class="menu-group">
          <button class="menu-toggle">Foro</button>
          <div class="menu-dropdown">
            <a href="foro.html" class="${currentPage === "foro.html" ? "active" : ""}">
              Foro general
            </a>
            <a href="foro-tema.html" class="${currentPage === "foro-tema.html" ? "active" : ""}">
              Tema foro
            </a>
          </div>
        </div>

        <!-- FACTURAS -->
        <div class="menu-group">
          <button class="menu-toggle">Facturas</button>
          <div class="menu-dropdown">
            <a href="facturas.html" class="${currentPage === "facturas.html" ? "active" : ""}">
              Todas las facturas
            </a>
          </div>
        </div>

        <!-- ESPACIO PERSONAL -->
        <div class="menu-group">
          <button class="menu-toggle">Espacio</button>
          <div class="menu-dropdown">
            <a href="espacio.html" class="${currentPage === "espacio.html" ? "active" : ""}">
              Mi espacio
            </a>
          </div>
        </div>

      </nav>

      <a href="#" class="menu-logout" id="logoutBtn">Salir</a>

    </div>
  `;

  /* ===== Dropdown behaviour ===== */
  document.querySelectorAll(".menu-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const parent = btn.parentElement;
      parent.classList.toggle("open");
    });
  });

  /* ===== Logout ===== */
  const logoutBtn = document.getElementById("logoutBtn");

  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = "index.html";
  });

}
