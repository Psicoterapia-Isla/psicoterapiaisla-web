import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
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
   LOAD
========================= */
async function loadPatients() {
  listContainer.innerHTML = "Cargando pacientes...";

  const snap = await getDocs(collection(db, "patients_normalized"));
  allPatients = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderPatients(allPatients);
}

/* =========================
   RENDER
========================= */
function renderPatients(patients) {
  listContainer.innerHTML = patients.map(p => {
    const tipo = p.patientType === "mutual" ? "Mutua" : "Privado";
    const dur = p.sessionDuration || 60;

    return `
      <div class="patient-row" data-id="${p.id}">
        <strong>${p.nombre || ""} ${p.apellidos || ""}</strong>
        <small>
          ${tipo} · ${dur} min · DNI: ${p.dni || "-"} · ${p.email || "-"}
        </small>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".patient-row").forEach(row => {
    row.onclick = () => {
      const patient = allPatients.find(p => p.id === row.dataset.id);
      if (patient) openPatientEditor(patient);
    };
  });
}

/* =========================
   SEARCH
========================= */
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase();
  renderPatients(
    allPatients.filter(p =>
      (p.nombre || "").toLowerCase().includes(q) ||
      (p.apellidos || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.dni || "").toLowerCase().includes(q)
    )
  );
});

/* =========================
   MODAL (ÚNICO)
========================= */
function openPatientEditor(patient) {

  // 🔥 BORRAR MODAL PREVIO SI EXISTE
  document.getElementById("patient-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "patient-modal";
  modal.className = "modal-overlay";

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

      <div id="mutualBox" style="display:none">
        <label>Mutua</label>
        <input id="mutualName">

        <label>Precio sesión (€)</label>
        <input id="mutualPrice" type="number">
      </div>

      <div class="modal-actions">
        <button id="savePatient">Guardar</button>
        <button id="closePatient">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const type = modal.querySelector("#patientType");
  const duration = modal.querySelector("#sessionDuration");
  const box = modal.querySelector("#mutualBox");

  type.value = patient.patientType || "private";
  duration.value = patient.sessionDuration || 60;

  if (type.value === "mutual") {
    box.style.display = "block";
    modal.querySelector("#mutualName").value = patient.mutual?.name || "";
    modal.querySelector("#mutualPrice").value = patient.mutual?.pricePerSession || "";
  }

  type.onchange = () => {
    box.style.display = type.value === "mutual" ? "block" : "none";
  };

  modal.querySelector("#closePatient").onclick = () => modal.remove();

  modal.querySelector("#savePatient").onclick = async () => {
    await updateDoc(doc(db, "patients_normalized", patient.id), {
      patientType: type.value,
      sessionDuration: Number(duration.value),
      mutual: type.value === "mutual"
        ? {
            name: modal.querySelector("#mutualName").value,
            pricePerSession: Number(modal.querySelector("#mutualPrice").value || 0)
          }
        : null,
      updatedAt: serverTimestamp()
    });

    modal.remove();
    loadPatients();
  };
}
