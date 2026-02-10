// assets/js/footer.js

document.addEventListener("DOMContentLoaded", () => {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  footer.innerHTML = `
    <footer class="site-footer">

      <div class="footer-columns">

        <div class="footer-col">
          <h4>Psicoterapia Isla</h4>
          <p>
            Atención psicológica especializada en trauma, apego,
            violencia sexual y autismo.
          </p>
        </div>

        <div class="footer-col">
          <h4>Centros sanitarios</h4>
          <ul>
            <li>Centro Viladecans</li>
            <li>Centro Badalona</li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Colaboraciones</h4>
          <ul>
            <li>Ajuntament de Cunit</li>
            <li>Casal Jove de Cunit</li>
            <li>COPC</li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">LOPD y privacidad</a></li>
            <li><a href="#">Aviso legal</a></li>
          </ul>
        </div>

      </div>

      <div class="footer-bottom">
        <p>© Psicoterapia Isla · Centro sanitario autorizado</p>
      </div>

    </footer>
  `;
});
