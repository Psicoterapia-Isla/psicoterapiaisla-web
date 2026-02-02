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
   SIN TEMA → SOLO PLACEHOLDER
========================= */
if (!topicId) {
  if (form) form.style.display = "none";
  if (postsContainer) postsContainer.innerHTML = "";
  return;
}

/* =========================
   CON TEMA → LIMPIAR VISTA
========================= */
if (placeholder) placeholder.remove();
if (postsContainer) postsContainer.innerHTML = "";
if (form) form.style.display = "block";

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

const q = query(postsRef, orderBy("createdAt", "asc"));

/* =========================
   LISTAR POSTS (DEBAJO DEL TEMA)
========================= */
onSnapshot(q, (snapshot) => {
  postsContainer.innerHTML = "";

  snapshot.forEach(docSnap => {
    const post = docSnap.data();

    const el = document.createElement("article");
    el.className = "forum-post card";

    el.innerHTML = `
      <div class="forum-post-meta">
        ${post.authorRole === "therapist" ? "🟢 Terapeuta" : "👤 Usuario"}
      </div>
      <p>${post.content}</p>
    `;

    postsContainer.appendChild(el);
  });
});

/* =========================
   CREAR POST
========================= */
if (form) {
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
}
