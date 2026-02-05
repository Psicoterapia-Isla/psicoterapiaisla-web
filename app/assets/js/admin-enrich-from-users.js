import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(async () => {
  console.log("🧠 Enriqueciendo patients_normalized desde users");

  const snapshot = await getDocs(collection(db, "patients_normalized"));

  let updated = 0;
  let skipped = 0;

  for (const snap of snapshot.docs) {
    const patient = snap.data();

    if (!patient.linkedUserUid) {
      skipped++;
      continue;
    }

    const userSnap = await getDoc(
      doc(db, "users", patient.linkedUserUid)
    );

    if (!userSnap.exists()) {
      skipped++;
      continue;
    }

    const user = userSnap.data();
    const updates = {};

    if ((!patient.email || patient.email === "") && user.email) {
      updates.email = user.email;
    }

    if ((!patient.nombre || patient.nombre === "") && user.displayName) {
      updates.nombre = user.displayName;
    }

    const fields = [
      updates.nombre ?? patient.nombre,
      updates.email ?? patient.email,
      patient.telefono,
      patient.dni
    ];

    const filled = fields.filter(v => v && v !== "").length;
    updates.completenessScore = Math.round((filled / 4) * 100);

    if (Object.keys(updates).length > 0) {
      await updateDoc(snap.ref, updates);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log("✅ Enriquecimiento terminado");
  console.log("🟢 Actualizados:", updated);
  console.log("⚪ Saltados:", skipped);

  alert(`Enriquecimiento desde users completado\nActualizados: ${updated}`);
})();
