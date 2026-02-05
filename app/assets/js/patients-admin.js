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
  console.error("❌ Elementos DOM no encontrados");
  throw new Error("DOM incompleto");
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
    alert("Acceso restringido a administradores");
    window.location.href = "index.html";
    return;
  }

  loadPatients();
});

/* =========================
   CARGA PACIENTES
========================= */
async function loadPatients() {
  listContainer.innerHTML = "Cargando pacientes...";

  const snapshot = await getDocs(collection(db, "patients"));

  allPatients = snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  renderPatients(allPatients);
}

/* =========================
   RENDER CORRECTO
========================= */
function renderPatients(patients) {
  if (!patients.length) {
    listContainer.innerHTML = "No hay pacientes.";
    return;
  }

  listContainer.innerHTML = patients
    .map(p => `
      <div class="patient-row">
        <strong>
          ${p.nombre || p.name || ""} ${p.apellidos || p.lastName || ""}
        </strong><br>
        <small>
          DNI: ${p.dni || "-"} ·
          Email: ${p.email || "-"} ·
          Tel: ${p.telefono || p.phone || "-"}
        </small>
      </div>
    `)
    .join("");
}

/* =========================
   BUSCADOR
========================= */
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();

  const filtered = allPatients.filter(p =>
    (p.nombre || p.name || "").toLowerCase().includes(q) ||
    (p.apellidos || p.lastName || "").toLowerCase().includes(q) ||
    (p.email || "").toLowerCase().includes(q) ||
    (p.dni || "").toLowerCase().includes(q)
  );

  renderPatients(filtered);
});
