// Firebase SDKs (CDN, una sola vez)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDfxdzL39Ne4XdT9WgSLz3iSliyg-xBR84",
  authDomain: "psicoterapia-isla-app.firebaseapp.com",
  projectId: "psicoterapia-isla-app",
  storageBucket: "psicoterapia-isla-app.appspot.com",
  messagingSenderId: "824485435208",
  appId: "1:824485435208:web:79d2a122d975e2b5cf857d"
};

// Inicializar Firebase UNA SOLA VEZ
export const app = initializeApp(firebaseConfig);

// Auth y Firestore desde la MISMA app
export const auth = getAuth(app);
export const db = getFirestore(app);

// Guardar ejercicios
export async function saveExercise(exercise, data) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  await addDoc(collection(db, "entries"), {
    exercise,
    ...data,              // ← MUY IMPORTANTE
    uid: user.uid,
    email: user.email,
    createdAt: serverTimestamp()
  });
}
