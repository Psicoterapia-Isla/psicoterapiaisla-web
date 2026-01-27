// app/assets/js/auth.js

import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export function requireAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/app/login.html";
    }
  });
}
