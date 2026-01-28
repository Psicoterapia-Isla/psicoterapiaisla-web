import { auth } from "./firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function loadMenu() {
  const menu = document.querySelector(".app-menu");
  if (!menu) return;

  onAuthStateChanged(getAuth(), async (user) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    const role = snap.exists() ? snap.data().role : "patient";

    // Limpia menú
    menu.innerHTML = "";

    // Común
    menu.innerHTML += `<a href="index.html">Inicio</a>`;

    if (role === "therapist") {
      menu.innerHTML += `
        <a href="entradas-terapeuta.html">Vista terapeuta</a>
        <a href="entries-by-exercise.html">Respuestas por ejercicio</a>
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
