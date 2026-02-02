import { db } from "./firebase.js";
import { FORUM_ID } from "./forumConfig.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const container = document.getElementById("forum-posts");
const form = document.getElementById("new-post-form");
const textarea = document.getElementById("post-content");

const auth = getAuth();

/* =========================
   LISTEN POSTS (SAFE)
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const postsQuery = query(
    collection(db, "forums", FORUM_ID, "posts"),
    orderBy("createdAt", "asc")
  );

  onSnapshot(
    postsQuery,
    (snapshot) => {
      container.innerHTML = "";

      snapshot.forEach(doc => {
        const post = doc.data();

        const el = document.createElement("article");
        el.className = "forum-post card";

        el.innerHTML = `
          <div class="forum-post-meta">
            ${post.authorRole === "therapist" ? "🟢 Terapeuta" : "👤 Usuario"}
          </div>
          <p class="forum-post-content">
            ${post.content}
          </p>
        `;

        container.appendChild(el);
      });
    },
    (error) => {
      console.error("Error leyendo posts del foro:", error);
    }
  );
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

  await addDoc(
    collection(db, "forums", FORUM_ID, "posts"),
    {
      content,
      authorId: user.uid,
      authorRole: "therapist",
      createdAt: serverTimestamp(),
      isClosed: false,
      isHidden: false,
      reportedCount: 0
    }
  );

  textarea.value = "";
});
