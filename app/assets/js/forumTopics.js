import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { FORUM_ID, FORUMS_COLLECTION, TOPICS_COLLECTION } from "./forumConfig.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

const topicsContainer = document.getElementById("forum-topics");
const form = document.getElementById("new-topic-form");
const titleInput = document.getElementById("topic-title");
const descInput = document.getElementById("topic-description");

/* =========================
   LISTAR TEMAS
========================= */
const topicsRef = collection(
  db,
  FORUMS_COLLECTION,
  FORUM_ID,
  TOPICS_COLLECTION
);

onSnapshot(topicsRef, (snapshot) => {
  topicsContainer.innerHTML = "";

  snapshot.forEach(doc => {
    const topic = doc.data();

    const el = document.createElement("article");
    el.className = "forum-topic card";

    el.innerHTML = `
      <h3>${topic.title}</h3>
      <p>${topic.description}</p>
      <button class="btn-secondary">Entrar</button>
    `;

    el.querySelector("button").onclick = () => {
      window.location.href = `/app/foro.html?topic=${doc.id}`;
    };

    topicsContainer.appendChild(el);
  });
});

/* =========================
   CREAR TEMA (TERAPEUTA)
========================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  await addDoc(topicsRef, {
    title: titleInput.value.trim(),
    description: descInput.value.trim(),
    createdBy: user.uid,
    createdAt: serverTimestamp()
  });

  titleInput.value = "";
  descInput.value = "";
});
