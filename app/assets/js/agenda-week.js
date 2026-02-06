import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";
import {
  collection, getDocs, query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

await requireAuth();

const user = auth.currentUser;
const therapistId = user.uid;
const grid = document.getElementById("weekGrid");

const START_HOUR = 9;
const END_HOUR = 21;
const DAYS = 7;

/* SEMANA */
const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - ((today.getDay()+6)%7));
monday.setHours(0,0,0,0);

/* HEADERS */
grid.appendChild(document.createElement("div"));

for (let d=0; d<DAYS; d++) {
  const day = new Date(monday);
  day.setDate(monday.getDate()+d);

  const h = document.createElement("div");
  h.className = "day-header";
  h.textContent = day.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
  h.onclick = () => {
    window.location.href =
      `agenda-diaria.html?date=${day.toISOString().split("T")[0]}`;
  };
  grid.appendChild(h);
}

/* GRID */
for (let hour=START_HOUR; hour<END_HOUR; hour++) {
  const hourCell = document.createElement("div");
  hourCell.className="week-hour";
  hourCell.textContent=`${hour}:00`;
  grid.appendChild(hourCell);

  for (let d=0; d<DAYS; d++) {
    const cell = document.createElement("div");
    cell.className="week-slot available";
    cell.onclick = () => {
      openCreateModal(dayISO(d), hour);
    };
    grid.appendChild(cell);
  }
}

/* DATA */
const start = Timestamp.fromDate(monday);
const end = Timestamp.fromDate(new Date(monday.getTime()+7*86400000));

const snap = await getDocs(query(
  collection(db,"appointments"),
  where("therapistId","==",therapistId),
  where("start",">=",start),
  where("start","<",end)
));

snap.forEach(doc => {
  const a = doc.data();
  const s = a.start.toDate();
  const d = (s.getDay()+6)%7;
  const h = s.getHours();
  if (h<START_HOUR || h>=END_HOUR) return;

  const index = 1 + d + (h-START_HOUR+1)*(DAYS+1);
  const cell = grid.children[index];
  if (!cell) return;

  cell.className = `week-slot ${a.status==="completed"?"done":"reserved"}`;
  cell.textContent = a.patientName || "";
});

/* HELPERS */
function dayISO(offset){
  const d=new Date(monday);
  d.setDate(monday.getDate()+offset);
  return d.toISOString().split("T")[0];
}

window.openCreateModal = (dateISO, hour) => {
  document.getElementById("createModal").style.display="block";
  document.getElementById("cDateLabel").textContent =
    new Date(dateISO).toLocaleDateString("es-ES");
  document.getElementById("cStart").value =
    `${hour.toString().padStart(2,"0")}:00`;
  document.getElementById("cEnd").value =
    `${(hour+1).toString().padStart(2,"0")}:00`;
  window.__selectedDateISO = dateISO;
};
