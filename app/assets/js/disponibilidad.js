import { auth, db } from "./firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const DAYS=["mon","tue","wed","thu","fri","sat","sun"];
const LABELS=["L","M","X","J","V","S","D"];
const HOURS=[...Array(12)].map((_,i)=>i+9);

const grid=document.getElementById("grid");
const save=document.getElementById("save");
const weekKey=window.__weekKey;

onAuthStateChanged(auth, async (user)=>{
  if(!user) return;

  const ref=doc(db,"availability",`${user.uid}_${weekKey}`);
  const state={};

  function norm(k){
    state[k]??={online:false,viladecans:false,badalona:false};
  }

  function render(){
    grid.innerHTML="";
    grid.appendChild(document.createElement("div"));
    LABELS.forEach(l=>{
      const d=document.createElement("div");
      d.className="day"; d.textContent=l;
      grid.appendChild(d);
    });

    HOURS.forEach(h=>{
      const hl=document.createElement("div");
      hl.className="hour"; hl.textContent=`${h}:00`;
      grid.appendChild(hl);

      DAYS.forEach(d=>{
        const k=`${d}_${h}`; norm(k);
        const s=document.createElement("div");
        s.className="slot";

        ["online","viladecans","badalona"].forEach(m=>{
          const b=document.createElement("button");
          b.className=`mode ${state[k][m]?"on":""}`;
          b.textContent=m==="viladecans"?"Vila":m==="badalona"?"Bada":"Online";
          b.onclick=()=>{
            if(m!=="online"){
              state[k].viladecans=false;
              state[k].badalona=false;
            }
            state[k][m]=!state[k][m];
            render();
          };
          s.appendChild(b);
        });
        grid.appendChild(s);
      });
    });
  }

  const snap=await getDoc(ref);
  if(snap.exists()) Object.assign(state,snap.data().slots||{});
  Object.keys(state).forEach(norm);
  render();

  save.onclick=async()=>{
    await setDoc(ref,{
      therapistId:user.uid,
      weekStart:weekKey,
      slots:state,
      updatedAt:serverTimestamp()
    });
    alert("Disponibilidad guardada");
  };
});
