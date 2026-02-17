import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase.js";

export async function checkConflicts({ clinicId, start, end }) {
  const q = query(
    collection(db, "clinics", clinicId, "appointments"),
    where("start", "<", end),
    where("end", ">", start)
  );

  const snapshot = await getDocs(q);

  return !snapshot.empty;
}

export async function createAppointment({ clinicId, data }) {
  if (!clinicId) throw new Error("clinicId requerido");

  const hasConflict = await checkConflicts({
    clinicId,
    start: data.start,
    end: data.end
  });

  if (hasConflict) {
    throw new Error("Conflicto de horario detectado");
  }

  const colRef = collection(db, "clinics", clinicId, "appointments");

  await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp()
  });
}
