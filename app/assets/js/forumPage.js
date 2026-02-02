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

const params = new URLSearchParams(window.location.search);
const topicId = params.get("topic");

if (!topicId) {
  console.error("No topic seleccionado");
}

const container = document.getElementById("forum-posts");
const form = document.getElementById("new-post-form");
const textarea = document.getElementById("post-content");

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

  await addDoc(postsRef, {
    content: textarea.value.trim(),
    authorId: user.uid,
    authorRole: "therapist",
    createdAt: serverTimestamp()
  });

  textarea.value = "";
});
