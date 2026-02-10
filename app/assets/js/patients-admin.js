import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   DOM
========================= */
const searchInput   = document.getElementById("patient-search");
const listContainer = document.getElementById("patients-list");

const modal       = document.getElementById("patient-modal");
const modalTitle  = document.getElementById("modal-title");

const nombreInput     = document.getElementById("patientNombre");
const apellidosInput  = document.getElementById("patientApellidos");

const typeSelect      = document.getElementById("patientType");
const durationSelect  = document.getElementById("sessionDuration");
const mutualBox       = document.getElementById("mutualBox");
const mutualName      = document.getElementById("mutualName");
const mutualPrice     = document.getElementById("mutualPrice");

const saveBtn  = document.getElementById("savePatient");
const closeBtn = document.getElementById("closePatient");

/* =========================
   AUTH
========================= */
const auth = getAuth();
let allPatients = [];
let currentPatient = null;

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    alert("Usuario no válido");
    return;
  }

  const role = snap.data().role;
  if (!["admin","therapist"].includes(role)) {
    alert("Acceso restringido");
    return;
  }

  injectCreateButton();
  await loadPatients();
  bindSearch(); // ← 🔥 ESTO FALTABA
});

/* =========================
   UI
========================= */
function injectCreateButton(){
  if (document.getElementById("new-patient-btn")) return;

  const btn = document.createElement("button");
  btn.id = "new-patient-btn";
  btn.className = "btn-primary";
  btn.textContent = "+ Nuevo paciente";
  btn.onclick = () => openEditor(null);

  listContainer.parentElement.insertBefore(btn, listContainer);
}

/* =========================
   LOAD
========================= */
async function loadPatients(){
  listContainer.innerHTML = "Cargando pacientes…";

  const snap = await getDocs(collection(db, "patients_normalized"));
  allPatients = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderPatients(allPatients);
}

/* =========================
   SEARCH (CLAVE)
========================= */
function bindSearch(){
  if (!searchInput) return;

  searchInput.oninput = () => {
    const term = searchInput.value.trim().toLowerCase();

    if (term.length < 2) {
      renderPatients(allPatients);
      return;
    }

    const filtered = allPatients.filter(p =>
      (p.keywords || []).some(k => k.includes(term))
    );

    renderPatients(filtered);
  };
}
/* =========================
   SAVE
========================= */
saveBtn?.addEventListener("click", async () => {
  const nombre = nombreInput?.value.trim();
  if (!nombre) {
    alert("El nombre es obligatorio");
    return;
  }

  const apellidos = apellidosInput?.value.trim() || "";

  const keywords = [
    nombre.toLowerCase(),
    apellidos.toLowerCase()
  ].filter(Boolean);

  const data = {
    nombre,
    apellidos,
    patientType: typeSelect?.value || "private",
    sessionDuration: Number(durationSelect?.value || 60),
    mutual: typeSelect?.value === "mutual"
      ? {
          name: mutualName?.value || "",
          pricePerSession: Number(mutualPrice?.value || 0)
        }
      : null,
    keywords,
    updatedAt: serverTimestamp()
  };

  if (currentPatient) {
    await updateDoc(doc(db, "patients_normalized", currentPatient.id), data);
  } else {
    await addDoc(collection(db, "patients_normalized"), {
      ...data,
      createdAt: serverTimestamp()
    });
  }

  modal?.classList.remove("show");
  currentPatient = null;
  await loadPatients();
});
/* =========================
   RENDER
========================= */
function renderPatients(patients){
  if (!patients.length) {
    listContainer.innerHTML = "No hay resultados";
    return;
  }

  listContainer.innerHTML = patients.map(p => `
    <div class="patient-row clickable" data-id="${p.id}">
      <div class="patient-header">
        <strong>${p.nombre || ""} ${p.apellidos || ""}</strong>
        <div class="badges">
          <span class="badge ${p.patientType === "mutual" ? "badge-mutual" : "badge-private"}">
            ${p.patientType === "mutual" ? "Mutua" : "Privado"}
          </span>
          <span class="badge">
            ${p.sessionDuration || 60} min
          </span>
        </div>
      </div>
      <div class="edit-hint">Click para editar</div>
    </div>
  `).join("");

  document.querySelectorAll(".patient-row").forEach(row => {
    row.onclick = () => {
      const patient = allPatients.find(p => p.id === row.dataset.id);
      if (patient) openEditor(patient);
    };
  });
}

/* =========================
   MODAL
========================= */
function openEditor(patient){
  currentPatient = patient;

  if (modalTitle) {
    modalTitle.textContent = patient ? "Editar paciente" : "Nuevo paciente";
  }

  if (nombreInput)    nombreInput.value    = patient?.nombre || "";
  if (apellidosInput) apellidosInput.value = patient?.apellidos || "";

  if (typeSelect) {
    typeSelect.value = patient?.patientType || "private";
    mutualBox.style.display = typeSelect.value === "mutual" ? "block" : "none";
  }

  if (durationSelect) {
    durationSelect.value = patient?.sessionDuration || 60;
  }

  if (mutualName)  mutualName.value  = patient?.mutual?.name || "";
  if (mutualPrice) mutualPrice.value = patient?.mutual?.pricePerSession || "";

  modal?.classList.add("show");
}

typeSelect?.addEventListener("change", () => {
  if (mutualBox) {
    mutualBox.style.display = typeSelect.value === "mutual" ? "block" : "none";
  }
});

closeBtn?.addEventListener("click", () => {
  modal?.classList.remove("show");
  currentPatient = null;
});


