// app/assets/js/agendaFirestore.js

import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Devuelve la agenda completa de un terapeuta para un día:
 * - disponibilidad (agenda_slots)
 * - citas reales (appointments)
 */
export async function getAgendaForDay({
  therapistId,
  date // YYYY-MM-DD
}) {

  const dayStart = Timestamp.fromDate(new Date(`${date}T00:00:00`));
  const dayEnd   = Timestamp.fromDate(new Date(`${date}T23:59:59`));

  /* ======================
     DISPONIBILIDAD
  ====================== */
  const slotsQuery = query(
    collection(db, "agenda_slots"),
    where("therapistId", "==", therapistId),
    where("start", ">=", dayStart),
    where("start", "<=", dayEnd)
  );

  const slotsSnap = await getDocs(slotsQuery);
  const slots = slotsSnap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  /* ======================
     CITAS
  ====================== */
  const appointmentsQuery = query(
    collection(db, "appointments"),
    where("therapistId", "==", therapistId),
    where("start", ">=", dayStart),
    where("start", "<=", dayEnd)
  );

  const appointmentsSnap = await getDocs(appointmentsQuery);
  const appointments = appointmentsSnap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  return {
    slots,
    appointments
  };
}
