import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= DOM ================= */

const list = document.getElementById("invoiceList");
const patientFilter = document.getElementById("patientFilter");
const typeFilter = document.getElementById("typeFilter");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const applyFilters = document.getElementById("applyFilters");

/* ================= HELPERS ================= */

function formatCurrency(n) {
  return (n || 0).toFixed(2) + " €";
}

function formatDate(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleDateString("es-ES");
}

function translateStatus(status) {
  switch (status) {
    case "draft": return "Borrador";
    case "issued": return "Emitida";
    case "paid": return "Pagada";
    default: return status || "—";
  }
}

/* ================= LOAD ================= */

async function loadInvoices() {

  list.innerHTML = "<div class='card'>Cargando facturas…</div>";

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
    list.innerHTML = "<div class='card'>No hay facturas registradas.</div>";
    return;
  }

  const patientTerm = patientFilter.value.trim().toLowerCase();
  const typeTerm = typeFilter.value;
  const from = fromDate.value;
  const to = toDate.value;

  list.innerHTML = "";

  let total = 0;
  let shown = 0;

  for (const d of snap.docs) {

    const i = d.data();

    /* ===== FILTRO PACIENTE ===== */
    if (patientTerm && !i.patientName?.toLowerCase().includes(patientTerm)) {
      continue;
    }

    /* ===== FILTRO FECHA ===== */
    const issue = i.issueDate?.toDate?.();
    if (issue) {
      const iso = issue.toISOString().slice(0, 10);
      if (from && iso < from) continue;
      if (to && iso > to) continue;
    }

    /* ===== FILTRO TIPO (consulta paciente real) ===== */
    if (typeTerm && i.patientId) {
      const pSnap = await getDoc(doc(db, "patients_normalized", i.patientId));
      if (pSnap.exists()) {
        const p = pSnap.data();
        if (p.patientType !== typeTerm) continue;
      }
    }

    total += i.totalAmount || 0;
    shown++;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${i.invoiceNumber}</h3>
      <p><strong>Paciente:</strong> ${i.patientName || "—"}</p>
      <p><strong>Concepto:</strong> ${i.concept || ""}</p>
      <p><strong>Fecha:</strong> ${formatDate(i.issueDate)}</p>
      <p><strong>Total:</strong> ${formatCurrency(i.totalAmount)}</p>
      <p><strong>Estado:</strong> ${translateStatus(i.status)}</p>
    `;

    list.appendChild(card);
  }

  if (!shown) {
    list.innerHTML = "<div class='card'>No hay facturas con esos filtros.</div>";
    return;
  }

  const summary = document.createElement("div");
  summary.className = "card";
  summary.innerHTML = `
    <h3>Total facturado</h3>
    <strong>${formatCurrency(total)}</strong>
  `;

  list.appendChild(summary);
}

/* ================= EVENTS ================= */

applyFilters.onclick = loadInvoices;

/* ================= INIT ================= */

auth.onAuthStateChanged(user => {
  if (user) loadInvoices();
});
