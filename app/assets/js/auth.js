// app/assets/js/auth.js

import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * LOGIN (login.html)
 */
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

/**
 * PROTEGE PÁGINAS PRIVADAS
 * Garantiza que el usuario esté autenticado
 * y que el ID token esté listo antes de continuar
 */
export function requireAuth() {
  return new Promise((resolve) => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (!user) {
        window.location.href = "/app/login.html";
        return;
      }

      try {
        // 🔥 Fuerza refresco del token para evitar 401 en Cloud Functions
        await user.getIdToken(true);

        console.log("✅ Usuario autenticado");
        console.log("UID:", user.uid);
        console.log("Email:", user.email);

        window.__USER__ = user;

        unsubscribe(); // Evita múltiples ejecuciones
        resolve(user);

      } catch (error) {
        console.error("Error obteniendo token:", error);
        window.location.href = "/app/login.html";
      }

    });

  });
}