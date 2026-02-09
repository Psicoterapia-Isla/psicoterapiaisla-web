import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   DOM
========================= */
const searchInput = document.getElementById("patient-search");
const listContainer = document.getElementById("patients-list");

if (!searchInput || !listContainer) {
  throw new Error("DOM no cargado");
}

/* =========================
   AUTH
========================= */
const auth = getAuth();
let allPatients = [];
let currentPatient = null;

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
    const snapshot = await getDocs(collection(db, "patients_normalized"));

    allPatients = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    renderPatients(allPatients);

  } catch (error) {
    console.error(error);
    listContainer.innerHTML = "Error cargando pacientes";
  }
}

/* =========================
   RENDER LISTADO
========================= */
function renderPatients(patients) {
  if (!patients.length) {
    listContainer.innerHTML = "No hay pacientes";
    return;
  }

  listContainer.innerHTML = patients.map(p => {
    const nombre = p.nombre || "Sin nombre";
    const apellidos = p.apellidos || "";
    const dni = p.dni || "-";
    const email = p.email || "-";
    const hasUser = !!p.linkedUserUid;

    return `
      <div class="patient-row ${hasUser ? "linked" : "historical"}"
           data-id="${p.id}">
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

  document.querySelectorAll(".patient-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.dataset.id;
      const patient = allPatients.find(p => p.id === id);
      if (patient) openPatientEditor(patient);
    });
  });
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
    (p.dni || "").toLowerCase().includes(q)
  );

  renderPatients(filtered);
});

/* =========================
   MODAL EDICIÓN
========================= */
function openPatientEditor(patient) {
  currentPatient = patient;

  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Paciente</h3>

      <label>Tipo de paciente</label>
      <select id="patientType">
        <option value="private">Privado</option>
        <option value="mutual">Mutua</option>
      </select>

      <label>Duración sesión</label>
      <select id="sessionDuration">
        <option value="60">60 minutos</option>
        <option value="30">30 minutos</option>
      </select>

      <div id="mutualFields" style="display:none">
        <label>Mutua</label>
        <input id="mutualName" placeholder="Nombre mutua">

        <label>Precio sesión (€)</label>
        <input id="mutualPrice" type="number">
      </div>

      <div class="modal-actions">
        <button id="savePatient" class="btn-primary">Guardar</button>
        <button id="closePatient" class="btn-secondary">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const typeSelect = modal.querySelector("#patientType");
  const durationSelect = modal.querySelector("#sessionDuration");
  const mutualBox = modal.querySelector("#mutualFields");

  typeSelect.value = patient.patientType || "private";
  durationSelect.value = patient.sessionDuration || "60";

  if (typeSelect.value === "mutual") {
    mutualBox.style.display = "block";
    modal.querySelector("#mutualName").value = patient.mutual?.name || "";
    modal.querySelector("#mutualPrice").value = patient.mutual?.pricePerSession || "";
  }

  typeSelect.onchange = () => {
    mutualBox.style.display = typeSelect.value === "mutual" ? "block" : "none";
  };

  modal.querySelector("#closePatient").onclick = () => modal.remove();

  modal.querySelector("#savePatient").onclick = async () => {
    try {
      const data = {
        patientType: typeSelect.value,
        sessionDuration: Number(durationSelect.value),
        mutual: typeSelect.value === "mutual"
          ? {
              name: modal.querySelector("#mutualName").value || "",
              pricePerSession: Number(modal.querySelector("#mutualPrice").value || 0)
            }
          : null
      };

      await updateDoc(doc(db, "patients_normalized", patient.id), data);

      modal.remove();
      loadPatients();

    } catch (err) {
      console.error(err);
      alert("Error guardando paciente");
    }
  };
}
