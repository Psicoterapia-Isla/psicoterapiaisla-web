import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function createAppointment({
  patientId,
  therapistId,
  start,
  end
}) {
  return await addDoc(collection(db, "appointments"), {
    patientId,
    therapistId,

    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),

    status: "reserved",
    billable: true,
    invoiceId: null,

    createdAt: serverTimestamp()
  });
}
