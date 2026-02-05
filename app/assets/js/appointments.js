// app/assets/js/appointments.js

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Crea una cita REAL en Firestore
 */
export async function createAppointment({
  patientId,
  therapistId,
  start,
  end
}) {
  return await addDoc(collection(db, "appointments"), {
    patientId: patientId,
    therapistId: therapistId,

    start: start,        // Timestamp
    end: end,            // Timestamp

    status: "reserved",  // reserved | completed | cancelled
    billable: true,      // podrá facturarse
    invoiceId: null,     // se rellenará después

    createdAt: serverTimestamp()
  });
}
