// Firebase Auth desde CDN (UNA sola vez)
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { app } from "./firebase.js";

// Auth SIEMPRE desde la misma app
export const auth = getAuth(app);

// LOGIN
export async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

// PROTECCIÓN DE PÁGINAS
export function requireAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../login.html";
    }
  });
}

// LOGOUT (ESTO TE FALTABA)
export function logout() {
  return signOut(auth);
}
