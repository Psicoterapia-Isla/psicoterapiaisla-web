import { db } from "./firebase.js";
import { FORUM_ID } from "./forumConfig.js";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const topicsList = document.getElementById("forum-topics");
const newTopicForm = document.getElementById("new-topic-form");
const titleInput = document.getElementById("topic-title");
const descriptionInput = document.getElementById("topic-description");

const auth = getAuth();

/* =========================
   LISTAR TEMAS
========================= */
const topicsRef = collection(db, "forums", FORUM_ID, "topics");
const topicsQuery = query(topicsRef, orderBy("createdAt", "asc"));

onSnapshot(topicsQuery, (snapshot) => {
  topicsList.innerHTML = "";

  snapshot.forEach(doc => {
    const topic = doc.data();

    const li = document.createElement("li");
    li.className = "forum-topic";

    li.innerHTML = `
      <strong>${topic.title}</strong><br />
      <small>${topic.description || ""}</small>
    `;

    topicsList.appendChild(li);
  });
});

/* =========================
   CREAR TEMA (TERAPEUTA)
========================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  newTopicForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    if (!title) return;

    await addDoc(topicsRef, {
      title,
      description: descriptionInput.value.trim(),
      createdBy: user.uid,
      createdAt: serverTimestamp()
    });

    titleInput.value = "";
    descriptionInput.value = "";
  });
});
