import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const searchInput = document.getElementById("patient-search");
const resultsBox = document.getElementById("patient-results");
const patientInfo = document.getElementById("patient-info");
const patientDetails = document.getElementById("patient-details");
const invoicesSection = document.getElementById("invoices-section");
const invoicesTableBody = document.getElementById("invoices-table-body");

let allPatients = [];

/* ===========================
   CARGA INICIAL DE PACIENTES
=========================== */
async function loadPatients() {
  const snap = await getDocs(collection(db, "patients"));
  allPatients = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

loadPatients();

/* ===========================
   BUSCADOR
=========================== */
searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase().trim();
  resultsBox.innerHTML = "";

  if (!term || term.length < 2) {
    resultsBox.style.display = "none";
    return;
  }

  const matches = allPatients.filter(p =>
    [p.name, p.surname, p.dni, p.email, p.phone]
      .filter(Boolean)
      .some(value =>
        value.toLowerCase().includes(term)
      )
  );

  if (matches.length === 0) {
    resultsBox.innerHTML = `<div class="search-empty">Sin resultados</div>`;
    resultsBox.style.display = "block";
    return;
  }

  matches.forEach(p => {
    const item = document.createElement("div");
    item.className = "search-item";
    item.textContent = `${p.name || ""} ${p.surname || ""} · ${p.dni || p.email || ""}`;

    item.addEventListener("click", () => {
      selectPatient(p);
    });

    resultsBox.appendChild(item);
  });

  resultsBox.style.display = "block";
});

/* ===========================
   SELECCIÓN DE PACIENTE
=========================== */
async function selectPatient(patient) {
  searchInput.value = "";
  resultsBox.innerHTML = "";
  resultsBox.style.display = "none";

  /* mostrar datos */
  patientDetails.innerHTML = `
    <p><strong>Nombre:</strong> ${patient.name || "-"}</p>
    <p><strong>Apellidos:</strong> ${patient.surname || "-"}</p>
    <p><strong>DNI:</strong> ${patient.dni || "-"}</p>
    <p><strong>Email:</strong> ${patient.email || "-"}</p>
    <p><strong>Teléfono:</strong> ${patient.phone || "-"}</p>
  `;

  patientInfo.classList.remove("hidden");

  await loadInvoices(patient.id);
}

/* ===========================
   FACTURAS
=========================== */
async function loadInvoices(patientId) {
  invoicesTableBody.innerHTML = "";

  const q = query(
    collection(db, "invoices"),
    where("patientId", "==", patientId),
    orderBy("date", "desc")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    invoicesTableBody.innerHTML = `
      <tr>
        <td colspan="5">Este paciente no tiene facturas.</td>
      </tr>
    `;
    invoicesSection.classList.remove("hidden");
    return;
  }

  snap.docs.forEach(doc => {
    const inv = doc.data();

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inv.concept || "-"}</td>
      <td>${inv.date?.toDate
        ? inv.date.toDate().toLocaleDateString()
        : "-"}</td>
      <td>${inv.amount ? `${inv.amount} €` : "-"}</td>
      <td>
        <span class="status ${inv.status}">
          ${translateStatus(inv.status)}
        </span>
      </td>
      <td>
        <button class="small-btn">Ver</button>
      </td>
    `;

    invoicesTableBody.appendChild(tr);
  });

  invoicesSection.classList.remove("hidden");
}

/* ===========================
   UTILIDADES
=========================== */
function translateStatus(status) {
  switch (status) {
    case "paid": return "Pagada";
    case "pending": return "Pendiente";
    case "overdue": return "Vencida";
    default: return "-";
  }
}
