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
  return;
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
   LISTAR TEMAS
========================= */
onSnapshot(topicsRef, (snapshot) => {
  topicsContainer.innerHTML = "";

  if (snapshot.empty) {
    topicsContainer.innerHTML = `<p>No hay temas creados todavía.</p>`;
    return;
  }

  snapshot.forEach(doc => {
    const topic = doc.data();

    const el = document.createElement("article");
    el.className = "forum-topic card";

    el.innerHTML = `
      <h3>${topic.title}</h3>
      <p>${topic.description || ""}</p>
      <button class="btn-secondary">Entrar</button>
    `;

    el.querySelector("button").addEventListener("click", () => {
      window.location.href = `/app/foro.html?topic=${doc.id}`;
    });

    topicsContainer.appendChild(el);
  });
});

/* =========================
   CREAR TEMA (SOLO AUTENTICADO)
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
