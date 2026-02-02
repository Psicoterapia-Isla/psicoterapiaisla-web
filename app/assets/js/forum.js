import { getAuth, onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "./firebase.js";
import { FORUMS_COLLECTION } from "./forumConfig.js";

export function initForumData(onForumsUpdate) {
  const auth = getAuth();

  onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const forumsRef = collection(db, FORUMS_COLLECTION);

    onSnapshot(forumsRef, (snapshot) => {
      const forums = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      onForumsUpdate(forums);
    });
  });
}
