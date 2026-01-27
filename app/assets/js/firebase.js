// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDfxdzL39Ne4XdT9WgSLz3iSliyg-xBR84",
  authDomain: "psicoterapia-isla-app.firebaseapp.com",
  projectId: "psicoterapia-isla-app",
  storageBucket: "psicoterapia-isla-app.firebasestorage.app",
  messagingSenderId: "824485435208",
  appId: "1:824485435208:web:79d2a122d975e2b5cf857d"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);
import { getFirestore, addDoc, collection, serverTimestamp } 
  from "firebase/firestore";
import { auth } from "./auth.js";

const db = getFirestore();

export async function saveExercise(type, data) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  return await addDoc(collection(db, "entries"), {
    uid: user.uid,
    exercise: type,
    data,
    createdAt: serverTimestamp()
  });
}
