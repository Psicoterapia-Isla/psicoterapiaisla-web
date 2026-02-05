import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(async () => {
  console.log("🔄 Normalizando patients → patients_normalized");

  const snapshot = await getDocs(collection(db, "patients"));
  let count = 0;

  for (const snap of snapshot.docs) {
    const data = snap.data();

    const normalized = {
      nombre: data.first_name || data.name || "",
      apellidos: data.last_name || data.surname || "",
      email: data.email || "",
      telefono: data.phone || "",
      dni: data.document_number || data.dni || "",
      linkedUserUid: data.user_uid || null,
      source: "import",
      createdAt: data.createdAt || null
    };

    await setDoc(
      doc(db, "patients_normalized", snap.id),
      normalized,
      { merge: true }
    );

    count++;
  }

  console.log(`✅ Normalización completa: ${count} pacientes`);
  alert(`Normalización completa: ${count} pacientes`);
})();
