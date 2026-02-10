import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   DOM
========================= */
const searchInput = document.getElementById("patient-search");
const listContainer = document.getElementById("patients-list");
const header = document.querySelector(".page-header");

const auth = getAuth();
let allPatients = [];
let currentPatient = null;

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
    alert("Acceso restringido");
    window.location.href = "index.html";
    return;
  }

  injectCreateButton();
  loadPatients();
});

/* =========================
   BOTÓN NUEVO PACIENTE
========================= */
function injectCreateButton() {
  const btn = document.createElement("button");
  btn.className = "btn-primary";
  btn.textContent = "Nuevo paciente";
  btn.onclick = () => openPatientEditor(null);
  header.appendChild(btn);
}

/* =========================
   CARGA
========================= */
async function loadPatients() {
  listContainer.innerHTML = "Cargando pacientes...";

  const snapshot = await getDocs(collection(db, "patients_normalized"));
  allPatients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderPatients(allPatients);
}

/* =========================
   RENDER
========================= */
function renderPatients(patients) {
  listContainer.innerHTML = patients.map(p => `
    <div class="patient-row" data-id="${p.id}">
      <strong>${p.nombre || ""} ${p.apellidos || ""}</strong>
      <div class="meta">
        ${p.patientType || "privado"} · ${p.sessionDuration || 60} min
      </div>
      <button class="link">Editar</button>
    </div>
  `).join("");

  document.querySelectorAll(".patient-row").forEach(row => {
    row.querySelector("button").onclick = () => {
      const id = row.dataset.id;
      const p = allPatients.find(x => x.id === id);
      openPatientEditor(p);
    };
  });
}

/* =========================
   BUSCADOR
========================= */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  renderPatients(allPatients.filter(p =>
    (p.nombre || "").toLowerCase().includes(q) ||
    (p.apellidos || "").toLowerCase().includes(q)
  ));
};

/* =========================
   MODAL CREAR / EDITAR
========================= */
function openPatientEditor(patient) {
  currentPatient = patient;

  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `
    <div class="modal-card">
      <h3>${patient ? "Editar paciente" : "Nuevo paciente"}</h3>

      <input id="nombre" placeholder="Nombre" value="${patient?.nombre || ""}">
      <input id="apellidos" placeholder="Apellidos" value="${patient?.apellidos || ""}">
      <input id="dni" placeholder="DNI" value="${patient?.dni || ""}">
      <input id="email" placeholder="Email" value="${patient?.email || ""}">
      <input id="telefono" placeholder="Teléfono" value="${patient?.telefono || ""}">

      <label>Tipo</label>
      <select id="patientType">
        <option value="private">Privado</option>
        <option value="mutual">Mutua</option>
      </select>

      <label>Duración sesión</label>
      <select id="sessionDuration">
        <option value="60">60 minutos</option>
        <option value="30">30 minutos</option>
      </select>

      <div id="mutualBox" style="display:none">
        <input id="mutualName" placeholder="Mutua">
        <input id="mutualPrice" type="number" placeholder="Precio sesión">
      </div>

      <div class="modal-actions">
        <button id="save" class="btn-primary">Guardar</button>
        <button id="close" class="btn-secondary">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const type = modal.querySelector("#patientType");
  const box = modal.querySelector("#mutualBox");

  type.value = patient?.patientType || "private";
  modal.querySelector("#sessionDuration").value = patient?.sessionDuration || 60;

  if (type.value === "mutual") box.style.display = "block";

  type.onchange = () => {
    box.style.display = type.value === "mutual" ? "block" : "none";
  };

  modal.querySelector("#close").onclick = () => modal.remove();

  modal.querySelector("#save").onclick = async () => {
    const data = {
      nombre: modal.querySelector("#nombre").value,
      apellidos: modal.querySelector("#apellidos").value,
      dni: modal.querySelector("#dni").value,
      email: modal.querySelector("#email").value,
      telefono: modal.querySelector("#telefono").value,
      patientType: type.value,
      sessionDuration: Number(modal.querySelector("#sessionDuration").value),
      mutual: type.value === "mutual"
        ? {
            name: modal.querySelector("#mutualName").value,
            pricePerSession: Number(modal.querySelector("#mutualPrice").value || 0)
          }
        : null
    };

    if (patient) {
      await updateDoc(doc(db, "patients_normalized", patient.id), data);
    } else {
      await addDoc(collection(db, "patients_normalized"), data);
    }

    modal.remove();
    loadPatients();
  };
}
