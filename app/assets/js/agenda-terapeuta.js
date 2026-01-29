import { auth } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

/* =========================
   FECHA ACTUAL
   ========================= */
let currentDate = new Date();

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/* =========================
   NAVEGACIÓN DÍAS
   ========================= */
export function initDayNavigation() {
  document.getElementById("prev-day").onclick = () => {
    currentDate.setDate(currentDate.getDate() - 1);
    renderDate();
    loadAgenda();
  };

  document.getElementById("next-day").onclick = () => {
    currentDate.setDate(currentDate.getDate() + 1);
    renderDate();
    loadAgenda();
  };

  renderDate();
}

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
   GUARDAR
   ========================= */
export async function saveAgenda() {
  const user = auth.currentUser;
  if (!user) return;

  const date = formatDate(currentDate);
  const uid = user.uid;

  const plan = {};
  document.querySelectorAll("[data-hour]").forEach(t => {
    plan[t.dataset.hour] = t.value || "";
  });

  const data = {
    uid,
    date,
    plan,
    reto: document.getElementById("reto-diario")?.value || "",
    notas: document.getElementById("notas-contactos")?.value || "",
    tiempoFuera: document.getElementById("tiempo-fuera")?.value || "",
    updatedAt: new Date()
  };

  await setDoc(doc(db, "agendaTerapeuta", `${uid}_${date}`), data);
  alert("Agenda guardada");
}

/* =========================
   CARGAR
   ========================= */
export async function loadAgenda() {
  const user = auth.currentUser;
  if (!user) return;

  const date = formatDate(currentDate);
  const uid = user.uid;

  const ref = doc(db, "agendaTerapeuta", `${uid}_${date}`);
  const snap = await getDoc(ref);

  // limpiar campos siempre
  document.querySelectorAll("[data-hour]").forEach(t => t.value = "");
  document.getElementById("reto-diario").value = "";
  document.getElementById("notas-contactos").value = "";
  document.getElementById("tiempo-fuera").value = "";

  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(data.plan || {}).forEach(([h, v]) => {
    const field = document.querySelector(`[data-hour="${h}"]`);
    if (field) field.value = v;
  });

  document.getElementById("reto-diario").value = data.reto || "";
  document.getElementById("notas-contactos").value = data.notas || "";
  document.getElementById("tiempo-fuera").value = data.tiempoFuera || "";
}
