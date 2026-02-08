import { auth, db } from "./firebase.js";
import {
  collection, query, where, orderBy,
  getDocs, doc, updateDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  invoiceAppointment,
  markInvoicePaid
} from "./appointment-manager.js";

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const list = document.getElementById("list");

let currentDate =
  new URLSearchParams(location.search).get("date")
  || new Date().toISOString().split("T")[0];

let currentApp = null;

/* ===== NAV ===== */
prev.onclick=()=>move(-1);
next.onclick=()=>move(1);
today.onclick=()=>location.href="agenda-diaria.html";

function move(d){
  const x=new Date(currentDate);
  x.setDate(x.getDate()+d);
  location.href=`agenda-diaria.html?date=${toISO(x)}`;
}

function toISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/* ===== MODAL ===== */
window.closeModal = () => modal.style.display="none";

function openModal(app){
  currentApp = app;

  const s = app.start.toDate();
  const e = app.end.toDate();

  mPatient.textContent = app.patientName;
  mTime.textContent = `${s.getHours()}:00 – ${e.getHours()}:00`;
  mDone.checked = app.status==="completed";

  modal.style.display="block";
}

/* ===== AUTH SAFE ===== */
onAuthStateChanged(auth, async (user)=>{
  if(!user) return;

  const base = new Date(currentDate);
  base.setHours(0,0,0,0);

  const snap = await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",user.uid),
    where("start",">=",Timestamp.fromDate(base)),
    where("start","<",Timestamp.fromDate(new Date(base.getTime()+86400000))),
    orderBy("start")
  ));

  list.innerHTML="";
  const byHour={};

  snap.forEach(d=>{
    byHour[d.data().start.toDate().getHours()] =
      {...d.data(),id:d.id};
  });

  for(let h=9;h<21;h++){
    const div=document.createElement("div");

    if(byHour[h]){
      const a=byHour[h];
      div.className="slot busy";
      div.innerHTML=`<strong>${h}:00</strong> ${a.patientName}`;
      div.onclick=()=>openModal(a);
    } else {
      div.className="slot free";
      div.innerHTML=`<strong>${h}:00</strong> Libre`;
    }

    list.appendChild(div);
  }
});

/* ===== SAVE ===== */
mSave.onclick = async ()=>{
  if(!currentApp) return;

  await updateDoc(
    doc(db,"appointments",currentApp.id),
    {
      status: mDone.checked ? "completed":"scheduled",
      completedAt: mDone.checked ? Timestamp.now():null
    }
  );

  if(mPaid.checked && currentApp.invoiceId){
    await markInvoicePaid(currentApp.invoiceId,mPayment.value);
  }

  location.reload();
};

/* ===== FACTURA ===== */
mInvoice.onclick = async ()=>{
  if(!currentApp || currentApp.invoiceId) return;

  await invoiceAppointment(currentApp,{
    amount:Number(mAmount.value),
    paymentMethod:mPayment.value,
    paid:mPaid.checked
  });

  location.reload();
};
