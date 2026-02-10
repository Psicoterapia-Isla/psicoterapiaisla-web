// assets/js/menu-public.js

document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("site-menu");
  if (!menu) return;

  menu.innerHTML = `
    <nav class="main-nav">
      <div class="nav-left">
        <a href="index.html" class="logo">Psicoterapia Isla</a>
      </div>

      <div class="nav-right">
        <a href="enfoque.html">Enfoque</a>
        <a href="servicios.html">Servicios</a>
        <a href="centros.html">Centros</a>
        <a href="quienes-somos.html">Quiénes somos</a>
        <a href="reserva.html" class="cta-nav">Reserva</a>
        <a href="./app/login.html" class="app-link">APP</a>
      </div>
    </nav>
  `;
});
