import { auth, db } from "./firebase.js";
import {
  addDoc, collection, serverTimestamp, Timestamp, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let user=null;

onAuthStateChanged(auth,u=>user=u);

/* MODAL */
window.openCreateModal=(dateISO,hour)=>{
  window.__selectedDateISO=dateISO;
  cStart.value=`${String(hour).padStart(2,"0")}:00`;
  cEnd.value=`${String(hour+1).padStart(2,"0")}:00`;
  createModal.style.display="block";
};
window.closeCreateModal=()=>{
  createModal.style.display="none";
};

/* AUTOCOMPLETE */
cPatientPhone.oninput=async()=>{
  const phone=cPatientPhone.value.trim();
  if(!/^\d{9}$/.test(phone)) return;

  let snap=await getDoc(doc(db,"patients",phone));
  if(!snap.exists())
    snap=await getDoc(doc(db,"patients_normalized",phone));

  if(snap.exists()){
    const d=snap.data();
    cPatientName.value=d.fullName||
      [d.nombre,d.apellidos].filter(Boolean).join(" ");
    cPatientName.disabled=true;
  } else {
    cPatientName.disabled=false;
  }
};

/* CREATE */
window.createAppointment=async()=>{
  if(!user){alert("Auth no lista");return;}

  const base=new Date(window.__selectedDateISO);
  base.setHours(0,0,0,0);

  const [sh]=cStart.value.split(":");
  const [eh]=cEnd.value.split(":");

  const start=new Date(base); start.setHours(sh,0,0,0);
  const end=new Date(base);   end.setHours(eh,0,0,0);

  await addDoc(collection(db,"appointments"),{
    therapistId:user.uid,
    patientId:cPatientPhone.value.trim(),
    patientName:cPatientName.value.trim(),
    service:cService.value||"Sesión de psicoterapia",
    modality:cModality.value,
    start:Timestamp.fromDate(start),
    end:Timestamp.fromDate(end),
    status:"scheduled",
    createdAt:serverTimestamp(),
    createdBy:user.uid
  });

  closeCreateModal();
  location.reload();
};
