import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfxdzL39Ne4XdT9WgSLz3iSliyg-xBR84",
  authDomain: "psicoterapia-isla-app.firebaseapp.com",
  projectId: "psicoterapia-isla-app",
  storageBucket: "psicoterapia-isla-app.firebasestorage.app",
  messagingSenderId: "824485435208",
  appId: "1:824485435208:web:79d2a122d975e2b5cf857d",
  measurementId: "G-9W5Y8BP8DE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// LOGIN
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// LOGOUT (lo usaremos luego)
export async function logout() {
  await signOut(auth);
  window.location.href = "login.html";
}

// PROTECCIÓN
export function requireAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    }
  });
}
