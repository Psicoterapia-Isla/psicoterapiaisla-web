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
   DOM READY
========================= */
document.addEventListener("DOMContentLoaded", () => {

  const searchInput = document.getElementById("patient-search");
  const listContainer = document.getElementById("patients-list");

  if (!searchInput || !listContainer) {
    console.error("Elementos del DOM no encontrados");
    return;
  }

  const auth = getAuth();
  let allPatients = [];

  /* =========================
     AUTH
  ========================= */
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

    await loadPatients();
  });

  /* =========================
     CARGAR PACIENTES
  ========================= */
  async function loadPatients() {
    listContainer.textContent = "Cargando pacientes…";

    try {
      const snapshot = await getDocs(collection(db, "patients"));

      allPatients = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          lastName: data.lastName || "",
          dni: data.dni || "",
          email: data.email || "",
          phone: data.phone || ""
        };
      });

      renderPatients(allPatients);

    } catch (err) {
      console.error(err);
      listContainer.textContent = "Error al cargar pacientes";
    }
  }

  /* =========================
     RENDER
  ========================= */
  function renderPatients(patients) {
    if (!patients.length) {
      listContainer.textContent = "No hay pacientes";
      return;
    }

    listContainer.innerHTML = patients.map(p => `
      <div class="patient-row">
        <strong>${p.name} ${p.lastName}</strong><br>
        <small>
          DNI: ${p.dni || "-"} ·
          Email: ${p.email || "-"} ·
          Tel: ${p.phone || "-"}
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
      p.name.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.dni.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );

    renderPatients(filtered);
  });

});
