export async function loadMenu(){

  const header = document.querySelector(".app-menu");
  if(!header) return;

  header.innerHTML = `
    <div class="menu-glass">

      <div class="menu-brand">
        Psicoterapia Isla
      </div>

      <nav class="menu-sections">

        <div class="menu-group">
          <button class="menu-toggle">General</button>
          <div class="menu-dropdown">
            <a href="/app/index.html">Inicio</a>
            <a href="/app/foro.html">Foro</a>
            <a href="/app/agenda.html">Agenda</a>
            <a href="/app/disponibilidad.html">Disponibilidad</a>
          </div>
        </div>

        <div class="menu-group">
          <button class="menu-toggle">Gestión</button>
          <div class="menu-dropdown">
            <a href="/app/pacientes.html">Pacientes</a>
            <a href="/app/add-patient.html" class="btn-mini">+ Añadir paciente</a>
            <a href="/app/facturas.html">Facturas</a>
            <a href="/app/diario-terapeuta.html">Diario terapeuta</a>
            <a href="/app/entradas-por-paciente.html">Entradas por paciente</a>
            <a href="/app/entradas-por-ejercicio.html">Entradas por ejercicio</a>
          </div>
        </div>

        <div class="menu-group">
          <button class="menu-toggle">Administración</button>
          <div class="menu-dropdown">
            <a href="/app/ejercicios-admin.html">Ejercicios admin</a>
            <a href="/app/usuarios.html">Usuarios</a>
            <a href="#" id="logoutBtn" class="logout">Cerrar sesión</a>
          </div>
        </div>

      </nav>

    </div>
  `;

  /* Toggle dropdowns */
  document.querySelectorAll(".menu-toggle").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const parent = btn.closest(".menu-group");
      parent.classList.toggle("open");
    });
  });

  /* Logout */
  document.getElementById("logoutBtn")?.addEventListener("click", async ()=>{
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    const { auth } = await import("./firebase.js");
    await signOut(auth);
    window.location.href = "/login.html";
  });

}
