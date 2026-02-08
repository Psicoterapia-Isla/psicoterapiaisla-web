import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { auth, db } from "./firebase.js";

import {
  collection, query, where, getDocs, addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

await requireAuth();
await loadMenu();

const agenda = document.getElementById("agenda");
const modal = document.getElementById("modal");

const phone = document.getElementById("phone");
const nameI = document.getElementById("name");
const phoneSug = document.getElementById("phoneSug");
const nameSug = document.getElementById("nameSug");

const startI = document.getElementById("start");
const endI = document.getElementById("end");
const amountI = document.getElementById("amount");
const paidI = document.getElementById("paid");
const modalityI = document.getElementById("modality");

let currentDate = new Date();
currentDate.setHours(0,0,0,0);

function renderHours() {
  agenda.innerHTML = "";
  for (let h = 9; h <= 20; h++) {
    const hour = document.createElement("div");
    hour.className = "hour";
    hour.textContent = `${h}:00`;

    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.hour = h;

    slot.addEventListener("click", () => {
      startI.value = `${String(h).padStart(2,"0")}:00`;
      endI.value = `${String(h+1).padStart(2,"0")}:00`;
      modal.classList.add("open");
    });

    agenda.append(hour, slot);
  }
}

renderHours();

document.getElementById("newCita").addEventListener("click", ()=>{
  modal.classList.add("open");
});

document.getElementById("close").addEventListener("click", ()=>{
  modal.classList.remove("open");
});

async function autocomplete(input, targetDiv, field) {
  targetDiv.innerHTML = "";
  if (input.length < 1) return;

  const q = query(
    collection(db,"patients"),
    where(field, ">=", input),
    where(field, "<=", input + "\uf8ff")
  );

  const snap = await getDocs(q);
  snap.forEach(d=>{
    const div = document.createElement("div");
    div.textContent = d.data()[field];
    div.onclick = ()=>{
      if(field==="phone") phone.value = d.data().phone;
      nameI.value = d.data().name;
      targetDiv.innerHTML="";
    };
    targetDiv.appendChild(div);
  });
}

phone.addEventListener("input", e=>{
  autocomplete(e.target.value, phoneSug, "phone");
});

nameI.addEventListener("input", e=>{
  autocomplete(e.target.value, nameSug, "name");
});

document.getElementById("save").addEventListener("click", async ()=>{
  const user = auth.currentUser;

  const dateStart = new Date(currentDate);
  const [sh, sm] = startI.value.split(":");
  dateStart.setHours(sh, sm);

  const dateEnd = new Date(currentDate);
  const [eh, em] = endI.value.split(":");
  dateEnd.setHours(eh, em);

  const ref = await addDoc(collection(db,"appointments"),{
    therapistId: user.uid,
    phone: phone.value,
    name: nameI.value,
    modality: modalityI.value,
    start: Timestamp.fromDate(dateStart),
    end: Timestamp.fromDate(dateEnd),
    amount: Number(amountI.value || 0),
    paid: paidI.checked,
    createdAt: Timestamp.now()
  });

  if(paidI.checked){
    const msg = encodeURIComponent(
      `Hola ${nameI.value}, tu sesión ha sido registrada.\nGracias.\nPsicoterapia Isla`
    );
    window.open(`https://wa.me/${phone.value}?text=${msg}`,"_blank");
  }

  modal.classList.remove("open");
  location.reload();
});
