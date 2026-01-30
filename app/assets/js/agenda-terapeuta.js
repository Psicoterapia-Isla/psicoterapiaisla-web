import { db } from "./firebase.js";
import { auth } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================
   ESTADO GLOBAL
========================= */
let currentDate = new Date();
let currentUser = null;

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/* =========================
   INICIALIZACIÓN (AÑADIDO CLAVE)
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;
  renderDate();
  bindDayNavigation();
  await loadAgenda();
});

/* =========================
   NAVEGACIÓN DE DÍAS
========================= */
function bindDayNavigation() {
  document.getElementById("prev-day")?.addEventListener("click", async () => {
    currentDate.setDate(currentDate.getDate() - 1);
    renderDate();
    await loadAgenda();
  });

  document.getElementById("next-day")?.addEventListener("click", async () => {
    currentDate.setDate(currentDate.getDate() + 1);
    renderDate();
    await loadAgenda();
  });
}

/* =========================
   FECHA
========================= */
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
   CARGAR AGENDA
========================= */
export async function loadAgenda() {
  if (!currentUser) return;

  const dateKey = formatDate(currentDate);
  const ref = doc(db, "agendaTerapeuta", `${currentUser.uid}_${dateKey}`);
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
  if (!currentUser) {
    alert("Usuario no autenticado");
    return;
  }

  const dateKey = formatDate(currentDate);

  const plan = {};
  document.querySelectorAll("[data-hour]").forEach(t => {
    plan[t.dataset.hour] = t.value || "";
  });

  const data = {
    uid: currentUser.uid,
    date: dateKey,
    plan,
    reto: document.getElementById("reto-diario").value || "",
    notas: document.getElementById("notas-contactos").value || "",
    tiempoFuera: document.getElementById("tiempo-fuera").value || "",
    updatedAt: new Date()
  };

  await setDoc(
    doc(db, "agendaTerapeuta", `${currentUser.uid}_${dateKey}`),
    data
  );

  alert("Agenda guardada");
}
