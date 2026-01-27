import { db, auth } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function saveExercise(exerciseKey, data) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  return await addDoc(
    collection(
      db,
      "users",
      user.uid,
      "exercises",
      exerciseKey,
      "answers"
    ),
    {
      data,
      createdAt: serverTimestamp()
    }
  );
}
