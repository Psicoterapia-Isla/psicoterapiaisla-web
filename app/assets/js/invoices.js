import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tableBody = document.querySelector("#invoices-table tbody");
const searchInput = document.getElementById("search-patient");

let patientsCache = [];
let invoicesCache = [];

/* ---------- CARGA INICIAL ---------- */

async function loadData() {
  // pacientes
  const patientsSnap = await getDocs(collection(db, "patients"));
  patientsCache = patientsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // facturas
  const invoicesSnap = await getDocs(collection(db, "patientInvoices"));
  invoicesCache = invoicesSnap.docs.map(doc => doc.data());

  renderTable(patientsCache);
}

/* ---------- RENDER TABLA ---------- */

function renderTable(patients) {
  tableBody.innerHTML = "";

  if (patients.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">No hay resultados</td>
      </tr>`;
    return;
  }

  patients.forEach(patient => {
    const patientInvoices = invoicesCache.filter(
      inv => inv.patientId === patient.id
    );

    const total = patientInvoices.length;
    const paid = patientInvoices.filter(i => i.status === "paid").length;
    const pending = patientInvoices.filter(i => i.status === "pending").length;

    let statusText = "Sin facturas";
    if (total > 0) {
      statusText = `${paid} pagadas / ${pending} pendientes`;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${patient.name} ${patient.surname || ""}</strong><br>
        DNI: ${patient.dni || "-"}
      </td>

      <td>
        📧 ${patient.email || "-"}<br>
        📞 ${patient.phone || "-"}
      </td>

      <td>${total}</td>

      <td>${statusText}</td>

      <td>
        <button data-id="${patient.id}" class="view-btn">
          Ver
        </button>
        <button data-id="${patient.id}" class="new-btn">
          + Factura
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

/* ---------- BUSCADOR ---------- */

searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();

  const filtered = patientsCache.filter(p =>
    (p.name && p.name.toLowerCase().includes(term)) ||
    (p.surname && p.surname.toLowerCase().includes(term)) ||
    (p.dni && p.dni.toLowerCase().includes(term)) ||
    (p.email && p.email.toLowerCase().includes(term)) ||
    (p.phone && p.phone.includes(term))
  );

  renderTable(filtered);
});

/* ---------- INIT ---------- */
loadData();
