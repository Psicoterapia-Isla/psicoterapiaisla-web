import { auth, db } from "./firebase.js";
import { doc, getDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let activeClinicId = null;
let clinicData = null;

/* ================= INIT CLINIC CONTEXT ================= */

export async function loadClinicContext() {

  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Usuario sin documento en /users");
  }

  const userData = userSnap.data();

  if (!Array.isArray(userData.clinicIds) || userData.clinicIds.length === 0) {
    throw new Error("Usuario no vinculado a ninguna clínica");
  }

  // MVP: primera clínica como activa
  activeClinicId = userData.clinicIds[0];

  const clinicRef = doc(db, "clinics", activeClinicId);
  const clinicSnap = await getDoc(clinicRef);

  if (!clinicSnap.exists()) {
    throw new Error("Clínica no encontrada");
  }

  clinicData = clinicSnap.data();

  return {
    clinicId: activeClinicId,
    clinic: clinicData
  };
}

/* ================= GETTERS ================= */

export function getClinicId() {
  if (!activeClinicId) {
    throw new Error("Clinic context no cargado");
  }
  return activeClinicId;
}

export function getClinicData() {
  return clinicData;
}
