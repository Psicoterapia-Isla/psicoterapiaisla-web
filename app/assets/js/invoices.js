import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

/* =========================
   INIT SEGURO
========================= */

await requireAuth();
await loadMenu();

const user = auth.currentUser;
const tbody = document.getElementById("facturasBody");

const functions = getFunctions();
const generateInvoicePdf =
  httpsCallable(functions, "generateInvoicePdf");

/* =========================
   LOAD FACTURAS
========================= */

async function loadInvoices() {

  if (!tbody || !user) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6">Cargando facturas…</td>
    </tr>
  `;

  const snap = await getDocs(
    query(
      collection(db, "invoices"),
      where("therapistId", "==", user.uid),
      orderBy("createdAt", "desc")
    )
  );

  if (snap.empty) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No hay facturas todavía.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";

  snap.forEach(docSnap => {

    const f = docSnap.data();
    const tr = document.createElement("tr");

    const date = f.issueDate?.toDate
      ? f.issueDate.toDate().toLocaleDateString("es-ES")
      : "—";

    const statusLabel =
      f.status === "paid"
        ? `<span class="status status-paid">Pagada</span>`
        : `<span class="status status-issued">Emitida</span>`;

    tr.innerHTML = `
      <td>${f.invoiceNumber || "—"}</td>
      <td>${f.patientName || "—"}</td>
      <td>${date}</td>
      <td>${Number(f.totalAmount || 0).toFixed(2)} €</td>
      <td>${statusLabel}</td>
      <td>
        <button class="btn-link" data-id="${docSnap.id}">
          Descargar PDF
        </button>
      </td>
    `;

    tr.querySelector("button").onclick = async () => {
      try {
        const res = await generateInvoicePdf({
          invoiceId: docSnap.id
        });

        if (res.data?.url) {
          window.open(res.data.url, "_blank");
        }

      } catch (err) {
        console.error("Error generando PDF:", err);
        alert("No se pudo generar el PDF.");
      }
    };

    tbody.appendChild(tr);
  });
}

/* =========================
   START
========================= */

await loadInvoices();
