import { requireAuth } from "./auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { db } from "./firebase.js";

let contextCache = null;

export async function getClinicContext() {
  if (contextCache) return contextCache;

  const user = await requireAuth();

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  // Buscar clínica cuyo ownerUid sea el usuario actual
  const q = query(
    collection(db, "clinics"),
    where("ownerUid", "==", user.uid)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("No existe clínica asociada a este usuario");
  }

  const clinicDoc = snapshot.docs[0];
  const clinicId = clinicDoc.id;

  contextCache = { clinicId, user };
  return contextCache;
}

// Compatibilidad con agenda.js
export async function getCurrentClinicId() {
  const { clinicId } = await getClinicContext();
  return clinicId;
}
