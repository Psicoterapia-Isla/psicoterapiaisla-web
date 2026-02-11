import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ESTADO GLOBAL
========================= */
let currentDate = new Date();
let currentUser = null;
let patientProfile = null;

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/* =========================
   INICIALIZACIÓN
========================= */
export async function initAgendaPaciente(user) {
  if (!user) throw new Error("Usuario no inicializado");

  currentUser = user;

  // 🔒 Obtener perfil real de paciente
  const snap = await getDocs(
    query(
      collection(db, "patients_normalized"),
      where("userId", "==", user.uid)
    )
  );

  if (snap.empty) {
    alert("Perfil de paciente no encontrado");
    return;
  }

  const docData = snap.docs[0];
  patientProfile = { id: docData.id, ...docData.data() };

  renderDate();
  bindDayNavigation();
  await loadAgendaPaciente();
}

/* =========================
   NAVEGACIÓN DE DÍAS
========================= */
function bindDayNavigation() {

  document.getElementById("prev-day")?.addEventListener("click", async () => {
    currentDate.setDate(currentDate.getDate() - 1);
    renderDate();
    await loadAgendaPaciente();
  });

  document.getElementById("next-day")?.addEventListener("click", async () => {
    currentDate.setDate(currentDate.getDate() + 1);
    renderDate();
    await loadAgendaPaciente();
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
   CITA DEL DÍA (CORREGIDO)
========================= */
async function loadAppointmentForDay() {

  const box = document.getElementById("appointment-today");
  const content = document.getElementById("appointment-content");
  if (!box || !content || !patientProfile) return;

  box.style.display = "none";
  content.innerHTML = "";

  const dateKey = formatDate(currentDate);

  const q = query(
    collection(db, "appointments"),
    where("patientId", "==", patientProfile.id),
    where("date", "==", dateKey)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const a = snap.docs[0].data();

  content.innerHTML = `
    <p><strong>${a.service || "Sesión terapéutica"}</strong></p>
    <p>${a.start} – ${a.end}</p>
    <p>${a.modality === "online" ? "Online" : "Presencial"}</p>
    <p>${a.completed ? "✅ Sesión realizada" : "🕒 Sesión pendiente"}</p>
  `;

  box.style.display = "block";
}

/* =========================
   CARGAR AGENDA
========================= */
export async function loadAgendaPaciente() {

  if (!currentUser) return;

  const dateKey = formatDate(currentDate);

  const ref = doc(db, "agendaPaciente", `${currentUser.uid}_${dateKey}`);
  const snap = await getDoc(ref);

  // limpiar
  document.querySelectorAll("[data-hour]").forEach(t => t.value = "");
  document.getElementById("reto-diario").value = "";
  document.getElementById("notas-contactos").value = "";
  document.getElementById("tiempo-fuera").value = "";
  document
    .querySelectorAll('input[name="emocion"]')
    .forEach(r => r.checked = false);

  if (snap.exists()) {
    const data = snap.data();

    Object.entries(data.plan || {}).forEach(([hour, value]) => {
      const field = document.querySelector(`[data-hour="${hour}"]`);
      if (field) field.value = value;
    });

    if (data.emocion) {
      const radio = document.querySelector(
        `input[name="emocion"][value="${data.emocion}"]`
      );
      if (radio) radio.checked = true;
    }

    document.getElementById("reto-diario").value = data.reto || "";
    document.getElementById("notas-contactos").value = data.notas || "";
    document.getElementById("tiempo-fuera").value = data.tiempoFuera || "";
  }

  await loadAppointmentForDay();
}

/* =========================
   GUARDAR AGENDA
========================= */
export async function saveAgendaPaciente() {

  if (!currentUser) return;

  const dateKey = formatDate(currentDate);
  const plan = {};

  document.querySelectorAll("[data-hour]").forEach(t => {
    plan[t.dataset.hour] = t.value || "";
  });

  const emocion =
    document.querySelector('input[name="emocion"]:checked')?.value || null;

  await setDoc(
    doc(db, "agendaPaciente", `${currentUser.uid}_${dateKey}`),
    {
      uid: currentUser.uid,
      date: dateKey,
      plan,
      emocion,
      reto: document.getElementById("reto-diario").value || "",
      notas: document.getElementById("notas-contactos").value || "",
      tiempoFuera: document.getElementById("tiempo-fuera").value || "",
      updatedAt: new Date()
    }
  );

  alert("Planificador guardado correctamente");
}
