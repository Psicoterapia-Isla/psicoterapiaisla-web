import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================================================
   CLINIC CONTEXT - MULTI CLINIC SAFE
===================================================== */

let cachedClinicId = null;

export async function getCurrentClinicId() {

  if (cachedClinicId) return cachedClinicId;

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists()) {
    throw new Error("Usuario no encontrado");
  }

  const userData = userSnap.data();

  if (!userData.activeClinicId) {
    throw new Error("Usuario sin clínica activa");
  }

  cachedClinicId = userData.activeClinicId;

  return cachedClinicId;
}
/* =====================================================
   GET CURRENT CLINIC ID
===================================================== */

export async function getCurrentClinicId() {
  if (!activeClinicId) {
    await loadClinicContext();
  }
  return activeClinicId;
}
