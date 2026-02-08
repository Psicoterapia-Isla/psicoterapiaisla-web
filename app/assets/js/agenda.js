import { auth, db } from "./firebase.js";
import {
  collection, getDocs, addDoc, updateDoc, doc,
  query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const { jsPDF } = window.jspdf;

let uid=null, currentDate=new Date(), hour=null, editing=null;

/* DOM */
const agenda=document.getElementById("agenda");
const modal=document.getElementById("modal");
const dayLabel=document.getElementById("dayLabel");

const search=document.getElementById("search");
const nameI=document.getElementById("name");
const phone=document.getElementById("phone");
const modality=document.getElementById("modality");
const done=document.getElementById("done");
const paid=document.getElementById("paid");
const amount=document.getElementById("amount");

/* NAV */
prev.onclick=()=>{currentDate.setDate(currentDate.getDate()-1);load()};
next.onclick=()=>{currentDate.setDate(currentDate.getDate()+1);load()};
today.onclick=()=>{currentDate=new Date();load()};
new.onclick=()=>openModal();

/* AUTH SAFE */
onAuthStateChanged(auth,u=>{
  if(!u) return;
  uid=u.uid;
  load();
});

/* LOAD DAY */
async function load(){
  if(!uid) return;
  agenda.innerHTML="";
  dayLabel.textContent=currentDate.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  const start=new Date(currentDate);start.setHours(0,0,0,0);
  const end=new Date(start);end.setDate(end.getDate()+1);

  const snap=await getDocs(query(
    collection(db,"appointments"),
    where("therapistId","==",uid),
    where("start",">=",Timestamp.fromDate(start)),
    where("start","<",Timestamp.fromDate(end))
  ));

  const byHour={};
  snap.forEach(d=>byHour[d.data().start.toDate().getHours()]={...d.data(),id:d.id});

  for(let h=9;h<21;h++){
    const s=document.createElement("div");
    s.className="slot "+(byHour[h]?"busy":"free");
    s.innerHTML=`<div class="time">${h}:00</div><div>${byHour[h]?.patientName||"Libre"}</div>`;
    s.onclick=()=>openModal(h,byHour[h]);
    agenda.appendChild(s);
  }
}

/* MODAL */
function openModal(h=null,data=null){
  hour=h;
  editing=data?.id||null;
  modal.style.display="block";
  search.value=nameI.value=phone.value=amount.value="";
  modality.value="";
  done.checked=paid.checked=false;

  if(data){
    nameI.value=data.patientName;
    phone.value=data.patientId||"";
    modality.value=data.modality;
    done.checked=data.status==="completed";
    paid.checked=!!data.invoiceId;
  }
}

close.onclick=()=>modal.style.display="none";

/* AUTOCOMPLETE LIVE */
search.oninput=async()=>{
  const q=search.value.toLowerCase();
  if(q.length<2) return;
  const snap=await getDocs(collection(db,"patients"));
  snap.forEach(d=>{
    const p=d.data();
    if(
      p.fullName?.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    ){
      nameI.value=p.fullName;
      phone.value=p.phone;
    }
  });
};

/* SAVE */
save.onclick=async()=>{
  const base=new Date(currentDate);
  base.setHours(hour||9,0,0,0);

  const payload={
    therapistId:uid,
    patientName:nameI.value,
    patientId:phone.value,
    modality:modality.value,
    start:Timestamp.fromDate(base),
    end:Timestamp.fromDate(new Date(base.getTime()+3600000)),
    status:done.checked?"completed":"scheduled"
  };

  let id=editing;
  if(id){
    await updateDoc(doc(db,"appointments",id),payload);
  }else{
    const r=await addDoc(collection(db,"appointments"),payload);
    id=r.id;
  }

  if(paid.checked){
    const inv=await addDoc(collection(db,"invoices"),{
      therapistId:uid,
      appointmentId:id,
      patientName:nameI.value,
      amount:Number(amount.value||0),
      issued:true,
      issuedAt:Timestamp.now()
    });
    await updateDoc(doc(db,"appointments",id),{invoiceId:inv.id});
  }

  modal.style.display="none";
  load();
};

/* PDF */
pdf.onclick=()=>{
  const doc=new jsPDF();
  doc.text(`Factura`,10,10);
  doc.text(`Paciente: ${nameI.value}`,10,20);
  doc.text(`Importe: ${amount.value} €`,10,30);
  doc.save("factura.pdf");
};

/* WHATSAPP */
whatsapp.onclick=()=>{
  const msg=encodeURIComponent(
    `Hola ${nameI.value}, tu cita es el ${currentDate.toLocaleDateString()} a las ${hour}:00`
  );
  window.open(`https://wa.me/${phone.value}?text=${msg}`);
};
