import { auth } from "./firebase.js";
import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ESTADO DE FECHA
========================= */
let currentDate = new Date();

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/* =========================
   NAVEGACIÓN DE DÍAS
========================= */
export function initAgendaNavigation() {
  const prev = document.getElementById("prev-day");
  const next = document.getElementById("next-day");

  if (prev) {
    prev.addEventListener("click", async () => {
      currentDate.setDate(currentDate.getDate() - 1);
      renderDate();
      await loadAgenda();
    });
  }

  if (next) {
    next.addEventListener("click", async () => {
      currentDate.setDate(currentDate.getDate() + 1);
      renderDate();
      await loadAgenda();
    });
  }

  renderDate();
}

/* =========================
   RENDER FECHA
========================= */
export function renderDate() {
  const el = document.getElementById("current-day");
  if (!el) return;

  el.textContent = currentDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/* =========================
   CARGAR AGENDA
========================= */
export async function loadAgenda() {
  const user = auth.currentUser;
  if (!user) return;

  const dateKey = formatDate(currentDate);
  const ref = doc(db, "agendaTerapeuta", `${user.uid}_${dateKey}`);
  const snap = await getDoc(ref);

  // limpiar siempre
  document.querySelectorAll("[data-hour]").forEach(t => t.value = "");
  document.getElementById("reto-diario").value = "";
  document.getElementById("notas-contactos").value = "";
  document.getElementById("tiempo-fuera").value = "";

  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(data.plan || {}).forEach(([hour, value]) => {
    const field = document.querySelector(`[data-hour="${hour}"]`);
    if (field) field.value = value;
  });

  document.getElementById("reto-diario").value = data.reto || "";
  document.getElementById("notas-contactos").value = data.notas || "";
  document.getElementById("tiempo-fuera").value = data.tiempoFuera || "";
}

/* =========================
   GUARDAR AGENDA
========================= */
export async function saveAgenda() {
  const user = auth.currentUser;
  if (!user) return;

  const dateKey = formatDate(currentDate);

  const plan = {};
  document.querySelectorAll("[data-hour]").forEach(t => {
    plan[t.dataset.hour] = t.value || "";
  });

  const data = {
    uid: user.uid,
    date: dateKey,
    plan,
    reto: document.getElementById("reto-diario").value || "",
    notas: document.getElementById("notas-contactos").value || "",
    tiempoFuera: document.getElementById("tiempo-fuera").value || "",
    updatedAt: new Date()
  };

  await setDoc(
    doc(db, "agendaTerapeuta", `${user.uid}_${dateKey}`),
    data
  );

  alert("Agenda guardada");
}
