import {
  collection,
  query,
  getDocs
} from "firebase/firestore";

import { db } from "./firebase.js";

export async function loadAppointments(clinicId) {
  if (!clinicId) throw new Error("clinicId requerido");

  const q = query(
    collection(db, "clinics", clinicId, "appointments")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
