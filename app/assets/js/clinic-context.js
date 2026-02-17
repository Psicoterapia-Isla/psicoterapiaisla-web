import { requireAuth } from "./auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { db } from "./firebase.js";

let contextCache = null;

export async function getClinicContext() {
  if (contextCache) return contextCache;

  const user = await requireAuth();

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("El usuario no existe en colección users");
  }

  const userData = userSnap.data();

  // 🔹 AQUÍ usamos tu modelo real
  const clinicId = userData.activeClinicId;

  if (!clinicId) {
    throw new Error("activeClinicId no definido en el usuario");
  }

  contextCache = {
    clinicId,
    role: userData.role,
    user
  };

  return contextCache;
}

export async function getCurrentClinicId() {
  const { clinicId } = await getClinicContext();
  return clinicId;
}
