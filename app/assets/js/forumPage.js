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
   SIN TEMA
========================= */
if (!topicId) {
  if (form) form.style.display = "none";
  if (postsContainer) postsContainer.innerHTML = "";
  return;
}

/* =========================
   LIMPIEZA UI
========================= */
if (placeholder) placeholder.remove();
if (form) form.style.display = "block";
postsContainer.innerHTML = "";

/* =========================
   REFERENCIA POSTS
========================= */
const postsRef = collection(
  db,
  FORUMS_COLLECTION,
  FORUM_ID,
  TOPICS_COLLECTION,
  topicId,
  POSTS_COLLECTION
);

const postsQuery = query(
  postsRef,
  orderBy("createdAt", "asc")
);

/* =========================
   AUTH → LUEGO LISTENER
========================= */
const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // 🔐 rol REAL
  const snap = await getDoc(doc(db, "users", user.uid));
  const isTherapist = snap.exists() && snap.data().role === "therapist";

  /* =========================
     LISTAR POSTS (YA CON AUTH)
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
         ELIMINAR (SOLO TERAPEUTA)
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
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  const content = textarea.value.trim();
  if (!content) return;

  await addDoc(postsRef, {
    content,
    authorId: user.uid,
    authorRole: "patient", // se corrige arriba si es terapeuta
    createdAt: serverTimestamp()
  });

  textarea.value = "";
});
