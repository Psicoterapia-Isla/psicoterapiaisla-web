document.addEventListener("DOMContentLoaded", () => {

  import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js")
    .then(({ getAuth, onAuthStateChanged }) => {

      import("./firebase.js").then(({ db }) => {

        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
          .then(({ collection, getDocs, doc, getDoc }) => {

            const searchInput = document.getElementById("patient-search");
            const listContainer = document.getElementById("patients-list");

            if (!searchInput || !listContainer) {
              console.error("❌ DOM no cargado");
              return;
            }

            const auth = getAuth();
            let allPatients = [];

            onAuthStateChanged(auth, async (user) => {
              if (!user) {
                window.location.href = "login.html";
                return;
              }

              const userSnap = await getDoc(doc(db, "users", user.uid));
              if (!userSnap.exists() || userSnap.data().role !== "admin") {
                alert("Acceso restringido");
                window.location.href = "index.html";
                return;
              }

              loadPatients();
            });

            async function loadPatients() {
              listContainer.innerHTML = "Cargando pacientes...";

              const snapshot = await getDocs(collection(db, "patients"));
              allPatients = snapshot.docs.map(d => d.data());

              renderPatients(allPatients);
            }

            function renderPatients(patients) {
              if (!patients.length) {
                listContainer.innerHTML = "No hay pacientes";
                return;
              }

              listContainer.innerHTML = patients.map(p => `
                <div class="patient-row">
                  <strong>${p.nombre || ""} ${p.apellidos || ""}</strong><br>
                  <small>DNI: ${p.dni || "-"} · Email: ${p.email || "-"}</small>
                </div>
              `).join("");
            }

            searchInput.addEventListener("input", () => {
              const q = searchInput.value.toLowerCase();
              renderPatients(
                allPatients.filter(p =>
                  (p.nombre || "").toLowerCase().includes(q) ||
                  (p.apellidos || "").toLowerCase().includes(q) ||
                  (p.email || "").toLowerCase().includes(q) ||
                  (p.dni || "").toLowerCase().includes(q)
                )
              );
            });

          });
      });
    });
});
