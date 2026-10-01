import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"
import {
  getFirestore, collection, addDoc, deleteDoc, doc, query, where, orderBy,
  onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
import { firebaseConfig } from "./firebase-config.js"

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const notesCol = collection(db, "notes")

const $ = (id) => document.getElementById(id)
let unsubscribeNotes = null

function showMessage(text, isError = false) {
  $("msg").textContent = text
  $("msg").className = isError ? "error" : ""
}

const errorText = (err) => err?.code ? err.code.replace("auth/", "").replaceAll("-", " ") : String(err)

function noteItem(snap) {
  const li = document.createElement("li")
  const span = document.createElement("span")
  span.textContent = snap.data().text
  const del = document.createElement("button")
  del.textContent = "×"
  del.className = "secondary"
  del.title = "Delete"
  del.onclick = () => deleteDoc(doc(db, "notes", snap.id)).catch((e) => showMessage(errorText(e), true))
  li.append(span, del)
  return li
}

onAuthStateChanged(auth, (user) => {
  $("auth-view").hidden = !!user
  $("app-view").hidden = !user
  unsubscribeNotes?.()
  unsubscribeNotes = null
  if (!user) return

  $("who").textContent = user.email
  // Live-updating list of this user's notes. Needs a composite index (owner + created) —
  // the first run logs a console link that creates it in one click.
  const q = query(notesCol, where("owner", "==", user.uid), orderBy("created", "desc"))
  unsubscribeNotes = onSnapshot(
    q,
    (snaps) => $("notes").replaceChildren(...snaps.docs.map(noteItem)),
    (err) => showMessage(errorText(err), true),
  )
})

$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  const email = $("email").value.trim()
  const password = $("password").value
  try {
    if (e.submitter?.dataset.action === "signup") {
      await createUserWithEmailAndPassword(auth, email, password)
    } else {
      await signInWithEmailAndPassword(auth, email, password)
    }
    showMessage("")
    $("auth-form").reset()
  } catch (err) {
    showMessage(errorText(err), true)
  }
})

$("note-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  try {
    await addDoc(notesCol, { text: $("note-text").value, owner: auth.currentUser.uid, created: serverTimestamp() })
    $("note-text").value = ""
  } catch (err) {
    showMessage(errorText(err), true)
  }
})

$("logout").addEventListener("click", () => signOut(auth))
