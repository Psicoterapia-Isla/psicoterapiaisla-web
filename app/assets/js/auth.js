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
  storageBucket: "psicoterapia-isla-app.appspot.com",
  messagingSenderId: "824485435208",
  appId: "1:824485435208:web:79d2a122d975e2b5cf857d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// LOGIN
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// PROTEGER PÁGINAS
export function requireAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/app/login.html";
    }
  });
}

// LOGOUT
export async function logout() {
  await signOut(auth);
  window.location.href = "/app/login.html";
}
