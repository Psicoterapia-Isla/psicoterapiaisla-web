import { auth, db } from "./firebase.js";
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================
   ESTADO
========================= */
let userUID = null;
let currentDate = new Date();
let currentHour = null;
let editingId = null;

/* =========================
   DOM
========================= */
const agenda = document.getElementById("agenda");
const modal = document.getElementById("modal");

/* =========================
   FECHA
========================= */
function renderDate(){
  dayLabel.textContent =
    currentDate.toLocaleDateString("es-ES",{
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    });
}

prevDay.onclick = ()=>{ currentDate.setDate(currentDate.getDate()-1); loadDay(); };
nextDay.onclick = ()=>{ currentDate.setDate(currentDate.getDate()+1); loadDay(); };
today.onclick   = ()=>{ currentDate=new Date(); loadDay(); };

/* =========================
   AUTENTICACIÓN SEGURA
========================= */
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    console.warn("Usuario no autenticado");
    return;
  }

  userUID = user.uid;
  await loadDay();
});

/* =========================
   CARGAR AGENDA
========================= */
async function loadDay(){
  if(!userUID) return;

  renderDate();
  agenda.innerHTML = "";

  const start = new Date(currentDate);
  start.setHours(0,0,0,0);

  const end = new Date(start);
  end.setDate(end.getDate()+1);

  const snap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",userUID),
    where("start",">=",Timestamp.fromDate(start)),
    where("start","<",Timestamp.fromDate(end))
  ));

  const byHour = {};
  snap.forEach(d=>{
    byHour[d.data().start.toDate().getHours()] = {
      ...d.data(),
      id:d.id
    };
  });

  for(let h=9; h<21; h++){
    const slot = document.createElement("div");
    const app = byHour[h];

    slot.className = "slot " + (app ? "busy":"free");
    slot.innerHTML = `
      <div class="time">${h}:00</div>
      <div>${app ? app.patientName : "Libre"}</div>
    `;

    slot.onclick = ()=>openModal(h, app || null);
    agenda.appendChild(slot);
  }
}

/* =========================
   MODAL
========================= */
window.closeModal = ()=>{
  modal.style.display="none";
  editingId=null;
};

function openModal(hour, data){
  currentHour = hour;
  modal.style.display="block";

  pSearch.value="";
  pName.value="";
  modality.value="";
  completed.checked=false;
  editingId=null;

  if(data){
    editingId = data.id;
    pName.value = data.patientName;
    modality.value = data.modality;
    completed.checked = data.status === "completed";
  }
}

/* =========================
   AUTOCOMPLETE EN TIEMPO REAL
========================= */
pSearch.oninput = async ()=>{
  const q = pSearch.value.trim().toLowerCase();
  if(q.length < 2) return;

  const snap = await getDocs(collection(db,"patients"));
  for(const d of snap.docs){
    const name = (d.data().fullName || "").toLowerCase();
    if(name.includes(q)){
      pName.value = d.data().fullName;
      break;
    }
  }
};

/* =========================
   GUARDAR CITA
========================= */
save.onclick = async ()=>{
  if(!userUID) return;

  const base = new Date(currentDate);
  base.setHours(currentHour,0,0,0);

  const payload = {
    therapistId: userUID,
    patientName: pName.value.trim(),
    modality: modality.value,
    start: Timestamp.fromDate(base),
    end: Timestamp.fromDate(new Date(base.getTime()+3600000)),
    status: completed.checked ? "completed" : "scheduled"
  };

  if(editingId){
    await updateDoc(doc(db,"appointments",editingId), payload);
  }else{
    await addDoc(collection(db,"appointments"), payload);
  }

  closeModal();
  loadDay();
};

/* =========================
   WHATSAPP (SIN COSTE)
========================= */
whatsapp.onclick = ()=>{
  const msg = encodeURIComponent(
    `Hola ${pName.value}, tu cita es el ${currentDate.toLocaleDateString()} a las ${currentHour}:00`
  );
  window.open(`https://wa.me/?text=${msg}`);
};
