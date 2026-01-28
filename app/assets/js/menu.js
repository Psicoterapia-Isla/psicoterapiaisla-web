import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  onAuthStateChanged(getAuth(), async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "patient";

    menu.innerHTML = `
      <a href="index.html">Inicio</a>
    `;

    if (role === "therapist") {
      menu.innerHTML += `
        <a href="diario-terapeuta.html">Diarios pacientes</a>
        <a href="entradas-terapeuta.html">Entradas</a>
        <a href="entries-by-exercise.html">Por ejercicio</a>
      `;
    }

    if (role === "patient") {
      menu.innerHTML += `
        <a href="diario.html">Mi diario</a>
        <a href="mis-respuestas.html">Mis respuestas</a>
      `;
    }

    menu.innerHTML += `<a href="login.html">Salir</a>`;
  });
}
