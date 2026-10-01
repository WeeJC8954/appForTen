import {
  auth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
} from "./firebase.js"
import { $, showMessage, errorText } from "./ui.js"
import { startNotes, stopNotes } from "./notes.js"
import { startPokedex, stopPokedex } from "./pokedex.js"

const TABS = ["notes", "pokedex"]

function selectTab(name) {
  if (!TABS.includes(name)) name = TABS[0]
  for (const t of TABS) {
    $(`${t}-view`).hidden = t !== name
    document.querySelector(`[data-tab="${t}"]`).setAttribute("aria-selected", String(t === name))
  }
  try { localStorage.setItem("tab", name) } catch {}
}

onAuthStateChanged(auth, (user) => {
  $("auth-view").hidden = !!user
  $("app-view").hidden = !user
  showMessage("")
  stopNotes()
  stopPokedex()
  if (!user) return

  $("who").textContent = user.email
  startNotes(user)
  startPokedex(user)
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

$("logout").addEventListener("click", () => signOut(auth))

for (const btn of document.querySelectorAll("[data-tab]")) {
  btn.addEventListener("click", () => selectTab(btn.dataset.tab))
}
let savedTab = null
try { savedTab = localStorage.getItem("tab") } catch {}
selectTab(savedTab)
