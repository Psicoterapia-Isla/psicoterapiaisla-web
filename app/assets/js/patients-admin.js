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

const modal = document.getElementById("patient-modal");
const modalTitle = document.getElementById("modal-title");
const typeSelect = document.getElementById("patientType");
const durationSelect = document.getElementById("sessionDuration");
const mutualBox = document.getElementById("mutualBox");
const mutualName = document.getElementById("mutualName");
const mutualPrice = document.getElementById("mutualPrice");

const saveBtn = document.getElementById("savePatient");
const closeBtn = document.getElementById("closePatient");

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

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists() || snap.data().role !== "admin") {
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
  listContainer.innerHTML = "Cargando pacientes…";

  const snap = await getDocs(collection(db, "patients_normalized"));
  allPatients = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderPatients(allPatients);
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
    <div class="patient-row clickable" data-id="${p.id}">
      <strong>${p.nombre || ""} ${p.apellidos || ""}</strong>
      <small>
        ${p.patientType === "mutual" ? "Mutua" : "Privado"}
        · ${p.sessionDuration || 60} min
        · DNI: ${p.dni || "-"}
        · ${p.email || "-"}
      </small>
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
   SEARCH
========================= */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase().trim();
  renderPatients(
    allPatients.filter(p =>
      (p.nombre || "").toLowerCase().includes(q) ||
      (p.apellidos || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.dni || "").toLowerCase().includes(q)
    )
  );
};

/* =========================
   MODAL
========================= */
function openEditor(patient) {
  currentPatient = patient;

  modalTitle.textContent = `${patient.nombre || ""} ${patient.apellidos || ""}`;

  typeSelect.value = patient.patientType || "private";
  durationSelect.value = patient.sessionDuration || 60;

  if (typeSelect.value === "mutual") {
    mutualBox.style.display = "block";
    mutualName.value = patient.mutual?.name || "";
    mutualPrice.value = patient.mutual?.pricePerSession || "";
  } else {
    mutualBox.style.display = "none";
  }

  modal.classList.add("show");
}

typeSelect.onchange = () => {
  mutualBox.style.display = typeSelect.value === "mutual" ? "block" : "none";
};

closeBtn.onclick = () => {
  modal.classList.remove("show");
  currentPatient = null;
};

/* =========================
   SAVE
========================= */
saveBtn.onclick = async () => {
  if (!currentPatient) return;

  const data = {
    patientType: typeSelect.value,
    sessionDuration: Number(durationSelect.value),
    updatedAt: serverTimestamp(),
    mutual: typeSelect.value === "mutual"
      ? {
          name: mutualName.value || "",
          pricePerSession: Number(mutualPrice.value || 0)
        }
      : null
  };

  await updateDoc(
    doc(db, "patients_normalized", currentPatient.id),
    data
  );

  modal.classList.remove("show");
  currentPatient = null;
  loadPatients();
};
