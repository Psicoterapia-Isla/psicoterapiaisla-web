import { requireAuth } from "./auth.js";

let contextCache = null;

// 🔹 Clinic fija actual (porque solo tienes una)
const DEFAULT_CLINIC_ID = "psicoterapia-isla";

export async function getClinicContext() {
  if (contextCache) return contextCache;

  const user = await requireAuth();

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  const clinicId = DEFAULT_CLINIC_ID;

  contextCache = { clinicId, user };
  return contextCache;
}

// Compatibilidad con agenda.js
export async function getCurrentClinicId() {
  const { clinicId } = await getClinicContext();
  return clinicId;
}
