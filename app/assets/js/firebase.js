// app/assets/js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDfxdzl39Ne4XdT9WgSlz3iSliyg-xBR84",
  authDomain: "psicoterapia-isla-app.firebaseapp.com",
  projectId: "psicoterapia-isla-app",
  storageBucket: "psicoterapia-isla-app.firebasestorage.app",
  messagingSenderId: "824485435208",
  appId: "1:824485435208:web:79d2a122d975e2b5cf857d",
  measurementId: "G-9W5Y8BP8DE"
};

// 🔴 UNA SOLA INICIALIZACIÓN
export const app = initializeApp(firebaseConfig);

// 🔴 TODO sale de la MISMA app
export const auth = getAuth(app);
export const db = getFirestore(app);
// Guardar ejercicios / diario (USADO POR diario.html)
export async function saveExercise(type, data) {
  if (!auth.currentUser) {
    throw new Error("Usuario no autenticado");
  }

  return addDoc(collection(db, "entries"), {
    uid: auth.currentUser.uid,
    type,              // "diario", "ejercicio", etc.
    ...data,           // texto, respuestas, etc.
    createdAt: serverTimestamp()
  });
}
