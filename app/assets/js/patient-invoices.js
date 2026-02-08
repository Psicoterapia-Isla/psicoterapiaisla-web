import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   DOM
========================= */
const list = document.getElementById("list");

const filters = document.createElement("div");
filters.className = "card";
filters.innerHTML = `
  <label>Paciente</label>
  <input id="patientFilter" placeholder="Nombre del paciente">

  <label>Mes</label>
  <input id="monthFilter" type="month">

  <button id="applyFilters" class="btn-primary">Filtrar</button>
`;
list.before(filters);

const patientFilter = document.getElementById("patientFilter");
const monthFilter = document.getElementById("monthFilter");
const applyFilters = document.getElementById("applyFilters");

/* =========================
   LOAD INVOICES
========================= */
async function loadInvoices() {
  list.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;

  const snap = await getDocs(
    query(
      collection(db, "invoices"),
      where("therapistId", "==", user.uid),
      orderBy("issueDate", "desc")
    )
  );

  if (snap.empty) {
    list.innerHTML = `<div class="card">No hay facturas registradas.</div>`;
    return;
  }

  const patientTerm = patientFilter.value.toLowerCase().trim();
  const monthTerm = monthFilter.value;

  let total = 0;
  let shown = 0;

  snap.forEach(d => {
    const i = d.data();

    /* ===== FILTROS ===== */
    if (patientTerm && !i.patientName?.toLowerCase().includes(patientTerm)) {
      return;
    }

    if (monthTerm) {
      const date = i.issueDate?.toDate?.();
      if (!date) return;

      const ym = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
      if (ym !== monthTerm) return;
    }

    total += i.totalAmount || 0;
    shown++;

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${i.invoiceNumber}</strong><br>
      ${i.patientName || "—"}<br>
      ${i.concept || ""}<br><br>

      <strong>${i.totalAmount} €</strong><br>
      <small>
        ${i.issueDate?.toDate
          ? i.issueDate.toDate().toLocaleDateString("es-ES")
          : ""}
        · ${translateStatus(i.status)}
      </small>
    `;

    list.appendChild(div);
  });

  if (!shown) {
    list.innerHTML = `<div class="card">No hay facturas con esos filtros.</div>`;
    return;
  }

  const summary = document.createElement("div");
  summary.className = "card";
  summary.innerHTML = `
    <strong>Total facturado:</strong><br>
    ${total.toFixed(2)} €
  `;
  list.appendChild(summary);
}

/* =========================
   HELPERS
========================= */
function translateStatus(status) {
  switch (status) {
    case "draft": return "Borrador";
    case "issued": return "Emitida";
    case "paid": return "Pagada";
    default: return "—";
  }
}

/* =========================
   EVENTS
========================= */
applyFilters.onclick = loadInvoices;

/* =========================
   INIT
========================= */
loadInvoices();
