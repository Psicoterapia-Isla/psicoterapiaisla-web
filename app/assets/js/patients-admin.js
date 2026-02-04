import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc
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

  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists() || userSnap.data().role !== "admin") {
    alert("Acceso solo para administradores");
    window.location.href = "index.html";
    return;
  }

  await syncPatientsFromUsers();
  await loadPatients();
});

/* =========================
   SINCRONIZAR USERS → PATIENTS
========================= */
async function syncPatientsFromUsers() {
  const usersSnap = await getDocs(collection(db, "users"));

  for (const u of usersSnap.docs) {
    const data = u.data();

    if (data.role !== "patient") continue;

    const patientRef = doc(db, "patients", u.id);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      await setDoc(patientRef, {
        nombre: data.nombre || "",
        apellidos: data.apellidos || "",
        email: data.email || "",
        phone: data.phone || "",
        dni: data.dni || "",
        source: "auto-from-users",
        createdAt: new Date()
      });
    }
  }
}

/* =========================
   CARGAR PACIENTES
========================= */
let allPatients = [];

async function loadPatients() {
  listContainer.innerHTML = "Cargando pacientes...";

  const snapshot = await getDocs(collection(db, "patients"));

  allPatients = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderPatients(allPatients);
}

/* =========================
   RENDER
========================= */
function renderPatients(patients) {
  if (!patients.length) {
    listContainer.innerHTML = "No hay pacientes.";
    return;
  }

  listContainer.innerHTML = patients.map(p => `
    <div class="patient-row">
      <strong>${p.nombre || ""} ${p.apellidos || ""}</strong><br>
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
    (p.nombre || "").toLowerCase().includes(q) ||
    (p.apellidos || "").toLowerCase().includes(q) ||
    (p.email || "").toLowerCase().includes(q) ||
    (p.dni || "").toLowerCase().includes(q) ||
    (p.phone || "").toLowerCase().includes(q)
  );

  renderPatients(filtered);
});
