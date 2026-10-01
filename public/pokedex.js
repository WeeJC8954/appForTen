import { db, doc, onSnapshot, runTransaction, serverTimestamp } from "./firebase.js"
import { $, showMessage, errorText, el } from "./ui.js"

const API = "https://pokeapi.co/api/v2"
const MAX_TEAM = 6
const MAX_DEX_ID = 1025 // national dex; higher ids are alternate forms (10001+)
const STAT_LABELS = {
  hp: "HP", attack: "Atk", defense: "Def", "special-attack": "SpA", "special-defense": "SpD", speed: "Spe",
}

const cache = new Map() // slug or id -> pokemon
let namesLoaded = false
let teamRef = null
let unsubscribeTeam = null
let team = [] // [{ id, name, sprite, types }] as stored in teams/{uid}
let current = null // pokemon shown on the card
let requestSeq = 0 // latest search wins if responses arrive out of order

const displayName = (slug) => slug.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())
const slugify = (text) => String(text).trim().toLowerCase().replace(/\s+/g, "-")

async function loadNames() {
  if (namesLoaded) return
  let names = null
  try { names = JSON.parse(sessionStorage.getItem("pokemon-names")) } catch {}
  if (!names) {
    const res = await fetch(`${API}/pokemon?limit=2000`)
    if (!res.ok) throw new Error(`PokeAPI error ${res.status}`)
    names = (await res.json()).results.map((r) => r.name)
    try { sessionStorage.setItem("pokemon-names", JSON.stringify(names)) } catch {}
  }
  $("pokemon-names").replaceChildren(...names.map((n) => el("option", { value: n })))
  namesLoaded = true
}

async function fetchPokemon(key) {
  if (cache.has(key)) return cache.get(key)
  const res = await fetch(`${API}/pokemon/${encodeURIComponent(key)}`)
  if (res.status === 404) throw new Error(`No Pokémon called "${key}"`)
  if (!res.ok) throw new Error(`PokeAPI error ${res.status}`)
  const d = await res.json()
  const p = {
    id: d.id,
    name: d.name,
    types: d.types.map((t) => t.type.name),
    stats: d.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
    height: d.height / 10, // decimetres -> m
    weight: d.weight / 10, // hectograms -> kg
    artwork: d.sprites.other?.["official-artwork"]?.front_default || d.sprites.front_default,
    sprite: d.sprites.front_default || d.sprites.other?.["official-artwork"]?.front_default,
  }
  cache.set(d.name, p)
  cache.set(String(d.id), p)
  return p
}

async function show(key) {
  const seq = ++requestSeq
  $("poke-card").replaceChildren(el("p", { className: "muted" }, "Loading…"))
  try {
    const p = await fetchPokemon(key)
    if (seq !== requestSeq) return
    current = p
    showMessage("")
    renderCard()
  } catch (err) {
    if (seq !== requestSeq) return
    current = null
    $("poke-card").replaceChildren()
    showMessage(errorText(err), true)
  }
}

const typeBadges = (types) => el("div", { className: "types" },
  ...types.map((t) => el("span", { className: `type type-${t}` }, t)))

function renderCard() {
  if (!current) return $("poke-card").replaceChildren()
  const p = current
  const stats = el("dl", { className: "stats" }, ...p.stats.flatMap((s) => {
    const bar = el("span", { className: "bar" })
    bar.style.width = `${Math.min(100, (s.value / 200) * 100)}%`
    return [
      el("dt", {}, STAT_LABELS[s.name] || s.name),
      el("dd", {}, el("span", { className: "num" }, String(s.value)), el("span", { className: "track" }, bar)),
    ]
  }))
  const add = el("button", { id: "poke-add", type: "button" })
  add.onclick = () => addToTeam(p)

  $("poke-card").replaceChildren(el("article", { className: "card" },
    p.artwork ? el("img", { src: p.artwork, alt: displayName(p.name), width: 160, height: 160 }) : null,
    el("div", { className: "card-info" },
      el("p", { className: "muted" }, `#${String(p.id).padStart(4, "0")}`),
      el("h2", {}, displayName(p.name)),
      typeBadges(p.types),
      el("p", { className: "muted" }, `Height ${p.height} m · Weight ${p.weight} kg`),
    ),
    stats,
    add,
  ))
  renderAddButton()
}

function renderAddButton() {
  const add = $("poke-add")
  if (!add || !current) return
  const inTeam = team.some((m) => m.id === current.id)
  const full = team.length >= MAX_TEAM
  add.disabled = inTeam || full
  add.textContent = inTeam ? "On your team" : full ? "Team full (6/6)" : "Add to team"
}

function renderTeam() {
  $("team-count").textContent = `${team.length}/${MAX_TEAM}`
  const slots = []
  for (let i = 0; i < MAX_TEAM; i++) {
    const m = team[i]
    if (!m) { slots.push(el("li", { className: "slot empty" })); continue }
    const remove = el("button", { className: "secondary remove", title: `Remove ${displayName(m.name)}` }, "×")
    remove.onclick = (e) => { e.stopPropagation(); removeFromTeam(m.id) }
    const slot = el("li", { className: "slot", title: "Show details" },
      m.sprite ? el("img", { src: m.sprite, alt: "", width: 72, height: 72 }) : null,
      el("span", {}, displayName(m.name)),
      remove,
    )
    slot.onclick = () => show(String(m.id))
    slots.push(slot)
  }
  $("team").replaceChildren(...slots)
}

// Read-modify-write in a transaction so the 6-member cap and no-duplicates hold across tabs.
async function updateTeam(change) {
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(teamRef)
      const members = change(snap.exists() ? snap.data().members : [])
      tx.set(teamRef, { members, updated: serverTimestamp() })
    })
  } catch (err) {
    showMessage(errorText(err), true)
  }
}

function addToTeam(p) {
  return updateTeam((members) => {
    if (members.some((m) => m.id === p.id)) throw new Error(`${displayName(p.name)} is already on your team`)
    if (members.length >= MAX_TEAM) throw new Error("Your team is full (6 max)")
    return [...members, { id: p.id, name: p.name, sprite: p.sprite, types: p.types }]
  })
}

const removeFromTeam = (id) => updateTeam((members) => members.filter((m) => m.id !== id))

export function startPokedex(user) {
  teamRef = doc(db, "teams", user.uid)
  unsubscribeTeam = onSnapshot(
    teamRef,
    (snap) => {
      team = snap.exists() ? snap.data().members : []
      renderTeam()
      renderAddButton()
    },
    (err) => showMessage(errorText(err), true),
  )
  loadNames().catch((err) => showMessage(errorText(err), true))
}

export function stopPokedex() {
  unsubscribeTeam?.()
  unsubscribeTeam = null
  teamRef = null
  team = []
  current = null
  renderTeam()
  renderCard()
}

$("poke-search").addEventListener("submit", (e) => {
  e.preventDefault()
  const key = slugify($("poke-query").value)
  if (key) show(key)
})

$("poke-random").addEventListener("click", () => {
  $("poke-query").value = ""
  show(String(1 + Math.floor(Math.random() * MAX_DEX_ID)))
})
