import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const nombreInput = document.getElementById("nombre");
const apellidosInput = document.getElementById("apellidos");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");
const errorMsg = document.getElementById("errorMsg");

registerBtn.addEventListener("click", async () => {

  errorMsg.textContent = "";

  const nombre = nombreInput.value.trim();
  const apellidos = apellidosInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!nombre || !email || !password) {
    errorMsg.textContent = "Completa los campos obligatorios";
    return;
  }

  try {

    // 1️⃣ Crear usuario en Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // 2️⃣ Crear documento en users
    await setDoc(doc(db, "users", user.uid), {
      role: "patient",
      createdAt: serverTimestamp()
    });

    // 3️⃣ Crear perfil paciente
    await setDoc(doc(db, "patients_normalized", user.uid), {
      userId: user.uid,
      nombre,
      apellidos,
      patientType: "private",
      sessionDuration: 60,
      keywords: [
        nombre.toLowerCase(),
        apellidos.toLowerCase()
      ],
      createdAt: serverTimestamp()
    });

    window.location.href = "mis-citas.html";

  } catch (error) {
    errorMsg.textContent = error.message;
  }

});
