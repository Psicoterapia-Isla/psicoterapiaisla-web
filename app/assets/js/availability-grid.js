import { requireAuth } from "./auth.js";
import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

await requireAuth();

const therapistId = auth.currentUser.uid;
if (!therapistId) throw new Error("No autenticado");

/* CONFIG */
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABELS = ["L","M","X","J","V","S","D"];
const HOURS = Array.from({length:12},(_,i)=>i+9);

const grid = document.getElementById("availabilityGrid");
const saveBtn = document.getElementById("saveAvailability");

const slotsState = {};

/* SEMANA ACTUAL (LUNES) */
const now = new Date();
const monday = new Date(now);
monday.setDate(now.getDate() - ((now.getDay()+6)%7));
monday.setHours(12,0,0,0);

const weekKey = monday.toISOString().slice(0,10);
const docRef = doc(db,"availability",`${therapistId}_${weekKey}`);

/* RENDER */
function renderGrid(){
  grid.innerHTML = "";
  grid.appendChild(document.createElement("div"));

  DAY_LABELS.forEach(l=>{
    const d=document.createElement("div");
    d.className="day-label";
    d.textContent=l;
    grid.appendChild(d);
  });

  HOURS.forEach(hour=>{
    const hl=document.createElement("div");
    hl.className="hour-label";
    hl.textContent=`${hour}:00`;
    grid.appendChild(hl);

    DAYS.forEach(day=>{
      const key=`${day}_${hour}`;
      const slot=document.createElement("div");
      slot.className="slot";

      const data = slotsState[key];
      if(data){
        if(data.allowPresential && data.allowOnline){
          slot.classList.add("both");
          slot.innerHTML="<small>P+O</small>";
        } else if(data.allowPresential){
          slot.classList.add("presential");
          slot.innerHTML="<small>P</small>";
        } else if(data.allowOnline){
          slot.classList.add("online");
          slot.innerHTML="<small>O</small>";
        }
      }

      slot.onclick=()=>openSlotEditor(key);
      grid.appendChild(slot);
    });
  });
}

/* EDITOR SIMPLE (ciclo) */
function openSlotEditor(key){
  const current = slotsState[key];

  if(!current){
    slotsState[key]={
      location:"viladecans",
      allowPresential:true,
      allowOnline:false
    };
  } else if(current.allowPresential && !current.allowOnline){
    current.allowOnline=true;
  } else if(current.allowPresential && current.allowOnline){
    slotsState[key]={
      location:current.location,
      allowPresential:false,
      allowOnline:true
    };
  } else {
    delete slotsState[key];
  }

  renderGrid();
}

/* LOAD */
const snap = await getDoc(docRef);
if(snap.exists()){
  Object.assign(slotsState, snap.data().slots || {});
}

renderGrid();

/* SAVE */
saveBtn.onclick = async ()=>{
  await setDoc(docRef,{
    therapistId,
    weekStart: weekKey,
    slots: slotsState,
    updatedAt: serverTimestamp()
  });
  alert("Disponibilidad guardada");
};
