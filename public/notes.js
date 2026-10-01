import {
  db, collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp,
} from "./firebase.js"
import { $, showMessage, errorText } from "./ui.js"

const MAX_NOTE = 2000 // keep in sync with the text.size() check in firestore.rules
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

$("note-text").maxLength = MAX_NOTE

$("note-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  if (!currentUser) return
  const text = $("note-text").value
  if (text.length > MAX_NOTE) return showMessage(`Notes can be at most ${MAX_NOTE} characters`, true)
  try {
    await addDoc(notesCol, { text, owner: currentUser.uid, created: serverTimestamp() })
    $("note-text").value = ""
  } catch (err) {
    showMessage(errorText(err), true)
  }
})
