import { app } from "./firebase.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export const auth = getAuth(app);

// LOGIN
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// LOGOUT
export async function logout() {
  return signOut(auth);
}

// PROTEGER PÁGINAS
export function requireAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/app/login.html";
    }
  });
}
