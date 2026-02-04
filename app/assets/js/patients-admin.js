import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   DOM
========================= */
const searchInput = document.getElementById("patient-search");
const listContainer = document.getElementById("patients-list");

/* =========================
   AUTH
========================= */
const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await loadPatients();
});

/* =========================
   CARGA PACIENTES REALES
========================= */
let allPatients = [];

async function loadPatients() {
  listContainer.innerHTML = "Cargando pacientes...";

  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "patient")
    );

    const snapshot = await getDocs(q);

    allPatients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderPatients(allPatients);

  } catch (e) {
    console.error(e);
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
  const q = searchInput.value.toLowerCase();

  const filtered = allPatients.filter(p =>
    (p.nombre || "").toLowerCase().includes(q) ||
    (p.apellidos || "").toLowerCase().includes(q) ||
    (p.email || "").toLowerCase().includes(q) ||
    (p.dni || "").toLowerCase().includes(q)
  );

  renderPatients(filtered);
});
