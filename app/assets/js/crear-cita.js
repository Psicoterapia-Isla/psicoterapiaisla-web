import { auth, db } from "./firebase.js";
import {
  addDoc, collection, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let userReady = null;

onAuthStateChanged(auth,u=>userReady=u);

window.openCreateModal = (dateISO, hour) => {
  window.__selectedDateISO = dateISO;
  document.getElementById("cStart").value = `${String(hour).padStart(2,"0")}:00`;
  document.getElementById("cEnd").value   = `${String(hour+1).padStart(2,"0")}:00`;
  document.getElementById("createModal").style.display = "block";
};

window.closeCreateModal = () => {
  document.getElementById("createModal").style.display = "none";
};

window.createAppointment = async () => {
  if(!userReady) return alert("No autenticado");

  const phone = cPatientPhone.value.trim();
  const name  = cPatientName.value.trim();
  const modality = cModality.value;
  const [sh] = cStart.value.split(":");
  const [eh] = cEnd.value.split(":");

  const base = new Date(window.__selectedDateISO);
  base.setHours(0,0,0,0);

  const start = new Date(base); start.setHours(sh,0,0,0);
  const end   = new Date(base); end.setHours(eh,0,0,0);

  await addDoc(collection(db,"appointments"),{
    therapistId: userReady.uid,
    patientId: phone,
    patientName: name,
    modality,
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    status:"scheduled",
    createdAt: serverTimestamp(),
    createdBy: userReady.uid
  });

  closeCreateModal();
  location.reload();
};
