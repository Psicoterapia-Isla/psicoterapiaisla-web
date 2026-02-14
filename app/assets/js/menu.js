export async function loadMenu() {

  const header = document.querySelector(".app-menu");
  if (!header) return;

  header.innerHTML = `
    <div class="menu-container">

      <div class="menu-left">
        <a href="index.html" class="menu-logo">
          Psicoterapia Isla
        </a>

        <div class="menu-group">
          <button class="menu-parent">General</button>
          <div class="menu-dropdown">
            <a href="index.html">Inicio</a>
            <a href="foro.html">Foro</a>
          </div>
        </div>

        <div class="menu-group">
          <button class="menu-parent">Gestión</button>
          <div class="menu-dropdown">
            <a href="agenda.html">Agenda</a>
            <a href="disponibilidad.html">Disponibilidad</a>
            <a href="pacientes.html">Pacientes</a>
            <a href="add-patient.html" class="btn-small">
              + Añadir paciente
            </a>
          </div>
        </div>

        <div class="menu-group">
          <button class="menu-parent">Administración</button>
          <div class="menu-dropdown">
            <a href="facturacion.html">Facturación</a>
            <a href="diario-terapeuta.html">Diario terapeuta</a>
            <a href="entradas-paciente.html">Entradas por paciente</a>
            <a href="entradas-ejercicio.html">Entradas por ejercicio</a>
            <a href="ejercicios-admin.html">Ejercicios admin</a>
            <a href="usuarios.html">Usuarios</a>
          </div>
        </div>
      </div>

      <div class="menu-right">
        <a href="#" id="logoutBtn" class="logout-btn">Salir</a>
      </div>

    </div>
  `;

  // desplegables
  document.querySelectorAll(".menu-parent").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.parentElement.classList.toggle("open");
    });
  });

  // logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
      const auth = getAuth();
      await signOut(auth);
      window.location.href = "/login.html";
    });
  }
}
