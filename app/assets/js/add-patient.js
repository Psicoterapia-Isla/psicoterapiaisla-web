import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const nombreInput = document.getElementById("nombre");
const apellidosInput = document.getElementById("apellidos");
const telefonoInput = document.getElementById("telefono");
const patientTypeSelect = document.getElementById("patientType");
const saveBtn = document.getElementById("savePatient");
const errorMsg = document.getElementById("errorMsg");

saveBtn.addEventListener("click", async () => {

  errorMsg.textContent = "";

  const nombre = nombreInput.value.trim();
  const apellidos = apellidosInput.value.trim();
  const telefono = telefonoInput.value.trim();
  const patientType = patientTypeSelect.value;

  if (!nombre) {
    errorMsg.textContent = "El nombre es obligatorio";
    return;
  }

  try {

    await addDoc(collection(db, "patients_normalized"), {

      nombre,
      apellidos,
      telefono,
      patientType,
      sessionDuration: patientType === "mutual" ? 30 : 60,

      keywords: [
        nombre.toLowerCase(),
        apellidos?.toLowerCase() || "",
        telefono || ""
      ],

      createdAt: serverTimestamp()

    });

    alert("Paciente creado correctamente");

    window.location.href = "patients-admin.html";

  } catch (error) {
    errorMsg.textContent = error.message;
  }

});
