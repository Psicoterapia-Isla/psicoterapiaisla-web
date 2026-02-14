import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export async function loadMenu() {

  const container = document.getElementById("menu");
  if (!container) return;

  container.innerHTML = `
    <nav class="pi-navbar">
      
      <div class="pi-logo">Psicoterapia Isla</div>

      <div class="pi-menu-toggle" id="menuToggle">
        ☰
      </div>

      <ul class="pi-menu" id="mainMenu">

        <li><a href="index.html">Inicio</a></li>
        <li><a href="foro.html">Foro</a></li>
        <li><a href="agenda.html">Agenda</a></li>
        <li><a href="disponibilidad.html">Disponibilidad</a></li>

        <li class="dropdown">
          <span>Gestión clínica ▾</span>
          <ul class="submenu">
            <li><a href="patients.html">Pacientes</a></li>
            <li><a href="add_patient.html">+ Añadir paciente</a></li>
            <li><a href="diario.html">Diario terapeuta</a></li>
          </ul>
        </li>

        <li class="dropdown">
          <span>Trabajo terapéutico ▾</span>
          <ul class="submenu">
            <li><a href="entradas_paciente.html">Entradas por paciente</a></li>
            <li><a href="entradas_ejercicio.html">Entradas por ejercicio</a></li>
            <li><a href="ejercicios_admin.html">Ejercicios admin</a></li>
          </ul>
        </li>

        <li class="dropdown">
          <span>Gestión económica ▾</span>
          <ul class="submenu">
            <li><a href="facturacion.html">Facturación</a></li>
          </ul>
        </li>

        <li class="dropdown right">
          <span>Sistema ▾</span>
          <ul class="submenu">
            <li><a href="usuarios.html">Usuarios</a></li>
            <li><a href="#" id="logoutBtn">Salir</a></li>
          </ul>
        </li>

      </ul>
    </nav>
  `;

  /* Toggle móvil */
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("mainMenu");

  toggle?.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  /* Dropdown comportamiento móvil */
  document.querySelectorAll(".dropdown > span").forEach(el => {
    el.addEventListener("click", () => {
      el.parentElement.classList.toggle("active");
    });
  });

  /* Logout */
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../login.html";
  });
}
