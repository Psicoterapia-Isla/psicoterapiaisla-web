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
   ELEMENTOS DOM (DEFENSIVO)
========================= */
const searchInput = document.getElementById("patient-search");
const listContainer = document.getElementById("patients-list");

if (!listContainer) {
  console.error("[patients-admin] Falta #patients-list en el HTML");
}

/* =========================
   AUTH
========================= */
const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  /* =========================
     COMPROBAR ROL ADMIN
  ========================= */
  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists() || userSnap.data().role !== "admin") {
    alert("Acceso restringido a administradores");
    window.location.href = "index.html";
    return;
  }

  if (listContainer) {
    await loadPatients();
  }
});

/* =========================
   CARGA DE PACIENTES
========================= */
let allPatients = [];

async function loadPatients() {
  listContainer.innerHTML = "Cargando pacientes...";

  try {
    const snapshot = await getDocs(collection(db, "patients"));

    allPatients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderPatients(allPatients);

  } catch (error) {
    console.error("Error cargando pacientes:", error);
    listContainer.innerHTML = "Error al cargar pacientes.";
  }
}

/* =========================
   RENDER
========================= */
function renderPatients(patients) {
  if (!listContainer) return;

  if (!patients.length) {
    listContainer.innerHTML = "No hay pacientes.";
    return;
  }

  listContainer.innerHTML = patients
    .map(p => `
      <div class="patient-row">
        <strong>${p.name || ""} ${p.lastName || ""}</strong><br>
        <small>
          DNI: ${p.dni || "-"} · 
          Email: ${p.email || "-"} · 
          Tel: ${p.phone || "-"}
        </small>
      </div>
    `)
    .join("");
}

/* =========================
   BUSCADOR (SOLO SI EXISTE)
========================= */
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();

    const filtered = allPatients.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.lastName || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.dni || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q)
    );

    renderPatients(filtered);
  });
} else {
  console.warn("[patients-admin] Buscador no encontrado (#patient-search)");
}
