import { db, auth } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ESTADO DE FECHA ACTUAL
   ========================= */
export let currentDate = new Date();

/* =========================
   UTILIDADES
   ========================= */
function formatDate(date) {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

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
   NAVEGACIÓN ENTRE DÍAS
   ========================= */
document.getElementById("prev-day")?.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  renderDate();
  loadAgenda();
});

document.getElementById("next-day")?.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  renderDate();
  loadAgenda();
});

/* =========================
   GUARDAR AGENDA
   ========================= */
export async function saveAgenda() {
  const uid = auth.currentUser.uid;
  const dateKey = formatDate(currentDate);

  const hours = {};
  document.querySelectorAll("[data-hour]").forEach(el => {
    hours[el.dataset.hour] = el.value || "";
  });

  const data = {
    uid,
    date: dateKey,
    hours,
    reto: document.getElementById("reto-diario")?.value || "",
    notasContactos: document.getElementById("notas-contactos")?.value || "",
    tiempoFuera: document.getElementById("tiempo-fuera")?.value || "",
    updatedAt: new Date()
  };

  await setDoc(
    doc(db, "agendaTerapeuta", `${uid}_${dateKey}`),
    data
  );

  alert("Agenda guardada");
}

/* =========================
   CARGAR AGENDA
   ========================= */
export async function loadAgenda() {
  const uid = auth.currentUser.uid;
  const dateKey = formatDate(currentDate);

  renderDate();

  // Limpia primero
  document.querySelectorAll("[data-hour]").forEach(el => el.value = "");
  document.getElementById("reto-diario").value = "";
  document.getElementById("notas-contactos").value = "";
  document.getElementById("tiempo-fuera").value = "";

  const ref = doc(db, "agendaTerapeuta", `${uid}_${dateKey}`);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(data.hours || {}).forEach(([hour, value]) => {
    const field = document.querySelector(`[data-hour="${hour}"]`);
    if (field) field.value = value;
  });

  document.getElementById("reto-diario").value = data.reto || "";
  document.getElementById("notas-contactos").value = data.notasContactos || "";
  document.getElementById("tiempo-fuera").value = data.tiempoFuera || "";
}
