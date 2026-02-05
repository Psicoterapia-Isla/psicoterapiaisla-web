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
 */
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "/app/login.html";
        return;
      }

      // DEBUG ÚTIL
      console.log("✅ Usuario autenticado");
      console.log("UID:", user.uid);
      console.log("Email:", user.email);

      window.__USER__ = user;

      resolve(user);
    });
  });
}
