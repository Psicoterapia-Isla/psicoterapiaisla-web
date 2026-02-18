import { requireAuth } from "./auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
    throw new Error("Documento de usuario no existe en Firestore");
  }

  const userData = userSnap.data();

  console.log("UserData:", userData);

  const clinicId = userData.activeClinicId;

  if (!clinicId) {
    throw new Error("activeClinicId no definido en usuario");
  }

  if (!Array.isArray(userData.clinicIds)) {
    throw new Error("clinicIds no es un array en usuario");
  }

  if (!userData.clinicIds.includes(clinicId)) {
    throw new Error("activeClinicId no está dentro de clinicIds");
  }

  contextCache = {
    clinicId,
    role: userData.role || "therapist",
    user
  };

  return contextCache;
}