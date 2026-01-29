import { auth } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================
   ESTADO GLOBAL
========================= */
let currentDate = new Date();
let currentUser = null;

/* =========================
   FECHAS
========================= */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

export function goPrevDay() {
  currentDate.setDate(currentDate.getDate() - 1);
}

export function goNextDay() {
  currentDate.setDate(currentDate.getDate() + 1);
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
   LIMPIAR UI
========================= */
function clearAgendaUI() {
  document.querySelectorAll("[data-hour]").forEach(t => t.value = "");
  document.getElementById("reto-diario").value = "";
  document.getElementById("notas-contactos").value = "";
  document.getElementById("tiempo-fuera").value = "";
}

/* =========================
   CARGAR AGENDA
========================= */
export async function loadAgenda() {
  if (!currentUser) return;

  const dateKey = formatDate(currentDate);
  const ref = doc(db, "agendaTerapeuta", `${currentUser.uid}_${dateKey}`);

  clearAgendaUI();

  const snap = await getDoc(ref);
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
  if (!currentUser) return;

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

/* =========================
   INIT REAL (CLAVE)
========================= */
onAuthStateChanged(auth, async user => {
  if (!user) return;

  currentUser = user;
  renderDate();
  await loadAgenda();
});
