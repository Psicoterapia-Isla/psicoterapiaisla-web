import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
});

export function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    menu.innerHTML = `
      <div class="app-menu-inner">

        <button class="menu-group-toggle" data-link="index.html">
          Inicio
        </button>

        <button class="menu-group-toggle" data-link="foro.html">
          Foro
        </button>

        ${
          role === "therapist"
            ? `<button class="menu-group-toggle" data-link="diario-terapeuta.html">
                 Espacio terapeuta
               </button>`
            : `<button class="menu-group-toggle" data-link="diario.html">
                 Mi espacio
               </button>`
        }

        <button class="menu-group-toggle" data-link="login.html">
          Salir
        </button>

      </div>
    `;

    menu.querySelectorAll("[data-link]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = btn.dataset.link;
      });
    });
  });
}
