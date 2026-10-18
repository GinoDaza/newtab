// Used the first time, before anything is saved in this browser
const DEFAULTS = [
  { name: "Gmail", url: "https://mail.google.com", icon: "https://ssl.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png" },
  { name: "Drive", url: "https://drive.google.com", icon: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png" },
  { name: "Translate", url: "https://translate.google.com" },
  { name: "Calendar", url: "https://calendar.google.com", icon: "https://ssl.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" },
  { name: "Github", url: "https://github.com" },
  { name: "Gradescope", url: "https://www.gradescope.com" },
  { name: "Piazza", url: "https://piazza.com" },
  { name: "Sistema Académico", url: "https://sistema-academico.utec.edu.pe" },
  { name: "Gemini", url: "https://gemini.google.com" },
];
const KEY = "shortcuts";
let shortcuts;
try { shortcuts = JSON.parse(localStorage.getItem(KEY)); } catch {}
if (!Array.isArray(shortcuts)) shortcuts = DEFAULTS;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(shortcuts)); } catch {} };
const fullUrl = u => /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : "https://" + u;

// Domains and URLs open directly; anything else goes to Google
const q = document.getElementById("q");
const looksLikeUrl = t => /^(https?|file|chrome|edge|about):/i.test(t) ||
  /^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/\S*)?$/i.test(t) ||
  /^[^\s\/]+\.[a-z]{2,}(:\d+)?([\/?#]\S*)?$/i.test(t);
document.getElementById("search").addEventListener("submit", e => {
  const t = q.value.trim();
  if (!looksLikeUrl(t)) return;
  e.preventDefault();
  location.href = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : "https://" + t;
});
// Ctrl+T can leave focus in the address bar, so take it back once the page loads
q.focus();
window.addEventListener("load", () => q.focus());

const grid = document.getElementById("grid");
const dlg = document.getElementById("dlg");
const [fName, fUrl, fIcon] = ["fName", "fUrl", "fIcon"].map(id => document.getElementById(id));
let editIndex = -1;

function iconFor(sc) {
  const img = document.createElement("img");
  img.alt = "";
  img.src = sc.icon || "https://www.google.com/s2/favicons?sz=64&domain=" + new URL(fullUrl(sc.url)).hostname;
  img.onerror = () => {
    const l = document.createElement("span");
    l.className = "letter";
    l.textContent = sc.name.charAt(0).toUpperCase();
    img.replaceWith(l);
  };
  return img;
}

function openDialog(i) {
  editIndex = i;
  const sc = shortcuts[i] || { name: "", url: "", icon: "" };
  fName.value = sc.name; fUrl.value = sc.url; fIcon.value = sc.icon || "";
  document.getElementById("delBtn").hidden = i < 0;
  dlg.showModal();
  fName.focus();
}

let dragFrom = -1;

function render() {
  grid.replaceChildren();
  shortcuts.forEach((sc, i) => {
    const a = document.createElement("a");
    a.href = fullUrl(sc.url);
    a.innerHTML = '<div class="ico"></div><span class="name"></span>';
    a.querySelector(".ico").append(iconFor(sc));
    a.querySelector(".name").textContent = sc.name;
    a.addEventListener("contextmenu", e => { e.preventDefault(); openDialog(i); });
    a.addEventListener("dragstart", e => {
      dragFrom = i;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", sc.url);
      requestAnimationFrame(() => a.classList.add("dragging"));
    });
    a.addEventListener("dragend", () => grid.querySelectorAll(".dragging, .over").forEach(el => el.classList.remove("dragging", "over")));
    a.addEventListener("dragover", e => {
      if (dragFrom < 0) return;
      e.preventDefault();
      grid.querySelectorAll(".over").forEach(el => el.classList.remove("over"));
      if (i !== dragFrom) a.classList.add("over");
    });
    a.addEventListener("drop", e => {
      if (dragFrom < 0) return;
      e.preventDefault();
      const [moved] = shortcuts.splice(dragFrom, 1);
      shortcuts.splice(i, 0, moved);
      dragFrom = -1;
      save(); render();
    });
    grid.append(a);
  });
  const add = document.createElement("a");
  add.href = "#";
  add.className = "add";
  add.innerHTML = '<div class="ico">+</div><span class="name">Add shortcut</span>';
  add.addEventListener("click", e => { e.preventDefault(); openDialog(-1); });
  grid.append(add);
}

document.getElementById("dlgForm").addEventListener("submit", () => {
  const sc = { name: fName.value.trim(), url: fUrl.value.trim() };
  if (fIcon.value.trim()) sc.icon = fIcon.value.trim();
  if (editIndex < 0) shortcuts.push(sc); else shortcuts[editIndex] = sc;
  save(); render();
});
document.getElementById("delBtn").addEventListener("click", () => {
  shortcuts.splice(editIndex, 1);
  save(); render(); dlg.close();
});
document.getElementById("cancelBtn").addEventListener("click", () => dlg.close());
const settings = document.getElementById("settings");
const json = document.getElementById("json"), jsonErr = document.getElementById("jsonErr");
const pretty = () => JSON.stringify(shortcuts, null, 2);
const valid = d => Array.isArray(d) && d.every(x => x && x.name && x.url);
function showTab(name) {
  document.querySelectorAll(".tabs [data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".pane").forEach(p => p.classList.toggle("active", p.id === "pane-" + name));
}
document.querySelectorAll(".tabs [data-tab]").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
document.getElementById("gearBtn").addEventListener("click", () => {
  json.value = pretty(); jsonErr.textContent = "";
  showTab("edit");
  settings.showModal();
});
document.getElementById("closeSettings").addEventListener("click", () => settings.close());
settings.addEventListener("click", e => { if (e.target === settings) settings.close(); });
document.getElementById("jsonSave").addEventListener("click", () => {
  try {
    const data = JSON.parse(json.value);
    if (!valid(data)) throw 0;
    shortcuts = data; save(); render(); settings.close();
  } catch { jsonErr.textContent = "Invalid JSON: each item needs name and url"; }
});
document.getElementById("copyBtn").addEventListener("click", async e => {
  try { await navigator.clipboard.writeText(pretty()); e.target.textContent = "Copied"; }
  catch { e.target.textContent = "Copy failed"; }
  setTimeout(() => e.target.textContent = "Copy JSON", 1500);
});
document.getElementById("exportBtn").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([pretty()], { type: "application/json" }));
  a.download = "newtab-shortcuts.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
const importFile = document.getElementById("importFile");
document.getElementById("importBtn").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  try {
    const data = JSON.parse(await importFile.files[0].text());
    if (!valid(data)) throw 0;
    shortcuts = data; save(); render(); settings.close();
  } catch { alert("Invalid shortcuts file"); }
  importFile.value = "";
});

render();
