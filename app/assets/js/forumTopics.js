import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  FORUM_ID,
  FORUMS_COLLECTION,
  TOPICS_COLLECTION
} from "./forumConfig.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================
   ELEMENTOS DOM
========================= */
const topicsContainer = document.getElementById("forum-topics");
const form = document.getElementById("new-topic-form");
const titleInput = document.getElementById("topic-title");
const descInput = document.getElementById("topic-description");

if (!topicsContainer) {
  console.error("No existe #forum-topics en el HTML");
  throw new Error("forum-topics missing");
}

/* =========================
   AUTH
========================= */
const auth = getAuth();

/* =========================
   REFERENCIA TEMAS
========================= */
const topicsRef = collection(
  db,
  FORUMS_COLLECTION,
  FORUM_ID,
  TOPICS_COLLECTION
);

/* =========================
   LISTAR TEMAS (CLICABLES)
========================= */
onSnapshot(topicsRef, (snapshot) => {
  topicsContainer.innerHTML = "";

  if (snapshot.empty) {
    topicsContainer.innerHTML = `<p>No hay temas creados todavía.</p>`;
    return;
  }

  snapshot.forEach(docSnap => {
    const topic = docSnap.data();

    const li = document.createElement("li");
    li.className = "forum-topic card";
    li.style.cursor = "pointer";

    li.innerHTML = `
      <h3>${topic.title}</h3>
      ${topic.description ? `<p>${topic.description}</p>` : ""}
      <small>Entrar al tema</small>
    `;

    li.addEventListener("click", () => {
      window.location.href = `foro.html?topic=${docSnap.id}`;
    });

    topicsContainer.appendChild(li);
  });
});

/* =========================
   CREAR TEMA (AUTENTICADO)
========================= */
if (form) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      form.style.display = "none";
      return;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = titleInput.value.trim();
      if (!title) return;

      await addDoc(topicsRef, {
        title,
        description: descInput.value.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });

      titleInput.value = "";
      descInput.value = "";
    });
  });
}
