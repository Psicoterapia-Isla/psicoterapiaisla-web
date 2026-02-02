import { listenForumPosts } from "./forum.js";
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const FORUM_ID = "aGuX3GfOqrglDg5cElpv";

const container = document.getElementById("forum-posts");
const form = document.getElementById("new-post-form");
const textarea = document.getElementById("post-content");

const auth = getAuth();

/* =========================
   RENDER POSTS
========================= */
listenForumPosts(posts => {
  container.innerHTML = "";

  posts.forEach(post => {
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
      authorRole: "therapist", // de momento fijo (tú)
      createdAt: serverTimestamp(),
      isClosed: false,
      isHidden: false,
      reportedCount: 0
    }
  );

  textarea.value = "";
});
