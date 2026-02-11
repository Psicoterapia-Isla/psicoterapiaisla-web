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

/* 🔹 CONFIG FIREBASE */
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* 🔹 SCORE */
function scorePatient(p) {
  let score = 0;
  if (p.telefono) score += 10;
  if (p.dni) score += 5;
  if (p.fechaNacimiento) score += 5;
  if (p.email) score += 3;
  return score;
}

function mergeData(base, duplicate) {
  const merged = { ...base };
  for (const key in duplicate) {
    if (!merged[key] && duplicate[key]) {
      merged[key] = duplicate[key];
    }
  }
  return merged;
}

async function cleanDuplicates() {

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

    const sorted = map[key].sort((a,b) => scorePatient(b) - scorePatient(a));
    const keep = sorted[0];

    for (let i = 1; i < sorted.length; i++) {

      const duplicate = sorted[i];
      const merged = mergeData(keep, duplicate);

      await updateDoc(doc(db, "patients_normalized", keep.id), merged);

      const apptSnap = await getDocs(
        query(collection(db,"appointments"),
        where("patientId","==",duplicate.id))
      );

      for (const a of apptSnap.docs) {
        await updateDoc(doc(db,"appointments",a.id),{
          patientId: keep.id
        });
      }

      await deleteDoc(doc(db,"patients_normalized",duplicate.id));
    }
  }

  console.log("✔ Limpieza finalizada");
}

cleanDuplicates();
