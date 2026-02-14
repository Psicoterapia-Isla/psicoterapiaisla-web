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

/* ================= NORMALIZADOR ================= */

function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function generateKeywords(nombre, apellidos, telefono) {

  const keywords = new Set();

  const fullName = `${nombre} ${apellidos}`.trim();

  const cleanNombre = normalize(nombre);
  const cleanApellidos = normalize(apellidos);
  const cleanFull = normalize(fullName);

  // Nombre completo
  keywords.add(cleanNombre);
  keywords.add(cleanApellidos);
  keywords.add(cleanFull);

  // Fragmentos progresivos nombre
  for (let i = 1; i <= cleanNombre.length; i++) {
    keywords.add(cleanNombre.substring(0, i));
  }

  // Fragmentos progresivos apellidos
  for (let i = 1; i <= cleanApellidos.length; i++) {
    keywords.add(cleanApellidos.substring(0, i));
  }

  // Fragmentos teléfono
  if (telefono) {
    const cleanTel = telefono.replace(/\s+/g, "");
    for (let i = 3; i <= cleanTel.length; i++) {
      keywords.add(cleanTel.substring(0, i));
    }
  }

  return Array.from(keywords);
}

/* ================= SAVE ================= */

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

      keywords: generateKeywords(nombre, apellidos, telefono),

      createdAt: serverTimestamp()

    });

    alert("Paciente creado correctamente");

    window.location.href = "patients-admin.html";

  } catch (error) {
    errorMsg.textContent = error.message;
  }

});
