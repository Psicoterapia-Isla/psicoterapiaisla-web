import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ==============================
   CONFIGURACIÓN REAL FIREBASE
============================== */

const firebaseConfig = {
  apiKey: "AIzaSyDfxdzl39Ne4XdT9WgSlziSIiyg-xBR84",
  authDomain: "psicoterapia-isla-app.firebaseapp.com",
  projectId: "psicoterapia-isla-app",
  storageBucket: "psicoterapia-isla-app.firebasestorage.app",
  messagingSenderId: "824485435208",
  appId: "1:824485435208:web:79d2a122d975e2b5cf857d",
  measurementId: "G-9W5Y8BPBDE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ==============================
   SCORE DE PRIORIDAD
============================== */

function scorePatient(p) {
  let score = 0;

  if (p.telefono) score += 10;
  if (p.dni) score += 5;
  if (p.fechaNacimiento) score += 5;
  if (p.email) score += 3;
  if (p.userId) score += 3;
  if (p.direccion) score += 2;

  return score;
}

/* ==============================
   FUSIÓN DE DATOS
============================== */

function mergeData(base, duplicate) {
  const merged = { ...base };

  for (const key in duplicate) {
    if (!merged[key] && duplicate[key]) {
      merged[key] = duplicate[key];
    }
  }

  return merged;
}

/* ==============================
   LIMPIEZA PRINCIPAL
============================== */

async function cleanDuplicatePatients() {

  console.log("Buscando duplicados...");

  const snap = await getDocs(collection(db, "patients_normalized"));

  const map = {};

  snap.forEach(d => {
    const p = d.data();
    const key =
      `${(p.nombre || "").trim().toLowerCase()}_` +
      `${(p.apellidos || "").trim().toLowerCase()}`;

    if (!map[key]) map[key] = [];
    map[key].push({ id: d.id, ...p });
  });

  for (const key in map) {

    if (map[key].length <= 1) continue;

    console.log("Duplicado encontrado:", key);

    const sorted = map[key].sort(
      (a, b) => scorePatient(b) - scorePatient(a)
    );

    const keep = sorted[0];

    console.log("Se conservará:", keep.id);

    for (let i = 1; i < sorted.length; i++) {

      const duplicate = sorted[i];

      console.log("Fusionando:", duplicate.id, "→", keep.id);

      const merged = mergeData(keep, duplicate);

      await updateDoc(
        doc(db, "patients_normalized", keep.id),
        merged
      );

      // Reasignar citas
      const apptSnap = await getDocs(
        query(
          collection(db, "appointments"),
          where("patientId", "==", duplicate.id)
        )
      );

      for (const a of apptSnap.docs) {
        await updateDoc(
          doc(db, "appointments", a.id),
          { patientId: keep.id }
        );
      }

      // Reasignar facturas
      const invSnap = await getDocs(
        query(
          collection(db, "invoices"),
          where("patientId", "==", duplicate.id)
        )
      );

      for (const inv of invSnap.docs) {
        await updateDoc(
          doc(db, "invoices", inv.id),
          { patientId: keep.id }
        );
      }

      await deleteDoc(
        doc(db, "patients_normalized", duplicate.id)
      );

      console.log("Eliminado:", duplicate.id);
    }
  }

  console.log("✔ Limpieza finalizada");
}

cleanDuplicatePatients();
