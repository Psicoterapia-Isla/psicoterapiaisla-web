import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(async () => {
  console.log("🧼 Normalizando pacientes históricos");

  const snapshot = await getDocs(collection(db, "patients"));

  let count = 0;

  for (const d of snapshot.docs) {
    const data = d.data();

    const normalized = {
      nombre:
        data.nombre ??
        data.first_name ??
        data.name ??
        "",

      apellidos:
        data.apellidos ??
        data.last_name ??
        data.surname ??
        "",

      email:
        data.email ??
        data.email_address ??
        "",

      telefono:
        data.telefono ??
        data.phone ??
        data.phone_number ??
        "",

      dni:
        data.dni ??
        data.document_number ??
        "",

      linkedUserUid:
        data.linkedUserUid ??
        data.user_id ??
        null,

      source: "import",

      createdAt:
        data.createdAt ??
        data.created_at ??
        null
    };

    await setDoc(
      doc(db, "patients_normalized", d.id),
      normalized,
      { merge: true }
    );

    count++;
  }

  console.log(`✅ Normalización completa: ${count} pacientes`);
  alert(`Normalización completa: ${count} pacientes`);
})();
