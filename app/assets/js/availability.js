import { auth } from "./firebase.js";
import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById("availabilityForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return alert("No autenticado");

  const start = new Date(document.getElementById("start").value);
  const end = new Date(document.getElementById("end").value);

  if (end <= start) {
    alert("Fin debe ser posterior al inicio");
    return;
  }

  await addDoc(collection(db, "availability"), {
    therapistId: user.uid,
    start,
    end,
    createdAt: serverTimestamp()
  });

  alert("Disponibilidad añadida");
  form.reset();
});
