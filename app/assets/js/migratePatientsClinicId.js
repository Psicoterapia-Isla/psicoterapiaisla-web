const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const CLINIC_ID = "PON_AQUI_TU_CLINIC_ID";

async function migrate() {

  const snap = await db.collection("patients_normalized").get();

  const batch = db.batch();

  snap.forEach(doc => {
    batch.update(doc.ref, {
      clinicId: CLINIC_ID
    });
  });

  await batch.commit();

  console.log("Migración completada correctamente");
}

migrate();
