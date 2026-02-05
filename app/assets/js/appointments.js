import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

export async function createAppointment({
  patientId,
  therapistId,
  availabilityId,
  start,
  end
}) {
  const appointmentRef = await addDoc(
    collection(db, "appointments"),
    {
      patientId,
      therapistId,
      availabilityId,

      start,
      end,

      status: "reserved",
      billable: true,
      invoiceId: null,

      createdAt: serverTimestamp()
    }
  );

  // Bloquear slot
  await updateDoc(doc(db, "availability", availabilityId), {
    isBooked: true
  });

  return appointmentRef.id;
}
