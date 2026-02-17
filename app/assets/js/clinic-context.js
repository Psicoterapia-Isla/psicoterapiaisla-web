import { requireAuth } from "./auth.js";

let contextCache = null;

export async function getClinicContext() {
  if (contextCache) return contextCache;

  const user = await requireAuth();

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  const clinicId =
    user.clinicId ||
    user?.claims?.clinicId ||
    user?.customClaims?.clinicId;

  if (!clinicId) {
    throw new Error("ClinicId no disponible en el usuario");
  }

  contextCache = { clinicId, user };
  return contextCache;
}
