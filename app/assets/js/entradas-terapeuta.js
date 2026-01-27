import { db, auth } from "./firebase.js";
import { requireAuth } from "./auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

requireAuth();

const container = document.getElementById("entries-list");
const uidInput = document.getElementById("filter-uid");
const typeSelect = document.getElementById("filter-type");
const filterBtn = document.getElementById("apply-filters");

const LABELS = {
  registro_emocional: "Registro emocional",
  sentirme_a_salvo: "Sentirme a salvo"
};

const FIELD_LABELS = {
  contexto_emocional: "Contexto emocional",
  emociones_presentes: "Emociones presentes",
  necesidad_actual: "Necesidad actual",
  registro_corporal: "Registro corporal",
  seguridad_relacional: "Seguridad relacional",
  seguridad_externa: "Seguridad externa",
  seguridad_corporal: "Seguridad corporal",
  recurso_personal: "Recurso personal"
};

async function loadEntries(filters = {}) {
  container.innerHTML = "<p>Cargando…</p>";

  let q = collection(db, "entries");
  let constraints = [];

  if (filters.uid) {
    constraints.push(where("uid", "==", filters.uid));
  }

  if (filters.type) {
    constraints.push(where("type", "==", filters.type));
  }

  constraints.push(orderBy("createdAt", "desc"));

  const finalQuery = query(q, ...constraints);
  const snapshot = await getDocs(finalQuery);

  if (snapshot.empty) {
    container.innerHTML = "<p>No hay resultados.</p>";
    return;
  }

  container.innerHTML = "";

  snapshot.forEach(doc => {
    const data = doc.data();

    const fieldsHtml = Object.entries(data.data || {})
      .map(([key, value]) => `
        <p><strong>${FIELD_LABELS[key] || key}:</strong><br>${value}</p>
      `)
      .join("");

    const div = document.createElement("div");
    div.className = "entry-card";

    div.innerHTML = `
      <h3>${LABELS[data.type] || data.type}</h3>
      <small>${data.createdAt?.toDate().toLocaleString()}</small>
      <p><em>UID paciente:</em> ${data.uid}</p>
      ${fieldsHtml}
      <hr>
    `;

    container.appendChild(div);
  });
}

auth.onAuthStateChanged(user => {
  if (user) {
    loadEntries(); // carga inicial sin filtros
  }
});

filterBtn.addEventListener("click", () => {
  loadEntries({
    uid: uidInput.value.trim(),
    type: typeSelect.value
  });
});
