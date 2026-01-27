import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfxdzl39Ne4XdT9WgSlz3iSliyg-xBR84",
  authDomain: "psicoterapia-isla-app.firebaseapp.com",
  projectId: "psicoterapia-isla-app",
  storageBucket: "psicoterapia-isla-app.appspot.com",
  messagingSenderId: "824485435208",
  appId: "1:824485435208:web:XXXXXXXX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ ESTA FUNCIÓN FALTABA
export async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

// ✅ PROTECCIÓN DE PÁGINAS
export function requireAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    }
  });
}
import { getAuth } from "firebase/auth";

export const auth = getAuth();
