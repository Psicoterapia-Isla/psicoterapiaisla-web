import { auth, db } from "./firebase.js";
import {
  collection, getDocs, query, where, Timestamp, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const grid = document.getElementById("grid");

const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const START = 9;
const END = 21;

/* ===== SEMANA ===== */
function mondayOf(d){
  const x = new Date(d);
  const n = (x.getDay()+6)%7;
  x.setDate(x.getDate()-n);
  x.setHours(0,0,0,0);
  return x;
}

const params = new URLSearchParams(location.search);
const base = params.get("week") ? new Date(params.get("week")) : new Date();
const monday = mondayOf(base);
const weekKey = monday.toISOString().slice(0,10);

prev.onclick = () => {
  const d = new Date(monday); d.setDate(d.getDate()-7);
  location.href = `agenda-semanal.html?week=${d.toISOString().slice(0,10)}`;
};
next.onclick = () => {
  const d = new Date(monday); d.setDate(d.getDate()+7);
  location.href = `agenda-semanal.html?week=${d.toISOString().slice(0,10)}`;
};
today.onclick = () => location.href = "agenda-semanal.html";

/* ===== AUTH SAFE ===== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const therapistId = user.uid;

  /* ===== DISPONIBILIDAD ===== */
  const availSnap = await getDoc(
    doc(db,"availability",`${therapistId}_${weekKey}`)
  );
  const availability = availSnap.exists()
    ? availSnap.data().slots || {}
    : {};

  /* ===== CITAS ===== */
  const start = Timestamp.fromDate(monday);
  const end = Timestamp.fromDate(new Date(monday.getTime()+7*86400000));

  const appsSnap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",therapistId),
    where("start",">=",start),
    where("start","<",end)
  ));

  const apps = {};
  appsSnap.forEach(d=>{
    const a = d.data();
    const s = a.start.toDate();
    const key = `${DAYS[(s.getDay()+6)%7]}_${s.getHours()}`;
    apps[key] = { ...a, id:d.id };
  });

  /* ===== HEADER GRID ===== */
  grid.innerHTML = "";
  grid.appendChild(document.createElement("div"));

  for(let i=0;i<7;i++){
    const d = new Date(monday);
    d.setDate(d.getDate()+i);
    const h = document.createElement("div");
    h.className = "day";
    h.textContent =
      d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
    grid.appendChild(h);
  }

  /* ===== GRID ===== */
  for(let h=START; h<END; h++){
    const hl = document.createElement("div");
    hl.className = "hour";
    hl.textContent = `${h}:00`;
    grid.appendChild(hl);

    for(let d=0; d<7; d++){
      const key = `${DAYS[d]}_${h}`;
      const c = document.createElement("div");

      if(apps[key]){
        const a = apps[key];
        c.className = `cell ${a.status==="completed"?"done":"busy"}`;
        c.textContent = a.patientName || "Cita";
        c.onclick = () => location.href =
          `agenda-diaria.html?date=${a.start.toDate().toISOString().slice(0,10)}`;
      }
      else if(availability[key]){
        c.className = "cell free";
        c.textContent = "Disponible";
        const dte = new Date(monday);
        dte.setDate(dte.getDate()+d);
        c.onclick = () => location.href =
          `agenda-diaria.html?date=${dte.toISOString().slice(0,10)}`;
      }
      else {
        c.className = "cell off";
      }

      grid.appendChild(c);
    }
  }
});
