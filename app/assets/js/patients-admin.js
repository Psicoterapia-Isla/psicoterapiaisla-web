import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   DOM
========================= */
const searchInput = document.getElementById("patient-search");
const listContainer = document.getElementById("patients-list");

if (!searchInput || !listContainer) {
  console.error("DOM no encontrado");
  throw new Error("DOM no cargado");
}

/* =========================
   AUTH
========================= */
const auth = getAuth();
let allPatients = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists() || userSnap.data().role !== "admin") {
    alert("Acceso restringido");
    window.location.href = "index.html";
    return;
  }

  loadPatients();
});

/* =========================
   CARGA DE PACIENTES (NORMALIZED)
========================= */
async function loadPatients() {
  listContainer.innerHTML = "Cargando pacientes...";

  try {
    const snapshot = await getDocs(
      collection(db, "patients_normalized")
    );

    allPatients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderPatients(allPatients);

  } catch (err) {
    console.error(err);
    listContainer.innerHTML = "Error cargando pacientes";
  }
}

/* =========================
   RENDER
========================= */
function renderPatients(patients) {
  if (!patients.length) {
    listContainer.innerHTML = "No hay pacientes";
    return;
  }

  listContainer.innerHTML = patients.map(p => `
    <div class="patient-row">
      <strong>${p.nombre || ""} ${p.apellidos || ""}</strong><br>
      <small>
        DNI: ${p.dni || "-"} · 
        Email: ${p.email || "-"}
      </small>
    </div>
  `).join("");
}

/* =========================
   BUSCADOR
========================= */
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();

  const filtered = allPatients.filter(p =>
    (p.nombre || "").toLowerCase().includes(q) ||
    (p.apellidos || "").toLowerCase().includes(q) ||
    (p.email || "").toLowerCase().includes(q) ||
    (p.dni || "").toLowerCase().includes(q)
  );

  renderPatients(filtered);
});
