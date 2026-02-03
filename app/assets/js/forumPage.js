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
   DOM (cuando ya existe)
========================= */
document.addEventListener("DOMContentLoaded", () => {

  const postsContainer = document.getElementById("forum-posts");
  const form = document.getElementById("new-post-form");
  const textarea = document.getElementById("post-content");
  const placeholder = document.getElementById("forum-placeholder");

  if (!postsContainer || !form) return;

  /* =========================
     PARAMS
  ========================= */
  const params = new URLSearchParams(window.location.search);
  const topicId = params.get("topic");

  /* =========================
     SIN TEMA
  ========================= */
  if (!topicId) {
    form.style.display = "none";
    return;
  }

  /* =========================
     LIMPIAR UI INICIAL
  ========================= */
  if (placeholder) placeholder.remove();
  form.style.display = "block";
  postsContainer.innerHTML = "";

  /* =========================
     REFERENCIAS FIRESTORE
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
       CABECERA DEL TEMA (UNA SOLA VEZ)
    ========================= */
    const existingHeader = document.querySelector(".forum-topic-header");
    if (!existingHeader) {
      const topicSnap = await getDoc(topicRef);

      if (topicSnap.exists()) {
        const topic = topicSnap.data();

        const header = document.createElement("section");
        header.className = "card forum-topic-header";

        header.innerHTML = `
          <h2>${topic.title}</h2>
          ${topic.description ? `<p>${topic.description}</p>` : ""}
        `;

        postsContainer.before(header);
      }
    }

    /* =========================
       LISTAR MENSAJES
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
          el.querySelector(".delete-post")
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

    /* =========================
       CREAR MENSAJE
    ========================= */
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const content = textarea.value.trim();
      if (!content) return;

      await addDoc(postsRef, {
        content,
        authorId: user.uid,
        authorRole: isTherapist ? "therapist" : "patient",
        createdAt: serverTimestamp()
      });

      textarea.value = "";
    });
  });
});
