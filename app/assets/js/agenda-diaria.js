<script type="module">
  import { auth, db } from "./assets/js/firebase.js";
  import {
    collection,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

  const agendaDay = document.getElementById("agendaDay");

  const today = new Date();
  const date = today.toISOString().split("T")[0];

  const BASE_HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
  const user = auth.currentUser;
  const therapistId = user.uid;

  // =========================
  // CARGAR AGENDA DEL DÍA
  // =========================
  const q = query(
    collection(db, "agendaTerapeuta"),
    where("therapistId", "==", therapistId),
    where("date", "==", date)
  );

  const snap = await getDocs(q);

  const slots = {};
  snap.forEach(doc => {
    slots[doc.data().hour] = {
      id: doc.id,
      ...doc.data()
    };
  });

  // =========================
  // RENDER + CLICK
  // =========================
  BASE_HOURS.forEach(hour => {
    const data = slots[hour] || {
      status: "blocked",
      location: ""
    };

    const slot = document.createElement("div");
    slot.className = `time-slot ${data.status}`;

    slot.innerHTML = `
      <div class="slot-hour">${hour}:00</div>
      <div class="slot-body">
        <div>${data.status === "available" ? "Disponible" : "No disponible"}</div>
        <div class="location">${data.location || ""}</div>
      </div>
    `;

    slot.addEventListener("click", async () => {

      // ❌ No tocar citas reales
      if (data.status === "reserved" || data.status === "done") {
        return;
      }

      const nextStatus =
        data.status === "blocked" ? "available" : "blocked";

      // ➜ Ya existe documento → UPDATE
      if (data.id) {
        await updateDoc(
          collection(db, "agendaTerapeuta").doc(data.id),
          {
            status: nextStatus,
            updatedAt: serverTimestamp()
          }
        );
      }
      // ➜ No existe → CREATE
      else {
        await addDoc(collection(db, "agendaTerapeuta"), {
          therapistId,
          date,
          hour,
          status: nextStatus,
          location: "",
          patientId: null,
          patientName: null,
          invoiceId: null,
          updatedAt: serverTimestamp()
        });
      }

      // feedback visual inmediato
      slot.classList.remove("available", "blocked");
      slot.classList.add(nextStatus);
      slot.querySelector(".slot-body div").textContent =
        nextStatus === "available" ? "Disponible" : "No disponible";
    });

    agendaDay.appendChild(slot);
  });
</script>
