import { listenForumPosts } from "./forum.js";

const container = document.getElementById("forum-posts");

listenForumPosts(posts => {
  container.innerHTML = "";

  posts.forEach(post => {
    const el = document.createElement("article");
    el.className = "forum-post";

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
