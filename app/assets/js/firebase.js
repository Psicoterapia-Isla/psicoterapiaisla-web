import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY_REAL",
  authDomain: "psicoterapia-isla-app.firebaseapp.com",
  projectId: "psicoterapia-isla-app",
  storageBucket: "psicoterapia-isla-app.appspot.com",
  messagingSenderId: "824485435208",
  appId: "1:824485435208:web:XXXX"
};

// 🔹 UNA SOLA APP
export const app = initializeApp(firebaseConfig);

// 🔹 AUTH Y FIRESTORE DEL MISMO APP
export const auth = getAuth(app);
export const db = getFirestore(app);

// 🔹 FUNCIÓN ÚNICA PARA GUARDAR
export async function saveExercise(type, data) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  return await addDoc(collection(db, "entries"), {
    uid: user.uid,
    type,
    data,
    createdAt: serverTimestamp()
  });
}
