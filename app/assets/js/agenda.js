import { auth, db } from "./firebase.js";
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const agenda = document.getElementById("agenda");
const modal = document.getElementById("modal");

let currentDate = new Date();
let currentSlotHour = null;
let editingId = null;

/* ===== FECHA ===== */
function renderDate(){
  dayLabel.textContent =
    currentDate.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
}

prevDay.onclick = ()=>{ currentDate.setDate(currentDate.getDate()-1); load(); };
nextDay.onclick = ()=>{ currentDate.setDate(currentDate.getDate()+1); load(); };
today.onclick   = ()=>{ currentDate=new Date(); load(); };

/* ===== LOAD ===== */
async function load(){
  renderDate();
  agenda.innerHTML = "";

  const start = new Date(currentDate);
  start.setHours(0,0,0,0);

  const end = new Date(start);
  end.setDate(end.getDate()+1);

  const snap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",auth.currentUser.uid),
    where("start",">=",Timestamp.fromDate(start)),
    where("start","<",Timestamp.fromDate(end))
  ));

  const byHour = {};
  snap.forEach(d=>{
    byHour[d.data().start.toDate().getHours()] = {...d.data(), id:d.id};
  });

  for(let h=9;h<21;h++){
    const div=document.createElement("div");
    div.className="slot "+(byHour[h]?"busy":"free");
    div.innerHTML=`
      <div class="time">${h}:00</div>
      <div>${byHour[h]?.patientName || "Libre"}</div>
    `;
    div.onclick=()=>openModal(h, byHour[h] || null);
    agenda.appendChild(div);
  }
}

load();

/* ===== MODAL ===== */
window.closeModal = ()=>{
  modal.style.display="none";
  editingId=null;
};

function openModal(hour, data){
  currentSlotHour = hour;
  modal.style.display="block";

  pSearch.value="";
  pName.value="";
  modality.value="";
  completed.checked=false;

  if(data){
    editingId=data.id;
    pName.value=data.patientName;
    modality.value=data.modality;
    completed.checked=data.status==="completed";
  }
}

/* ===== AUTOCOMPLETE ===== */
pSearch.oninput = async ()=>{
  const q = pSearch.value.trim().toLowerCase();
  if(q.length<2) return;

  const snap = await getDocs(collection(db,"patients"));
  snap.forEach(d=>{
    const name=(d.data().fullName||"").toLowerCase();
    if(name.includes(q)){
      pName.value=d.data().fullName;
    }
  });
};

/* ===== SAVE ===== */
save.onclick = async ()=>{
  const base = new Date(currentDate);
  base.setHours(currentSlotHour,0,0,0);

  const data = {
    therapistId: auth.currentUser.uid,
    patientName: pName.value,
    modality: modality.value,
    start: Timestamp.fromDate(base),
    end: Timestamp.fromDate(new Date(base.getTime()+3600000)),
    status: completed.checked?"completed":"scheduled"
  };

  if(editingId){
    await updateDoc(doc(db,"appointments",editingId), data);
  }else{
    await addDoc(collection(db,"appointments"), data);
  }

  closeModal();
  load();
};

/* ===== WHATSAPP ===== */
whatsapp.onclick = ()=>{
  const msg = encodeURIComponent(
    `Hola ${pName.value}, tu cita es el ${currentDate.toLocaleDateString()} a las ${currentSlotHour}:00`
  );
  window.open(`https://wa.me/?text=${msg}`);
};
