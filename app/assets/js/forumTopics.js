import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
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
let currentUser = null;
let currentRole = "patient";

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) return;
});

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
onSnapshot(topicsRef, async (snapshot) => {
  topicsContainer.innerHTML = "";

  if (snapshot.empty) {
    topicsContainer.innerHTML = `<p>No hay temas creados todavía.</p>`;
    return;
  }

  snapshot.forEach(docSnap => {
    const topic = docSnap.data();

    const card = document.createElement("article");
    card.className = "forum-topic card";

    card.innerHTML = `
      <h3>${topic.title}</h3>
      ${topic.description ? `<p>${topic.description}</p>` : ""}
      <div class="forum-topic-actions">
        <button class="btn-secondary enter-topic">Entrar al tema</button>
      </div>
    `;

    // Entrar al tema
    card.querySelector(".enter-topic").addEventListener("click", () => {
      window.location.href = `foro.html?topic=${docSnap.id}`;
    });

    // Botón eliminar (solo terapeuta)
    if (currentUser && topic.createdBy === currentUser.uid) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-danger";
      deleteBtn.textContent = "Eliminar";

      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const ok = confirm(
          `¿Eliminar el tema "${topic.title}"?\n\nSe perderán todos sus mensajes.`
        );
        if (!ok) return;

        await deleteDoc(
          doc(
            db,
            FORUMS_COLLECTION,
            FORUM_ID,
            TOPICS_COLLECTION,
            docSnap.id
          )
        );
      });

      card.querySelector(".forum-topic-actions").appendChild(deleteBtn);
    }

    topicsContainer.appendChild(card);
  });
});

/* =========================
   CREAR TEMA
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
