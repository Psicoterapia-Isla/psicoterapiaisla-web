import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(async () => {
  console.log("🧠 Enriqueciendo patients_normalized desde users (todos válidos)");

  const snapshot = await getDocs(collection(db, "patients_normalized"));

  let updated = 0;
  let processed = 0;

  for (const snap of snapshot.docs) {
    const patient = snap.data();
    const updates = {};

    let user = null;

    // 🔹 Intentar obtener user si hay linkedUserUid
    if (patient.linkedUserUid) {
      const userSnap = await getDoc(
        doc(db, "users", patient.linkedUserUid)
      );
      if (userSnap.exists()) {
        user = userSnap.data();
      }
    }

    // 🔹 Enriquecimiento SOLO si el campo está vacío
    if ((!patient.email || patient.email === "") && user?.email) {
      updates.email = user.email;
    }

    if ((!patient.nombre || patient.nombre === "") && user?.displayName) {
      updates.nombre = user.displayName;
    }

    // 🔹 Cálculo de completitud (con o sin user)
    const fields = [
      updates.nombre ?? patient.nombre,
      updates.email ?? patient.email,
      patient.telefono,
      patient.dni
    ];

    const filled = fields.filter(v => v && v !== "").length;
    updates.completenessScore = Math.round((filled / 4) * 100);

    // 🔹 Guardar SIEMPRE (aunque solo cambie completenessScore)
    await updateDoc(snap.ref, updates);
    updated++;
    processed++;
  }

  console.log("✅ Enriquecimiento terminado");
  console.log("🟢 Procesados:", processed);
  console.log("🟢 Actualizados:", updated);

  alert(
    `Enriquecimiento completado\n` +
    `Procesados: ${processed}\n` +
    `Actualizados: ${updated}`
  );
})();
