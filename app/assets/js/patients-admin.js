import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const searchInput = document.getElementById("patient-search");
  const listContainer = document.getElementById("patients-list");

  if (!searchInput || !listContainer) {
    console.error("DOM incompleto");
    return;
  }

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

    await loadPatients();
  });

  async function loadPatients() {
    listContainer.textContent = "Cargando pacientes…";

    try {
      const snapshot = await getDocs(collection(db, "patients"));

      allPatients = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          nombre: data.nombre || "",
          apellidos: data.apellidos || "",
          dni: data.dni || "",
          email: data.email || "",
          telefono: data.telefono || ""
        };
      });

      renderPatients(allPatients);

    } catch (err) {
      console.error(err);
      listContainer.textContent = "Error al cargar pacientes";
    }
  }

  function renderPatients(patients) {
    if (!patients.length) {
      listContainer.textContent = "No hay pacientes";
      return;
    }

    listContainer.innerHTML = patients.map(p => `
      <div class="patient-row">
        <strong>${p.nombre} ${p.apellidos}</strong><br>
        <small>
          DNI: ${p.dni || "-"} · 
          Email: ${p.email || "-"} · 
          Tel: ${p.telefono || "-"}
        </small>
      </div>
    `).join("");
  }

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();

    const filtered = allPatients.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.apellidos.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.dni.toLowerCase().includes(q) ||
      p.telefono.toLowerCase().includes(q)
    );

    renderPatients(filtered);
  });

});
