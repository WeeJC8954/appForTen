export const $ = (id) => document.getElementById(id)

export function showMessage(text, isError = false) {
  $("msg").textContent = text
  $("msg").className = isError ? "error" : ""
}

// Firebase errors carry a code like "auth/wrong-password"; plain errors just a message.
export const errorText = (err) =>
  err?.code ? err.code.replace("auth/", "").replaceAll("-", " ") : (err?.message || String(err))

// Tiny DOM builder: el("li", { className: "x" }, "text", childNode)
export function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children.filter((c) => c != null))
  return node
}
