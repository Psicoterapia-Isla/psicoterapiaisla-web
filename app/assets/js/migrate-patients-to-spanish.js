const snapshot = await getDocs(collection(db, "patients"));

for (const docSnap of snapshot.docs) {
  const data = docSnap.data();

  const updates = {
    nombre: data.first_name ?? data.name ?? "",
    apellidos: data.last_name ?? data.surname ?? "",
    email: data.email ?? "",
    telefono: data.phone ?? "",
    dni: data.document_number ?? "",
  };

  // eliminar campos antiguos
  const deletes = {
    first_name: deleteField(),
    last_name: deleteField(),
    surname: deleteField(),
    phone: deleteField(),
    document_number: deleteField(),
  };

  await updateDoc(docSnap.ref, {
    ...updates,
    ...deletes
  });
}
