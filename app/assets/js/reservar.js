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
   AUTH + DATA BASE
========================= */
auth.onAuthStateChanged(async user => {
  if (!user) return;
  currentUser = user;

  // perfil paciente
  const pSnap = await getDocs(
    query(
      collection(db, "patients_normalized"),
      where("userId", "==", user.uid)
    )
  );

  if (pSnap.empty) {
    alert("No se ha encontrado tu perfil de paciente");
    return;
  }

  patientProfile = pSnap.docs[0].data();

  // terapeutas
  const tSnap = await getDocs(collection(db, "therapists"));
  therapists = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderWeek();
});

/* =========================
   RENDER WEEK (CON BLOQUEO)
========================= */
async function renderWeek() {
  grid.innerHTML = "";

  const monday = mondayOf(baseDate);
  weekLabel.textContent = formatWeekLabel(monday);

  const from = formatDate(monday);
  const to = formatDate(new Date(monday.getTime() + 6 * 86400000));

  /* ===== DISPONIBILIDAD ===== */
  const availSnap = await getDocs(
    query(
      collection(db, "availability"),
      where("weekStart", "==", from)
    )
  );

  const availability = {};
  availSnap.forEach(d => {
    availability[d.data().therapistId] = d.data().slots || {};
  });

  /* ===== CITAS (BLOQUEO REAL) ===== */
  const apptSnap = await getDocs(
    query(
      collection(db, "appointments"),
      where("date", ">=", from),
      where("date", "<=", to)
    )
  );

  const booked = {};
  apptSnap.forEach(d => {
    const a = d.data();
    booked[`${a.therapistId}_${a.date}_${a.start}`] = true;
  });

  /* ===== CABECERA ===== */
  grid.appendChild(document.createElement("div"));
  DAYS.forEach((_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const h = document.createElement("div");
    h.className = "day-label";
    h.textContent = d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(h);
  });

  /* ===== GRID ===== */
  HOURS.forEach(hour => {
    const hl = document.createElement("div");
    hl.className = "hour-label";
    hl.textContent = `${hour}:00`;
    grid.appendChild(hl);

    DAYS.forEach(day => {
      const cell = document.createElement("div");
      cell.className = "slot";

      const date = formatDate(
        new Date(monday.getTime() + DAYS.indexOf(day) * 86400000)
      );

      let freeTherapists = [];

      therapists.forEach(t => {
        const slotKey = `${day}_${hour}`;
        const isAvailable = availability[t.id]?.[slotKey];
        const isBooked = booked[`${t.id}_${date}_${hour}:00`];

        if (isAvailable && !isBooked) {
          freeTherapists.push(t.id);
        }
      });

      if (!freeTherapists.length) {
        cell.classList.add("disabled");
      } else {
        cell.classList.add("available");
        cell.textContent = "Disponible";

        cell.onclick = () => {
          handleReservation(date, hour, freeTherapists);
        };
      }

      grid.appendChild(cell);
    });
  });
}

/* =========================
   RESERVA (AÚN SIN CREAR CITA)
========================= */
function handleReservation(date, hour, freeTherapists) {

  // MUTUA → asignación automática
  if (patientProfile.patientType === "mutual") {
    const therapistId = freeTherapists[0];
    alert("Cita reservada automáticamente");
    return;
  }

  // PRIVADO → elección
  if (freeTherapists.length === 1) {
    alert("Cita reservada");
    return;
  }

  const choice = prompt(
    `Hay ${freeTherapists.length} especialistas disponibles. Introduce número (1-${freeTherapists.length})`
  );

  if (!choice) return;
  alert("Cita reservada");
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
