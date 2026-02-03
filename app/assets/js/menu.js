import { getAuth, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      menu.innerHTML = "";
      return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";
    const isTherapist = role === "therapist";

    menu.innerHTML = `
      <div class="app-menu-inner">

        <button data-link="index.html">Inicio</button>

        <button data-link="foro.html">Foro</button>

        ${
          isTherapist
            ? therapistMenu()
            : patientMenu()
        }

        <button id="logout-btn">Salir</button>
      </div>
    `;

    // navegación
    menu.querySelectorAll("[data-link]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = btn.dataset.link;
      });
    });

    // logout
    menu.querySelector("#logout-btn")
      .addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
      });

    // desplegables
    menu.querySelectorAll(".menu-group-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".menu-group");
        group.classList.toggle("open");
      });
    });
  });
}

/* =====================
   MENÚ PACIENTE
===================== */
function patientMenu() {
  return `
    <div class="menu-group">
      <button class="menu-group-toggle">Mi espacio</button>
      <div class="menu-group-content">
        <a href="espacio-terapeutico.html">Espacio personal</a>
        <a href="diario.html">Escribir diario</a>
        <a href="mi-diario.html">Mi diario</a>
        <a href="exercises-list.html">Ejercicios</a>
        <a href="agenda-paciente.html">Agenda</a>
      </div>
    </div>
  `;
}

/* =====================
   MENÚ TERAPEUTA
===================== */
function therapistMenu() {
  return `
    <div class="menu-group">
      <button class="menu-group-toggle">Espacio terapeuta</button>
      <div class="menu-group-content">
        <a href="agenda-terapeuta.html">Agenda profesional</a>
        <a href="diarios-pacientes.html">Diarios pacientes</a>
        <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
        <a href="entries-by-patient.html">Respuestas por paciente</a>
        <a href="exercises-admin.html">Gestionar ejercicios</a>
      </div>
    </div>
  `;
}
