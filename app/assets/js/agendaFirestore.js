import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function getAgendaForDay({
  therapistId,
  date
}) {
  const q = query(
    collection(db, "agenda_slots"),
    where("therapistId", "==", therapistId),
    where("date", "==", date)
  );

  const snap = await getDocs(q);

  const slots = {};
  snap.forEach(doc => {
    const data = doc.data();
    slots[data.hour] = { id: doc.id, ...data };
  });

  return slots;
}
