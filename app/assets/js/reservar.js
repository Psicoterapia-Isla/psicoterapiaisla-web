import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let baseDate = new Date();

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);

const grid = document.getElementById("agendaGrid");
const weekLabel = document.getElementById("weekLabel");

const formatDate = d => d.toISOString().slice(0, 10);

function mondayOf(d) {
  const x = new Date(d);
  const n = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - n);
  x.setHours(0,0,0,0);
  return x;
}

function formatWeekLabel(monday) {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${monday.toLocaleDateString("es-ES",{day:"numeric",month:"short"})} – ${end.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;
}

async function renderWeek() {
  grid.innerHTML = "";
  const monday = mondayOf(baseDate);
  weekLabel.textContent = formatWeekLabel(monday);

  const user = auth.currentUser;
  if (!user) return;

  const from = formatDate(monday);
  const to = formatDate(new Date(monday.getTime() + 6 * 86400000));

  const snap = await getDocs(
    query(
      collection(db, "appointments"),
      where("patientId", "==", user.uid),
      where("date", ">=", from),
      where("date", "<=", to)
    )
  );

  const byDay = {};
  snap.forEach(d => {
    const a = d.data();
    (byDay[a.date] ??= []).push(a);
  });

  // Header
  grid.appendChild(document.createElement("div"));
  DAYS.forEach((l, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const h = document.createElement("div");
    h.className = "day-label";
    h.textContent = `${l} ${d.getDate()}`;
    grid.appendChild(h);
  });

  // Horas
  HOURS.forEach(hour => {
    const hl = document.createElement("div");
    hl.className = "hour-label";
    hl.textContent = `${hour}:00`;
    grid.appendChild(hl);

    DAYS.forEach((_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const key = formatDate(d);

      const cell = document.createElement("div");
      cell.className = "slot disabled";

      const appt = (byDay[key] || []).find(a =>
        Number(a.start.split(":")[0]) === hour
      );

      if (appt) {
        cell.className = "slot " + (appt.completed ? "done" : "busy");
        cell.innerHTML = `
          <strong>${appt.start}–${appt.end}</strong>
          <div>${appt.modality === "online" ? "Online" : "Presencial"}</div>
        `;
      }

      grid.appendChild(cell);
    });
  });
}

// NAV
prevWeek.onclick = () => { baseDate.setDate(baseDate.getDate() - 7); renderWeek(); };
nextWeek.onclick = () => { baseDate.setDate(baseDate.getDate() + 7); renderWeek(); };
today.onclick = () => { baseDate = new Date(); renderWeek(); };

renderWeek();
