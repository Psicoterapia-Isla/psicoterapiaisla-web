const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

const CLINIC_ID = "psicoterapia-isla";

async function migrate() {

  const snap = await db.collection("patients_normalized").get();

  if (snap.empty) {
    console.log("No hay pacientes para migrar");
    return;
  }

  const batch = db.batch();

  snap.forEach(doc => {
    batch.update(doc.ref, {
      clinicId: CLINIC_ID
    });
  });

  await batch.commit();

  console.log(`Migración completada: ${snap.size} pacientes actualizados`);
}

migrate().catch(err => {
  console.error("Error en migración:", err);
});
