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
const summary = document.getElementById("summary");

const typeFilter = document.getElementById("typeFilter");
const patientFilter = document.getElementById("patientFilter");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const applyBtn = document.getElementById("applyFilters");

/* =========================
   INIT
========================= */
auth.onAuthStateChanged(user => {
  if (!user) return;
  loadInvoices();
});

/* =========================
   LOAD FACTURAS
========================= */
async function loadInvoices() {

  list.innerHTML = "";
  summary.innerHTML = "Cargando…";

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
    summary.innerHTML = "No hay facturas.";
    return;
  }

  const type = typeFilter.value;
  const patientTerm = patientFilter.value.toLowerCase().trim();
  const from = fromDate.value;
  const to = toDate.value;

  let total = 0;
  let count = 0;

  snap.forEach(docSnap => {
    const i = docSnap.data();
    const date = i.issueDate?.toDate?.();
    if (!date) return;

    /* ===== FILTRO TIPO ===== */
    if (type) {
      if (type === "mutual" && !i.patientType?.includes("mutual")) return;
      if (type === "private" && i.patientType === "mutual") return;
    }

    /* ===== FILTRO NOMBRE ===== */
    if (patientTerm) {
      if (!i.patientName?.toLowerCase().includes(patientTerm)) return;
    }

    /* ===== FILTRO FECHA ===== */
    if (from && date < new Date(from)) return;
    if (to) {
      const toDateObj = new Date(to);
      toDateObj.setHours(23,59,59,999);
      if (date > toDateObj) return;
    }

    total += Number(i.totalAmount || 0);
    count++;

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${i.invoiceNumber}</strong><br>
      ${i.patientName || "—"}<br>
      ${i.concept || ""}<br><br>
      <strong>${i.totalAmount?.toFixed(2)} €</strong><br>
      <small>
        ${date.toLocaleDateString("es-ES")}
        · ${translateStatus(i.status)}
      </small>
    `;

    list.appendChild(div);
  });

  if (!count) {
    summary.innerHTML = "No hay facturas con esos filtros.";
    return;
  }

  summary.innerHTML = `
    <strong>Total facturado:</strong><br>
    ${total.toFixed(2)} €<br>
    ${count} facturas
  `;
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
applyBtn.onclick = loadInvoices;
