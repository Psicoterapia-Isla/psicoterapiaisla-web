import { auth, db } from "./firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const LABELS = ["L","M","X","J","V","S","D"];
const HOURS = Array.from({length:12},(_,i)=>i+9);

const grid = document.getElementById("grid");
const save = document.getElementById("save");

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

prevWeek.onclick = () => {
  const d = new Date(monday); d.setDate(d.getDate()-7);
  location.href = `disponibilidad.html?week=${d.toISOString().slice(0,10)}`;
};
nextWeek.onclick = () => {
  const d = new Date(monday); d.setDate(d.getDate()+7);
  location.href = `disponibilidad.html?week=${d.toISOString().slice(0,10)}`;
};
todayWeek.onclick = () => location.href = "disponibilidad.html";

/* ===== STATE ===== */
const state = {};
function norm(k){
  state[k] ??= { online:false, viladecans:false, badalona:false };
}

/* ===== RENDER ===== */
function render(){
  grid.innerHTML = "";
  grid.appendChild(document.createElement("div"));

  LABELS.forEach(l=>{
    const d = document.createElement("div");
    d.className="day"; d.textContent=l;
    grid.appendChild(d);
  });

  HOURS.forEach(h=>{
    const hl=document.createElement("div");
    hl.className="hour"; hl.textContent=`${h}:00`;
    grid.appendChild(hl);

    DAYS.forEach(d=>{
      const k = `${d}_${h}`;
      norm(k);

      const s = document.createElement("div");
      s.className="slot";

      ["online","viladecans","badalona"].forEach(m=>{
        const b=document.createElement("button");
        b.className=`mode ${state[k][m]?"on":""}`;
        b.textContent =
          m==="online" ? "Online" : m==="viladecans" ? "Vila" : "Bada";

        b.onclick = () => {
          if(m!=="online"){
            state[k].viladecans=false;
            state[k].badalona=false;
          }
          state[k][m] = !state[k][m];
          render();
        };

        s.appendChild(b);
      });

      grid.appendChild(s);
    });
  });
}

/* ===== AUTH SAFE ===== */
onAuthStateChanged(auth, async (user)=>{
  if(!user) return;

  const ref = doc(db,"availability",`${user.uid}_${weekKey}`);
  const snap = await getDoc(ref);

  if(snap.exists()){
    Object.assign(state, snap.data().slots || {});
  }
  Object.keys(state).forEach(norm);
  render();

  save.onclick = async () => {
    await setDoc(ref,{
      therapistId: user.uid,
      weekStart: weekKey,
      slots: state,
      updatedAt: serverTimestamp()
    });
    alert("Disponibilidad guardada");
  };
});
