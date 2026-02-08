import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const list = document.getElementById("list");
const monthFilter = document.getElementById("monthFilter");
const patientFilter = document.getElementById("patientFilter");

let invoices = [];

/* =========================
   LOAD
========================= */
async function loadInvoices() {
  const q = query(
    collection(db, "invoices"),
    where("therapistId", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  invoices = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  render();
}

/* =========================
   FILTER + RENDER
========================= */
function render() {
  list.innerHTML = "";

  const month = monthFilter.value;
  const patient = patientFilter.value.toLowerCase();

  let filtered = invoices;

  if (month) {
    filtered = filtered.filter(i => {
      if (!i.createdAt?.toDate) return false;
      const d = i.createdAt.toDate();
      return (
        d.getFullYear() === Number(month.split("-")[0]) &&
        d.getMonth() + 1 === Number(month.split("-")[1])
      );
    });
  }

  if (patient) {
    filtered = filtered.filter(i =>
      (i.patientName || "").toLowerCase().includes(patient)
    );
  }

  if (!filtered.length) {
    list.innerHTML = `<p>No hay facturas</p>`;
    return;
  }

  let total = 0;

  filtered.forEach(i => {
    total += Number(i.amount || 0);

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <strong>${i.patientName || "—"}</strong><br>
      ${i.amount} €<br>
      ${i.createdAt?.toDate
        ? i.createdAt.toDate().toLocaleDateString("es-ES")
        : ""}<br>
      <span class="status ${i.status}">
        ${i.status === "paid" ? "Pagada" : "Pendiente"}
      </span>
    `;

    list.appendChild(div);
  });

  const summary = document.createElement("div");
  summary.className = "card";
  summary.innerHTML = `<strong>Total: ${total} €</strong>`;
  list.appendChild(summary);
}

/* =========================
   EVENTS
========================= */
monthFilter?.addEventListener("change", render);
patientFilter?.addEventListener("input", render);

/* =========================
   INIT
========================= */
loadInvoices();
