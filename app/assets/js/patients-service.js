import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  limit,
  serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase.js";

function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

export async function searchPatients({ clinicId, queryText }) {
  if (!clinicId) throw new Error("clinicId requerido");

  const normalized = normalizePhone(queryText);

  if (normalized.length < 3) return [];

  const q = query(
    collection(db, "clinics", clinicId, "patients"),
    where("phoneNormalized", ">=", normalized),
    where("phoneNormalized", "<=", normalized + "\uf8ff"),
    limit(5)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function getPatientByPhone({ clinicId, phone }) {
  if (!clinicId) throw new Error("clinicId requerido");

  const normalized = normalizePhone(phone);

  const q = query(
    collection(db, "clinics", clinicId, "patients"),
    where("phoneNormalized", "==", normalized),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  };
}

export async function createPatient({ clinicId, data }) {
  if (!clinicId) throw new Error("clinicId requerido");

  const normalized = normalizePhone(data.phoneRaw);

  const colRef = collection(db, "clinics", clinicId, "patients");

  const docRef = await addDoc(colRef, {
    ...data,
    phoneNormalized: normalized,
    createdAt: serverTimestamp()
  });

  return docRef.id;
}
