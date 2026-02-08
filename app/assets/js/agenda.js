import { auth, db } from "./firebase.js";
import {
  collection, query, where,
  getDocs, addDoc, updateDoc,
  Timestamp, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const slotsDiv = document.getElementById("slots");
const dateLabel = document.getElementById("dateLabel");

let currentDate = new Date();
let editingId = null;

/* ===== INIT ===== */
auth.onAuthStateChanged(user => {
  if (!user) return;
  loadDay();
});

/* ===== NAV ===== */
prev.onclick = () => { currentDate.setDate(currentDate.getDate()-1); loadDay(); };
next.onclick = () => { currentDate.setDate(currentDate.getDate()+1); loadDay(); };
today.onclick = () => { currentDate = new Date(); loadDay(); };

/* ===== LOAD DAY ===== */
async function loadDay(){
  slotsDiv.innerHTML="";
  dateLabel.textContent =
    currentDate.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  const start = new Date(currentDate); start.setHours(0,0,0,0);
  const end   = new Date(start.getTime()+86400000);

  const snap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",auth.currentUser.uid),
    where("start",">=",Timestamp.fromDate(start)),
    where("start","<",Timestamp.fromDate(end))
  ));

  const byHour = {};
  snap.forEach(d=>{
    byHour[d.data().start.toDate().getHours()] = {...d.data(),id:d.id};
  });

  for(let h=9;h<21;h++){
    const div=document.createElement("div");
    div.className="slot";

    if(byHour[h]){
      const a=byHour[h];
      div.classList.add(a.status);
      div.innerHTML=`
        <div class="time">${h}:00</div>
        <div><strong>${a.patientName}</strong></div>
      `;
      div.onclick=()=>openEdit(a);
    } else {
      div.classList.add("free");
      div.innerHTML=`
        <div class="time">${h}:00</div>
        <div>Libre</div>
      `;
      div.onclick=()=>openCreate(h);
    }

    slotsDiv.appendChild(div);
  }
}

/* ===== MODAL ===== */
window.openCreate = (hour=null) => {
  editingId=null;
  modal.style.display="block";
  if(hour!==null){
    mStart.value=`${String(hour).padStart(2,"0")}:00`;
    mEnd.value=`${String(hour+1).padStart(2,"0")}:00`;
  }
};

window.openEdit = (a) => {
  editingId=a.id;
  modal.style.display="block";
  mPhone.value=a.patientId;
  mName.value=a.patientName;
  mStart.value=`${a.start.toDate().getHours()}:00`;
  mEnd.value=`${a.end.toDate().getHours()}:00`;
  mModality.value=a.modality;
  mStatus.value=a.status;
};

window.closeModal = () => modal.style.display="none";

/* ===== SAVE ===== */
window.save = async () => {
  const user=auth.currentUser;
  const base=new Date(currentDate);base.setHours(0,0,0,0);

  const [sh]=mStart.value.split(":");
  const [eh]=mEnd.value.split(":");

  const start=new Date(base);start.setHours(sh,0,0,0);
  const end=new Date(base);end.setHours(eh,0,0,0);

  const data={
    therapistId:user.uid,
    patientId:mPhone.value,
    patientName:mName.value,
    modality:mModality.value,
    status:mStatus.value,
    start:Timestamp.fromDate(start),
    end:Timestamp.fromDate(end)
  };

  if(editingId){
    await updateDoc(doc(db,"appointments",editingId),data);
  } else {
    await addDoc(collection(db,"appointments"),data);
  }

  closeModal();
  loadDay();
};
