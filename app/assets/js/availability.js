import { db, auth } from "./firebase.js";
import { getClinicId } from "./clinic-context.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =====================================================
   FORMATO KEY DISPONIBILIDAD
   mon_9_0
   tue_10_30
===================================================== */

export function buildSlotKey(dayKey, hour, minute) {
  return `${dayKey}_${hour}_${minute}`;
}

/* =====================================================
   CARGAR DISPONIBILIDAD SEMANA
===================================================== */

export async function loadAvailability(weekStart) {

  const user = auth.currentUser;
  if (!user) return {};

  const clinicId = await getClinicId();

  const ref = doc(
    db,
    "clinics",
    clinicId,
    "availability",
    `${user.uid}_${weekStart}`
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) return {};

  return snap.data().slots || {};
}

/* =====================================================
   GUARDAR DISPONIBILIDAD COMPLETA
===================================================== */

export async function saveAvailability(weekStart, slotsObject) {

  const user = auth.currentUser;
  if (!user) return;

  const clinicId = await getClinicId();

  const ref = doc(
    db,
    "clinics",
    clinicId,
    "availability",
    `${user.uid}_${weekStart}`
  );

  await setDoc(ref, {
    therapistId: user.uid,
    weekStart,
    slots: slotsObject,
    updatedAt: new Date()
  });
}

/* =====================================================
   TOGGLE SLOT INDIVIDUAL
===================================================== */

export async function toggleSlot(weekStart, slotKey, isAvailable) {

  const user = auth.currentUser;
  if (!user) return;

  const clinicId = await getClinicId();

  const ref = doc(
    db,
    "clinics",
    clinicId,
    "availability",
    `${user.uid}_${weekStart}`
  );

  const snap = await getDoc(ref);

  let slots = {};

  if (snap.exists()) {
    slots = snap.data().slots || {};
  }

  if (isAvailable) {
    slots[slotKey] = true;
  } else {
    delete slots[slotKey];
  }

  await updateDoc(ref, {
    slots,
    updatedAt: new Date()
  });
}
