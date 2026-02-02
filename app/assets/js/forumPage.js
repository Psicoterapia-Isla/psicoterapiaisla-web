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
   PARAMS
========================= */
const params = new URLSearchParams(window.location.search);
const topicId = params.get("topic");

/* =========================
   SIN TEMA → SOLO MENSAJE
========================= */
if (!topicId) {
  if (form) form.style.display = "none";
  if (postsContainer) postsContainer.innerHTML = "";
  return;
}

/* =========================
   CON TEMA → LIMPIAR UI
========================= */
if (placeholder) placeholder.remove();
if (form) form.style.display = "block";
postsContainer.innerHTML = "";

/* =========================
   REFERENCIAS
========================= */
const topicRef = doc(
  db,
  FORUMS_COLLECTION,
  FORUM_ID,
  TOPICS_COLLECTION,
  topicId
);

const postsRef = collection(
  db,
  FORUMS_COLLECTION,
  FORUM_ID,
  TOPICS_COLLECTION,
  topicId,
  POSTS_COLLECTION
);

const postsQuery = query(postsRef, orderBy("createdAt", "asc"));

/* =========================
   AUTH
========================= */
const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const isTherapist =
    userSnap.exists() && userSnap.data().role === "therapist";

  /* =========================
     CARGAR TEMA (ARRIBA)
  ========================= */
  const topicSnap = await getDoc(topicRef);

  if (topicSnap.exists()) {
    const topic = topicSnap.data();

    const topicHeader = document.createElement("section");
    topicHeader.className = "card forum-topic-header";

    topicHeader.innerHTML = `
      <h2>${topic.title}</h2>
      ${topic.description ? `<p>${topic.description}</p>` : ""}
    `;

    postsContainer.before(topicHeader);
  }

  /* =========================
     LISTAR MENSAJES (DEBAJO)
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

      if (isTherapist) {
        el
          .querySelector(".delete-post")
          .addEventListener("click", async () => {
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
   CREAR MENSAJE
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
    authorRole: "patient",
    createdAt: serverTimestamp()
  });

  textarea.value = "";
});
