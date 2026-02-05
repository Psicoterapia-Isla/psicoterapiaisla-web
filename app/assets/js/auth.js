// app/assets/js/auth.js

import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "/app/login.html";
        return;
      }

      // 🔴 DEBUG TEMPORAL (IMPORTANTE)
      console.log("✅ Usuario autenticado");
      console.log("👉 UID:", user.uid);
      console.log("👉 Email:", user.email);

      // Opcional pero útil
      window.__USER__ = user;

      resolve(user);
    });
  });
}
