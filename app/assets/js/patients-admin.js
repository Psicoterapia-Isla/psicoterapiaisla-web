import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const searchInput = document.getElementById("patient-search");
const listContainer = document.getElementById("patients-list");

const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists() || snap.data().role !== "admin") {
    alert("Acceso restringido");
    window.location.href = "index.html";
    return;
  }

  loadPatientsFromUsers();
});

let allPatients = [];

async function loadPatientsFromUsers() {
  listContainer.innerHTML = "Cargando pacientes...";

  try {
    const usersSnap = await getDocs(collection(db, "users"));

    allPatients = usersSnap.docs
      .filter(d => d.data().role === "patient")
      .map(d => ({
        id: d.id,
        nombre: d.data().name || "",
        apellidos: d.data().lastName || "",
        email: d.data().email || "",
        dni: d.data().dni || "",
        telefono: d.data().phone || ""
      }));

    render(allPatients);
  } catch (e) {
    console.error(e);
    listContainer.innerHTML = "Error cargando pacientes";
  }
}

function render(list) {
  if (!list.length) {
    listContainer.innerHTML = "No hay pacientes";
    return;
  }

  listContainer.innerHTML = list.map(p => `
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
  render(
    allPatients.filter(p =>
      Object.values(p).some(v =>
        String(v).toLowerCase().includes(q)
      )
    )
  );
});
