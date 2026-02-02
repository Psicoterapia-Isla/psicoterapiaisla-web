import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const FORUM_ID = "aGuX3GfOqrglDg5cElpv"; // el que ya tienes

export function listenForumPosts(callback) {
  const postsRef = collection(db, "forums", FORUM_ID, "posts");
  const q = query(postsRef, orderBy("createdAt", "asc"));

  onSnapshot(q, snapshot => {
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(posts);
  });
}
