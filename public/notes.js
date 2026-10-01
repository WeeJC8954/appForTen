import {
  db, collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp,
} from "./firebase.js"
import { $, showMessage, errorText } from "./ui.js"

const notesCol = collection(db, "notes")
let currentUser = null
let unsubscribeNotes = null

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

export function startNotes(user) {
  currentUser = user
  // Live-updating list of this user's notes. Needs the owner + created composite index
  // in firestore.indexes.json.
  const q = query(notesCol, where("owner", "==", user.uid), orderBy("created", "desc"))
  unsubscribeNotes = onSnapshot(
    q,
    (snaps) => $("notes").replaceChildren(...snaps.docs.map(noteItem)),
    (err) => showMessage(errorText(err), true),
  )
}

export function stopNotes() {
  unsubscribeNotes?.()
  unsubscribeNotes = null
  currentUser = null
  $("notes").replaceChildren()
}

$("note-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  try {
    await addDoc(notesCol, { text: $("note-text").value, owner: currentUser.uid, created: serverTimestamp() })
    $("note-text").value = ""
  } catch (err) {
    showMessage(errorText(err), true)
  }
})
