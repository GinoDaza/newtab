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
    const dots = document.createElement("button");
    dots.type = "button";
    dots.className = "dots";
    dots.setAttribute("aria-label", "Shortcut options");
    dots.innerHTML = '<svg viewBox="0 0 16 4"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/></svg>';
    dots.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); openMenu(dots, i); });
    a.append(dots);
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

// Options menu on each shortcut; removing is undoable instead of asking for confirmation
const menu = document.getElementById("menu");
const toast = document.getElementById("toast");
let menuIndex = -1, toastTimer, lastRemoved;
function openMenu(btn, i) {
  menuIndex = i;
  const r = btn.getBoundingClientRect();
  menu.hidden = false;
  menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 8) + "px";
  menu.style.top = r.bottom + 4 + "px";
  menu.querySelector("button").focus();
}
const closeMenu = () => { menu.hidden = true; };
document.addEventListener("click", e => { if (!menu.contains(e.target)) closeMenu(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
menu.addEventListener("click", e => {
  const act = e.target.dataset.act;
  closeMenu();
  if (act === "edit") openDialog(menuIndex);
  if (act === "remove") {
    const [sc] = shortcuts.splice(menuIndex, 1);
    lastRemoved = { sc, index: menuIndex };
    save(); render();
    document.getElementById("toastText").textContent = "'" + sc.name + "' removed";
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.hidden = true, 8000);
  }
});
document.getElementById("toastUndo").addEventListener("click", () => {
  shortcuts.splice(lastRemoved.index, 0, lastRemoved.sc);
  save(); render();
  toast.hidden = true;
});
document.getElementById("toastClose").addEventListener("click", () => toast.hidden = true);
const iconFile = document.getElementById("iconFile");
document.getElementById("iconUpload").addEventListener("click", () => iconFile.click());
iconFile.addEventListener("change", () => {
  const file = iconFile.files[0];
  iconFile.value = "";
  if (!file) return;
  // Shrink to 128px and store inline, so the icon lives in localStorage instead of the repo
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 128 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    fIcon.value = c.toDataURL("image/png");
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
});
document.getElementById("cancelBtn").addEventListener("click", () => dlg.close());
const settings = document.getElementById("settings");
const json = document.getElementById("json"), jsonMsg = document.getElementById("jsonMsg");
const pretty = () => JSON.stringify(shortcuts, null, 2);
const valid = d => Array.isArray(d) && d.every(x => x && x.name && x.url);
const msg = (t, err) => { jsonMsg.textContent = t; jsonMsg.classList.toggle("err", !!err); };
const flash = (btn, ok) => {
  const old = btn.innerHTML;
  btn.classList.add("done");
  btn.innerHTML = ok;
  setTimeout(() => { btn.classList.remove("done"); btn.innerHTML = old; }, 1200);
};
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7"/></svg>';
document.getElementById("gearBtn").addEventListener("click", () => {
  json.value = pretty(); msg("");
  settings.showModal();
});
document.getElementById("closeSettings").addEventListener("click", () => settings.close());
document.getElementById("jsonCancel").addEventListener("click", () => settings.close());
settings.addEventListener("click", e => { if (e.target === settings) settings.close(); });
document.getElementById("jsonSave").addEventListener("click", () => {
  try {
    const data = JSON.parse(json.value);
    if (!valid(data)) throw 0;
    shortcuts = data; save(); render(); settings.close();
  } catch { msg("Invalid JSON: each item needs a name and a url", true); }
});
document.getElementById("copyBtn").addEventListener("click", async e => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(json.value); flash(btn, CHECK); msg("Copied to clipboard"); }
  catch { msg("Copy failed", true); }
});
document.getElementById("exportBtn").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([json.value], { type: "application/json" }));
  a.download = "newtab-shortcuts.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
// Import only fills the editor, so the result can be reviewed before Save applies it
const importFile = document.getElementById("importFile");
document.getElementById("importBtn").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  try {
    const text = await importFile.files[0].text();
    if (!valid(JSON.parse(text))) throw 0;
    json.value = JSON.stringify(JSON.parse(text), null, 2);
    msg("File loaded. Press Save to apply it.");
  } catch { msg("That file is not a valid shortcuts file", true); }
  importFile.value = "";
});

render();
