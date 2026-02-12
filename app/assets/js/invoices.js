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

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =====================================================
   INIT SEGURO
===================================================== */

await requireAuth();
await loadMenu();

const tbody = document.getElementById("facturasBody");

/* =====================================================
   FUNCTIONS (REGIÓN CORRECTA)
===================================================== */

const functions = getFunctions(undefined, "us-central1");

const generateInvoicePdf = httpsCallable(
  functions,
  "generateInvoicePdf"
);

/* =====================================================
   LOAD FACTURAS
===================================================== */

async function loadInvoices(user) {

  if (!tbody || !user) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6">Cargando facturas…</td>
    </tr>
  `;

  try {

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
          : f.status === "draft"
            ? `<span class="status">Borrador</span>`
            : `<span class="status status-issued">Emitida</span>`;

      tr.innerHTML = `
        <td>${f.invoiceNumber || "—"}</td>
        <td>${f.patientName || "—"}</td>
        <td>${date}</td>
        <td>${Number(f.totalAmount || 0).toFixed(2)} €</td>
        <td>${statusLabel}</td>
        <td>
          <button class="btn-link">
            Descargar PDF
          </button>
        </td>
      `;

      const button = tr.querySelector("button");

      button.addEventListener("click", async () => {

        button.disabled = true;
        button.textContent = "Generando...";

        try {

          // 🔥 Forzar refresh del token antes de llamar
          await user.getIdToken(true);

          const res = await generateInvoicePdf({
            invoiceId: docSnap.id
          });

          if (res.data?.url) {
            window.open(res.data.url, "_blank");
          } else {
            alert("No se recibió URL del PDF.");
          }

        } catch (err) {

          console.error("Error generando PDF:", err);

          if (err.code === "unauthenticated") {
            alert("Sesión expirada. Recarga la página.");
          } else {
            alert("Error generando factura.");
          }

        } finally {

          button.disabled = false;
          button.textContent = "Descargar PDF";
        }

      });

      tbody.appendChild(tr);

    });

  } catch (error) {

    console.error("Error cargando facturas:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="6">Error cargando facturas.</td>
      </tr>
    `;
  }
}

/* =====================================================
   ESPERAR AUTENTICACIÓN REAL
===================================================== */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Usuario no autenticado.</td>
      </tr>
    `;
    return;
  }

  try {
    // 🔥 Aseguramos token válido antes de cargar nada
    await user.getIdToken(true);
    await loadInvoices(user);
  } catch (err) {
    console.error("Error inicializando facturas:", err);
  }

});
