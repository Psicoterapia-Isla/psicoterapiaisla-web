import { db } from "./firebase.js";
import { FORUM_ID } from "./forumConfig.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function listenForumPosts(renderFn) {
  const postsRef = collection(db, "forums", FORUM_ID, "posts");

  const q = query(postsRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, snapshot => {
    const posts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => !p.isHidden); // 🔒 respeta moderación

    renderFn(posts);
  });
}
