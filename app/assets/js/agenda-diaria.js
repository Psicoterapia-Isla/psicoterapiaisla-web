import { auth, db } from "./firebase.js";
import {
  collection, query, where, orderBy,
  getDocs, doc, updateDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const therapistId = auth.currentUser.uid;
const list = document.getElementById("list");

let currentDate =
  new URLSearchParams(location.search).get("date")
  || new Date().toISOString().split("T")[0];

function toISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/* ===== NAV ===== */
prev.onclick=()=>{
  const d=new Date(currentDate);d.setDate(d.getDate()-1);
  location.href=`agenda-diaria.html?date=${toISO(d)}`;
};
next.onclick=()=>{
  const d=new Date(currentDate);d.setDate(d.getDate()+1);
  location.href=`agenda-diaria.html?date=${toISO(d)}`;
};
today.onclick=()=>{
  location.href="agenda-diaria.html";
};

/* ===== HEADER ===== */
const base=new Date(currentDate);
base.setHours(0,0,0,0);

dayNum.textContent=base.getDate();
dayName.textContent=base.toLocaleDateString("es-ES",{weekday:"long"});
dayMonth.textContent=base.toLocaleDateString("es-ES",{month:"long",year:"numeric"});

/* ===== LOAD APPOINTMENTS ===== */
const snap = await getDocs(query(
  collection(db,"appointments"),
  where("therapistId","==",therapistId),
  where("start",">=",Timestamp.fromDate(base)),
  where("start","<",Timestamp.fromDate(new Date(base.getTime()+86400000))),
  orderBy("start")
));

const byHour = {};
snap.forEach(d=>{
  byHour[d.data().start.toDate().getHours()] =
    { ...d.data(), id:d.id };
});

/* ===== RENDER ===== */
let currentApp=null;

for(let h=9;h<21;h++){
  const div=document.createElement("div");

  if(byHour[h]){
    const a=byHour[h];
    div.className="slot busy";
    div.innerHTML=`
      <div class="time">${h}:00</div>
      <div>
        <strong>${a.patientName}</strong><br>
        <small>${a.modality}</small>
      </div>
    `;
    div.onclick=()=>openModal(a);
  } else {
    div.className="slot free";
    div.innerHTML=`
      <div class="time">${h}:00</div>
      <div>Libre</div>
    `;
  }

  list.appendChild(div);
}

/* ===== MODAL ===== */
window.closeModal=()=>modal.style.display="none";

function openModal(a){
  currentApp=a;
  mPatient.textContent=a.patientName;
  mTime.textContent=
    `${a.start.toDate().getHours()}:00 – ${a.end.toDate().getHours()}:00`;
  mDone.checked=a.status==="completed";
  modal.style.display="block";
}

/* ===== SAVE (🔥 AQUÍ FALLABA ANTES) ===== */
mSave.onclick=async()=>{
  if(!currentApp) return;

  await updateDoc(
    doc(db,"appointments",currentApp.id),
    {
      status: mDone.checked ? "completed" : "scheduled",
      completedAt: mDone.checked ? Timestamp.now() : null
    }
  );

  location.reload();
};
