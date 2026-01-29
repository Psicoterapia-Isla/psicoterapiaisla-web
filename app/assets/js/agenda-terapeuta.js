import { auth } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

/* =========================
   ESTADO DE FECHA
   ========================= */
let currentDate = new Date();

function formatDate(date) {
  return date.toISOString().split("T")[0];
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

function renderDate() {
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
   GUARDAR AGENDA (Firestore)
   ========================= */
export async function saveAgenda() {
  const user = auth.currentUser;
  if (!user) return alert("Usuario no autenticado");

  const dateKey = formatDate(currentDate);

  const hours = {};
  document.querySelectorAll("[data-hour]").forEach(el => {
    hours[el.dataset.hour] = el.value || "";
  });

  const data = {
    uid: user.uid,
    date: dateKey,
    hours,
    reto: document.getElementById("reto-diario")?.value || "",
    notasContactos: document.getElementById("notas-contactos")?.value || "",
    tiempoFuera: document.getElementById("tiempo-fuera")?.value || "",
    updatedAt: new Date()
  };

  await setDoc(
    doc(db, "agendaTerapeuta", `${user.uid}_${dateKey}`),
    data
  );

  alert("Agenda guardada");
}

/* =========================
   CARGAR AGENDA (Firestore)
   ========================= */
export async function loadAgenda() {
  const user = auth.currentUser;
  if (!user) return;

  const dateKey = formatDate(currentDate);
  const ref = doc(db, "agendaTerapeuta", `${user.uid}_${dateKey}`);
  const snap = await getDoc(ref);

  // limpiar campos
  document.querySelectorAll("[data-hour]").forEach(el => {
    el.value = "";
  });
  document.getElementById("reto-diario").value = "";
  document.getElementById("notas-contactos").value = "";
  document.getElementById("tiempo-fuera").value = "";

  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(data.hours || {}).forEach(([hour, value]) => {
    const el = document.querySelector(`[data-hour="${hour}"]`);
    if (el) el.value = value;
  });

  document.getElementById("reto-diario").value = data.reto || "";
  document.getElementById("notas-contactos").value = data.notasContactos || "";
  document.getElementById("tiempo-fuera").value = data.tiempoFuera || "";
}

/* =========================
   INIT
   ========================= */
auth.onAuthStateChanged(user => {
  if (user) {
    renderDate();
    loadAgenda();
  }
});
