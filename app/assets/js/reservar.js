import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   CONSTANTES
========================= */
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);

/* =========================
   DOM
========================= */
const grid = document.getElementById("agendaGrid");
const weekLabel = document.getElementById("weekLabel");

const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");
const todayBtn = document.getElementById("today");

/* =========================
   STATE
========================= */
let baseDate = new Date();
let currentUser = null;
let patientProfile = null;
let therapists = [];

/* =========================
   FECHAS
========================= */
function mondayOf(d) {
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(monday) {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

/* =========================
   LOAD USER
========================= */
auth.onAuthStateChanged(async user => {
  if (!user) return;
  currentUser = user;

  // perfil paciente
  const snap = await getDocs(
    query(
      collection(db, "patients_normalized"),
      where("userId", "==", user.uid)
    )
  );

  if (snap.empty) {
    alert("No se ha encontrado tu perfil de paciente");
    return;
  }

  patientProfile = snap.docs[0].data();

  // terapeutas activos
  const tSnap = await getDocs(collection(db, "therapists"));
  therapists = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderWeek();
});

/* =========================
   RENDER WEEK
========================= */
async function renderWeek() {
  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  weekLabel.textContent = formatWeekLabel(monday);

  const from = formatDate(monday);
  const to = formatDate(new Date(monday.getTime() + 6 * 86400000));

  // cargar disponibilidades
  const availSnap = await getDocs(
    query(
      collection(db, "availability"),
      where("weekStart", "==", from)
    )
  );

  const availabilityByTherapist = {};
  availSnap.forEach(d => {
    const data = d.data();
    availabilityByTherapist[data.therapistId] = data.slots || {};
  });

  // cabecera
  grid.appendChild(document.createElement("div"));
  DAYS.forEach((_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const h = document.createElement("div");
    h.className = "day-label";
    h.textContent = d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(h);
  });

  HOURS.forEach(hour => {
    const hl = document.createElement("div");
    hl.className = "hour-label";
    hl.textContent = `${hour}:00`;
    grid.appendChild(hl);

    DAYS.forEach(day => {
      const cell = document.createElement("div");
      cell.className = "slot";

      const key = `${day}_${hour}`;
      let matches = [];

      therapists.forEach(t => {
        const slots = availabilityByTherapist[t.id];
        if (slots?.[key]) {
          matches.push({
            therapistId: t.id,
            modes: slots[key]
          });
        }
      });

      if (!matches.length) {
        cell.classList.add("disabled");
      } else {
        cell.classList.add("available");
        cell.textContent = "Disponible";

        cell.onclick = () => {
          handleReservation(monday, day, hour, matches);
        };
      }

      grid.appendChild(cell);
    });
  });
}

/* =========================
   RESERVA
========================= */
function handleReservation(monday, day, hour, matches) {
  // mutua → asignación automática
  if (patientProfile.patientType === "mutual") {
    const chosen = matches[0];
    alert(`Cita reservada automáticamente con el especialista asignado`);
    // aquí iría pre-reserva backend
    return;
  }

  // privado → elegir terapeuta
  if (matches.length === 1) {
    alert(`Cita reservada`);
    return;
  }

  // selector simple
  const names = matches.map((m, i) => `${i+1}`).join(", ");
  const choice = prompt(
    `Hay varios especialistas disponibles (${names}). Introduce número:`
  );

  const idx = Number(choice) - 1;
  if (!matches[idx]) return;

  alert("Cita reservada con el especialista elegido");
}

/* =========================
   NAV
========================= */
prevWeek.onclick = () => {
  baseDate.setDate(baseDate.getDate() - 7);
  renderWeek();
};

nextWeek.onclick = () => {
  baseDate.setDate(baseDate.getDate() + 7);
  renderWeek();
};

todayBtn.onclick = () => {
  baseDate = new Date();
  renderWeek();
};
