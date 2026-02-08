import { auth, db } from "./firebase.js";
import {
  collection, query, where, orderBy,
  getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
today.onclick=()=>location.href="agenda-diaria.html";

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

  const byHour = {};
  snap.forEach(d=>{
    byHour[d.data().start.toDate().getHours()] =
      { ...d.data(), id:d.id };
  });

  list.innerHTML="";

  for(let h=9;h<21;h++){
    const div=document.createElement("div");

    if(byHour[h]){
      const a=byHour[h];
      div.className="slot busy";
      div.innerHTML=`<strong>${h}:00</strong> ${a.patientName}`;
    } else {
      div.className="slot free";
      div.innerHTML=`<strong>${h}:00</strong> Libre`;
      div.onclick=()=>openCreateModal(currentDate,h);
    }

    list.appendChild(div);
  }
});
