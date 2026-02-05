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
   CARGA DE PACIENTES
========================= */
async function loadPatients() {
  listContainer.innerHTML = "Cargando pacientes...";

  try {
    const snapshot = await getDocs(
      collection(db, "patients_normalized")
    );

    allPatients = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    renderPatients(allPatients);

  } catch (err) {
    console.error(err);
    listContainer.innerHTML = "Error cargando pacientes";
  }
}

/* =========================
   RENDER (ROBUSTO)
========================= */
function renderPatients(patients) {
  if (!patients.length) {
    listContainer.innerHTML = "No hay pacientes";
    return;
  }

  listContainer.innerHTML = patients.map(p => {
    const nombre =
      p.nombre ||
      p.first_name ||
      p.name ||
      "";

    const apellidos =
      p.apellidos ||
      p.last_name ||
      p.surname ||
      "";

    const email =
      p.email ||
      "-";

    const dni =
      p.dni ||
      p.document_number ||
      "-";

    const hasUser = !!p.linkedUserUid;

    return `
      <div class="patient-row ${hasUser ? "linked" : "historical"}">
        <div class="patient-header">
          <strong>${nombre} ${apellidos}</strong>
          <span class="badge ${hasUser ? "badge-linked" : "badge-historical"}">
            ${hasUser ? "Con cuenta" : "Histórico"}
          </span>
        </div>
        <small>
          DNI: ${dni} · Email: ${email}
        </small>
      </div>
    `;
  }).join("");
}

/* =========================
   BUSCADOR (ROBUSTO)
========================= */
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();

  const filtered = allPatients.filter(p => {
    const nombre =
      p.nombre || p.first_name || p.name || "";

    const apellidos =
      p.apellidos || p.last_name || p.surname || "";

    const email = p.email || "";
    const dni = p.dni || p.document_number || "";

    return (
      nombre.toLowerCase().includes(q) ||
      apellidos.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      dni.toLowerCase().includes(q)
    );
  });

  renderPatients(filtered);
});
