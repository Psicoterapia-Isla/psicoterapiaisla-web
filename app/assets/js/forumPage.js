import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  FORUM_ID,
  FORUMS_COLLECTION,
  TOPICS_COLLECTION,
  POSTS_COLLECTION
} from "./forumConfig.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

const container = document.getElementById("forum-posts");
const form = document.getElementById("new-post-form");
const textarea = document.getElementById("post-content");

/* =========================
   OBTENER TEMA DESDE URL
========================= */
const params = new URLSearchParams(window.location.search);
const topicId = params.get("topic");

/* =========================
   SI NO HAY TEMA → NO ROMPER
========================= */
if (!topicId) {
  console.warn("No hay tema seleccionado todavía");

  // Desactivar formulario
  if (form) form.style.display = "none";

  // Mensaje claro en la UI
  if (container) {
    container.innerHTML = `
      <div class="card">
        <p>Selecciona un tema del foro para ver los mensajes.</p>
      </div>
    `;
  }

  // ⛔ MUY IMPORTANTE: cortar aquí
  throw new Error("Forum sin topic (controlado)");
}

/* =========================
   REFERENCIA A POSTS
========================= */
const postsRef = collection(
  db,
  FORUMS_COLLECTION,
  FORUM_ID,
  TOPICS_COLLECTION,
  topicId,
  POSTS_COLLECTION
);

/* =========================
   LISTEN POSTS
========================= */
const q = query(postsRef, orderBy("createdAt", "asc"));

onSnapshot(q, (snapshot) => {
  container.innerHTML = "";

  snapshot.forEach(doc => {
    const post = doc.data();

    const el = document.createElement("article");
    el.className = "forum-post card";

    el.innerHTML = `
      <div class="forum-post-meta">
        ${post.authorRole === "therapist" ? "🟢 Terapeuta" : "👤 Usuario"}
      </div>
      <p>${post.content}</p>
    `;

    container.appendChild(el);
  });
});

/* =========================
   CREATE POST
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
    authorRole: "therapist",
    createdAt: serverTimestamp()
  });

  textarea.value = "";
});
