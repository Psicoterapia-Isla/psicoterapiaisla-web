import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  FORUM_ID,
  FORUMS_COLLECTION,
  TOPICS_COLLECTION,
  POSTS_COLLECTION
} from "./forumConfig.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================
   DOM
========================= */
const postsContainer = document.getElementById("forum-posts");
const form = document.getElementById("new-post-form");
const textarea = document.getElementById("post-content");
const placeholder = document.getElementById("forum-placeholder");

/* =========================
   TEMA DESDE URL
========================= */
const params = new URLSearchParams(window.location.search);
const topicId = params.get("topic");

/* =========================
   AUTH
========================= */
const auth = getAuth();

/* =========================
   SIN TEMA → SOLO PLACEHOLDER
========================= */
if (!topicId) {
  if (form) form.style.display = "none";
  if (postsContainer) postsContainer.innerHTML = "";
  // ⚠️ NO return → el módulo sigue vivo
} else {
  if (placeholder) placeholder.remove();
  if (form) form.style.display = "block";
}

/* =========================
   SI NO HAY TEMA, NO SEGUIR
========================= */
if (!topicId) {
  // evitamos registrar listeners innecesarios
  console.info("Forum cargado sin tema seleccionado");
  // pero el archivo NO se rompe
}

/* =========================
   REFERENCIA POSTS
========================= */
let postsRef = null;
let postsQuery = null;

if (topicId) {
  postsRef = collection(
    db,
    FORUMS_COLLECTION,
    FORUM_ID,
    TOPICS_COLLECTION,
    topicId,
    POSTS_COLLECTION
  );

  postsQuery = query(postsRef, orderBy("createdAt", "asc"));
}

/* =========================
   AUTH → LISTENERS
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user || !topicId) return;

  // Obtener rol real
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const isTherapist =
    userSnap.exists() && userSnap.data().role === "therapist";

  /* =========================
     LISTAR POSTS
  ========================= */
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";

    if (snapshot.empty) {
      postsContainer.innerHTML = `
        <div class="card">
          <p>No hay mensajes todavía en este tema.</p>
        </div>
      `;
      return;
    }

    snapshot.forEach((docSnap) => {
      const post = docSnap.data();

      const el = document.createElement("article");
      el.className = "forum-post card";

      el.innerHTML = `
        <div class="forum-post-meta">
          ${post.authorRole === "therapist" ? "🟢 Terapeuta" : "👤 Usuario"}
        </div>

        <p>${post.content}</p>

        ${
          isTherapist
            ? `<button class="btn-danger delete-post">Eliminar</button>`
            : ""
        }
      `;

      /* =========================
         ELIMINAR POST (TERAPEUTA)
      ========================= */
      if (isTherapist) {
        el.querySelector(".delete-post").addEventListener("click", async () => {
          const ok = confirm("¿Eliminar este mensaje?");
          if (!ok) return;

          await deleteDoc(
            doc(
              db,
              FORUMS_COLLECTION,
              FORUM_ID,
              TOPICS_COLLECTION,
              topicId,
              POSTS_COLLECTION,
              docSnap.id
            )
          );
        });
      }

      postsContainer.appendChild(el);
    });
  });
});

/* =========================
   CREAR POST
========================= */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user || !topicId) return;

    const content = textarea.value.trim();
    if (!content) return;

    // detectar rol para guardar correctamente
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const role =
      userSnap.exists() && userSnap.data().role === "therapist"
        ? "therapist"
        : "patient";

    await addDoc(postsRef, {
      content,
      authorId: user.uid,
      authorRole: role,
      createdAt: serverTimestamp()
    });

    textarea.value = "";
  });
}
