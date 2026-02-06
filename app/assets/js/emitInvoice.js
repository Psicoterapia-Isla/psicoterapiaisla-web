// app/assets/js/emitInvoice.js

import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Emite una factura (draft → issued)
 */
export async function emitInvoice(invoiceId) {
  if (!invoiceId) {
    throw new Error("invoiceId requerido");
  }

  await updateDoc(doc(db, "invoices", invoiceId), {
    status: "issued",        // draft → issued
    issued: true,
    issuedAt: serverTimestamp()
  });

  return true;
}
