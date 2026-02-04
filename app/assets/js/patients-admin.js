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
   ELEMENTOS DOM
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

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists() || userSnap.data().role !== "admin") {
    alert("Acceso restringido a administradores");
    window.location.href = "index.html";
    return;
  }

  await loadAllPeople();
});

/* =========================
   CARGA GLOBAL
========================= */
let allPeople = [];

async function loadAllPeople() {
  listContainer.innerHTML = "Cargando datos...";

  try {
    const patientsSnap = await getDocs(collection(db, "patients"));
    const usersSnap = await getDocs(collection(db, "users"));

    const patients = patientsSnap.docs.map(d => ({
      id: d.id,
      source: "patients",
      ...d.data()
    }));

    const users = usersSnap.docs
      .filter(d => d.data().role === "patient")
      .map(d => ({
        id: d.id,
        source: "users",
        nombre: d.data().name || "",
        apellidos: d.data().lastName || "",
        email: d.data().email || "",
        dni: d.data().dni || "",
        telefono: d.data().phone || ""
      }));

    allPeople = [...patients, ...users];

    render(allPeople);

  } catch (e) {
    console.error(e);
    listContainer.innerHTML = "Error cargando datos.";
  }
}

/* =========================
   RENDER
========================= */
function render(list) {
  if (!list.length) {
    listContainer.innerHTML = "No hay registros.";
    return;
  }

  listContainer.innerHTML = list.map(p => `
    <div class="patient-row">
      <strong>${p.nombre || ""} ${p.apellidos || ""}</strong><br>
      <small>
        DNI: ${p.dni || "-"} · 
        Email: ${p.email || "-"} · 
        Tel: ${p.telefono || "-"} · 
        Origen: ${p.source}
      </small>
    </div>
  `).join("");
}

/* =========================
   BUSCADOR
========================= */
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();

  const filtered = allPeople.filter(p =>
    Object.values(p).some(v =>
      String(v).toLowerCase().includes(q)
    )
  );

  render(filtered);
});
