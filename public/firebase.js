// Single place that loads the Firebase SDK — keep every URL on the same pinned version.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
import { firebaseConfig } from "./firebase-config.js"

export {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"
export {
  collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp, runTransaction,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
