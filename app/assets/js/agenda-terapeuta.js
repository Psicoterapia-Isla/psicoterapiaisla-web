let currentDate = new Date();

function formatDate(date) {
  return date.toISOString().split("T")[0];
}
document.getElementById("prev-day").onclick = () => {
  currentDate.setDate(currentDate.getDate() - 1);
  loadAgenda();
};

document.getElementById("next-day").onclick = () => {
  currentDate.setDate(currentDate.getDate() + 1);
  loadAgenda();
};
function renderDate() {
  document.getElementById("current-day").textContent =
    currentDate.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
}
const STORAGE_KEY = "agenda-terapeuta";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

export function saveAgenda() {
  const dateKey = getTodayKey();

  const plan = {};
  document.querySelectorAll("[data-hour]").forEach(el => {
    plan[el.dataset.hour] = el.value || "";
  });

  const agenda = {
    date: dateKey,
    plan,
    reto: document.querySelector("#reto-diario")?.value || "",
    notas: {
      contactos: document.querySelector("#notas-contactos")?.value || "",
      tiempo_fuera: document.querySelector("#tiempo-fuera")?.value || ""
    },
    updatedAt: new Date().toISOString()
  };

  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  all[dateKey] = agenda;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  alert("Agenda guardada");
}
export function loadAgenda() {
  const dateKey = getTodayKey();
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const agenda = all[dateKey];
  if (!agenda) return;

  Object.entries(agenda.plan).forEach(([hour, value]) => {
    const field = document.querySelector(`[data-hour="${hour}"]`);
    if (field) field.value = value;
  });

  document.querySelector("#reto-diario").value = agenda.reto || "";
  document.querySelector("#notas-contactos").value = agenda.notas?.contactos || "";
  document.querySelector("#tiempo-fuera").value = agenda.notas?.tiempo_fuera || "";
}
import { db, auth } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===== GUARDAR AGENDA ===== */
export async function saveAgenda() {
  const uid = auth.currentUser.uid;
  const today = new Date().toISOString().split("T")[0];

  const hours = {};
  document.querySelectorAll("[data-hour]").forEach(t => {
    hours[t.dataset.hour] = t.value;
  });

  const data = {
    uid,
    date: today,
    hours,
    reto: document.getElementById("reto-diario")?.value || "",
    notas: document.getElementById("notas-contactos")?.value || "",
    tiempoFuera: document.getElementById("tiempo-fuera")?.value || "",
    updatedAt: new Date()
  };

  await setDoc(doc(db, "agendaTerapeuta", `${uid}_${today}`), data);
  alert("Agenda guardada");
}

/* ===== CARGAR AGENDA ===== */
export async function loadAgenda() {
  const uid = auth.currentUser.uid;
  const today = new Date().toISOString().split("T")[0];

  const ref = doc(db, "agendaTerapeuta", `${uid}_${today}`);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  document.querySelectorAll("[data-hour]").forEach(t => {
    t.value = data.hours?.[t.dataset.hour] || "";
  });

  document.getElementById("reto-diario").value = data.reto || "";
  document.getElementById("notas-contactos").value = data.notas || "";
  document.getElementById("tiempo-fuera").value = data.tiempoFuera || "";
}
