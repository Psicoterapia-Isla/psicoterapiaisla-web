import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp
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

function pad(n) {
  return String(n).padStart(2, "0");
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
   RENDER WEEK
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

  /* ===== CITAS EXISTENTES (BLOQUEO) ===== */
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

      const start = `${pad(hour)}:00`;
      const end = `${pad(hour + 1)}:00`;

      let freeTherapists = [];

      therapists.forEach(t => {
        const slotKey = `${day}_${hour}`;
        const isAvailable = availability[t.id]?.[slotKey];
        const isBooked = booked[`${t.id}_${date}_${start}`];

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
          createAppointment({
            date,
            start,
            end,
            freeTherapists
          });
        };
      }

      grid.appendChild(cell);
    });
  });
}

/* =========================
   CREAR CITA REAL
========================= */
async function createAppointment({ date, start, end, freeTherapists }) {

  let therapistId = null;

  // MUTUA → automático
  if (patientProfile.patientType === "mutual") {
    therapistId = freeTherapists[0];
  } else {
    // PRIVADO
    if (freeTherapists.length === 1) {
      therapistId = freeTherapists[0];
    } else {
      const choice = prompt(
        `Hay ${freeTherapists.length} especialistas disponibles.\nIntroduce un número (1-${freeTherapists.length})`
      );
      if (!choice) return;
      therapistId = freeTherapists[Number(choice) - 1];
      if (!therapistId) return;
    }
  }

  await addDoc(collection(db, "appointments"), {
    therapistId,
    patientId: patientProfile.id || null,
    patientName: `${patientProfile.nombre || ""} ${patientProfile.apellidos || ""}`.trim(),
    modality: "viladecans",
    date,
    start,
    end,
    completed: false,
    paid: false,
    createdAt: Timestamp.now()
  });

  alert("Cita reservada correctamente");
  await renderWeek();
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
