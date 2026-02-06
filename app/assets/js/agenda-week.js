import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById("weekGrid");

const START_HOUR = 9;
const END_HOUR = 21;
const DAYS = 7;

const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
monday.setHours(0,0,0,0);

const user = auth.currentUser;
const therapistId = user.uid;

/* ===== HEADERS ===== */
grid.appendChild(document.createElement("div")); // esquina vacía

for (let d=0; d<DAYS; d++) {
  const day = new Date(monday);
  day.setDate(monday.getDate() + d);

  const h = document.createElement("div");
  h.className = "day-header";
  h.textContent = day.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
  h.onclick = () => {
    window.location.href =
      `agenda-diaria.html?date=${day.toISOString().split("T")[0]}`;
  };
  grid.appendChild(h);
}

/* ===== HOURS + SLOTS ===== */
for (let hour = START_HOUR; hour < END_HOUR; hour++) {

  const hourCell = document.createElement("div");
  hourCell.className = "week-hour";
  hourCell.textContent = `${hour}:00`;
  grid.appendChild(hourCell);

  for (let d=0; d<DAYS; d++) {
    const cell = document.createElement("div");
    cell.className = "week-slot blocked";
    cell.dataset.hour = hour;
    cell.dataset.day = d;
    grid.appendChild(cell);
  }
}

/* ===== LOAD DATA ===== */
const start = Timestamp.fromDate(monday);
const end = Timestamp.fromDate(
  new Date(monday.getTime() + 7*24*60*60*1000)
);

const snap = await getDocs(query(
  collection(db,"appointments"),
  where("therapistId","==",therapistId),
  where("start",">=",start),
  where("start","<",end)
));

snap.forEach(doc => {
  const a = doc.data();
  const s = a.start.toDate();
  const day = (s.getDay()+6)%7;
  const hour = s.getHours();

  const index =
    1 + day + (hour-START_HOUR+1)*8;

  const cell = grid.children[index];
  if (!cell) return;

  cell.className = `week-slot ${a.status === "completed" ? "done" : "reserved"}`;
  cell.innerHTML = `<small>${a.patientName || ""}</small>`;
});
