
// ================================
// Imports
// ================================
import initSketchpad from "./1_Sketchpad/initSketchpad.js";
import initPhaser from "./4_Phaser/initPhaser.js";
document.addEventListener("DOMContentLoaded", () => {
initSketchpad();
initPhaser();

// ================================
// Config
// ================================
const projectId = "sketchtiler-dev";

// ================================
// Utilities
// ================================
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function copy(text){
  navigator.clipboard.writeText(text).catch(()=>{});
}

// ================================
// Annotator (Left)
// ================================

// --- Wait for Phaser to exist ---
async function waitForPhaserCanvas(timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const c = document.querySelector("#phaser canvas");
    if (c) return c;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("Timed out waiting for Phaser canvas");
}

// --- Setup Overlay for Circles ---
let circles = [];
let mode = "draw";
let isDragging = false;
let dragIndex = -1;

const overlay = document.createElement("canvas");
overlay.id = "circleOverlay";
overlay.style.position = "absolute";
overlay.style.pointerEvents = "none";
overlay.style.zIndex = 10;
overlay.style.top = "0";
overlay.style.left = "0";
document.body.appendChild(overlay);
const ctx = overlay.getContext("2d");

// --- Resize overlay to match Phaser ---
function resizeOverlay() {
  const phaser = document.getElementById("phaser");
  if (!phaser) return;
  const rect = phaser.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;
  overlay.style.width = rect.width + "px";
  overlay.style.height = rect.height + "px";
  overlay.style.top = rect.top + "px";
  overlay.style.left = rect.left + "px";
  drawCircles();
}
window.addEventListener("resize", resizeOverlay);
setTimeout(resizeOverlay, 1000); // run after WFC initializes

function drawCircles() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.strokeStyle = "#6ee7b7";
  ctx.lineWidth = 2;
  circles.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(110, 231, 183, 0.12)";
    ctx.fill();
  });
}

// --- Mouse logic ---
overlay.addEventListener("mousedown", e => {
  const rect = overlay.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (mode === "draw") {
    circles.push({ x, y, r: 0 });
    isDragging = true;
  } else if (mode === "move" || mode === "delete") {
    for (let i = circles.length - 1; i >= 0; i--) {
      const c = circles[i];
      if (Math.hypot(c.x - x, c.y - y) <= c.r) {
        if (mode === "delete") {
          circles.splice(i, 1);
          drawCircles();
          return;
        } else {
          dragIndex = i;
          isDragging = true;
          return;
        }
      }
    }
  }
});

overlay.addEventListener("mousemove", e => {
  if (!isDragging) return;
  const rect = overlay.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (mode === "draw") {
    const c = circles[circles.length - 1];
    c.r = Math.hypot(c.x - x, c.y - y);
  } else if (mode === "move" && dragIndex >= 0) {
    circles[dragIndex].x = x;
    circles[dragIndex].y = y;
  }
  drawCircles();
});

overlay.addEventListener("mouseup", () => {
  isDragging = false;
  dragIndex = -1;
  drawCircles();
});

// --- Mode toggles ---
function setMode(m) {
  mode = m;
  overlay.style.pointerEvents = "auto";
  document.getElementById("modeDraw").style.background = m === "draw" ? "#133228" : "#0f172a";
  document.getElementById("modeMove").style.background = m === "move" ? "#133228" : "#0f172a";
  document.getElementById("modeDelete").style.background = m === "delete" ? "#3a0f14" : "#0f172a";
}
document.getElementById("modeDraw").onclick = () => setMode("draw");
document.getElementById("modeMove").onclick = () => setMode("move");
document.getElementById("modeDelete").onclick = () => setMode("delete");
setMode("draw");

// --- Clear Circles when map regenerates ---
const clearBtn = document.getElementById("clear-button");
if (clearBtn) clearBtn.addEventListener("click", () => {
  circles = [];
  drawCircles();
});

// --- Normalize for LLM ---
window.exportNormalizedCircles = function () {
  const rect = overlay.getBoundingClientRect();
  return circles.map(c => ({
    cx: +(c.x / rect.width).toFixed(6),
    cy: +(c.y / rect.height).toFixed(6),
    r:  +(c.r / Math.max(rect.width, rect.height)).toFixed(6)
  }));
};

// --- Snapshot capture for GPT context ---
async function tryCaptureWFCSnapshot() {
  try {
    const canvas = await waitForPhaserCanvas();
    return new Promise(resolve => {
      canvas.toBlob(b => {
        if (!b) return resolve(null);
        resolve(new File([b], "map_snapshot.png", { type: "image/png" }));
      }, "image/png");
    });
  } catch (e) {
    console.warn("⚠️ No Phaser canvas found:", e);
    return null;
  }
}

async function safeUploadSnapshot(file, projectId = "sketchtiler") {
  try {
    const form = new FormData();
    form.append("projectId", projectId);
    form.append("image", file);
    const res = await fetch("/api/annot/upload", { method: "POST", body: form });
    const data = await res.json();
    return data.ok ? data : null;
  } catch {
    return null;
  }
}

// ================================
// Chat (Right)
// ================================
const elText    = document.getElementById("chatInput");
const elImg     = document.getElementById("chatImage");
const elSend    = document.getElementById("sendBtn");
const elSendImg = document.getElementById("sendImgBtn");
const elPreview = document.getElementById("chatPreview");
const elRaw     = document.getElementById("chatRaw");
const elTabPrev = document.getElementById("tabPreview");
const elTabRaw  = document.getElementById("tabRaw");
const elCopyBtn = document.getElementById("copyBtn");
const elStatus  = document.getElementById("chatStatus");

const elMemlog  = document.getElementById("memlog");
const elFilelog = document.getElementById("filelog");

// Markdown render
marked.setOptions({
  breaks: true, gfm: true,
  highlight: (code, lang) => {
    try { return hljs.highlight(code, { language: lang }).value; }
    catch { return hljs.highlightAuto(code).value; }
  }
});
function renderResponse(text){
  const clean = DOMPurify.sanitize(text ?? "");
  elPreview.innerHTML = marked.parse(clean);
  elRaw.value = text ?? "";
  document.querySelectorAll("pre code").forEach(b => hljs.highlightElement(b));
}
function setTab(which){
  if (which==="raw"){ elRaw.style.display="block"; elPreview.style.display="none"; }
  else { elRaw.style.display="none"; elPreview.style.display="block"; }
}
elTabPrev.onclick = ()=>setTab("preview");
elTabRaw.onclick  = ()=>setTab("raw");
elCopyBtn.onclick = ()=>copy(elRaw.value || elPreview.innerText || "");

// --- Chat Send (no image) ---
if (elSend) elSend.onclick = async ()=>{
  const text = elText.value.trim(); if (!text) return;
  elStatus.textContent = "Sending…"; elText.value = "";

  const body = { projectId, userText: text };

  // Automatically attach current map snapshot and circles
  try {
    const file = await tryCaptureWFCSnapshot();
    if (file) {
      const uploaded = await safeUploadSnapshot(file, projectId);
      if (uploaded?.thumbUrl) {
        body.annot = {
          thumbUrl: uploaded.thumbUrl,
          circles: exportNormalizedCircles?.() || [],
          gridWidth: 20,
          gridHeight: 20
        };
      }
    }
  } catch (e) {
    console.warn("Snapshot attach skipped:", e);
  }

  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    renderResponse(data.text || "(no response)");
    elStatus.textContent = "Done.";
  } catch (e) {
    renderResponse("**Error:** " + e);
    elStatus.textContent = "Error.";
  }
};

// --- Chat Send + Image ---
if (elSendImg) elSendImg.onclick = async ()=>{
  const text = elText.value.trim();
  if (!text && (!elImg.files || elImg.files.length === 0)) return;
  elStatus.textContent = "Uploading…";
  const form = new FormData();
  form.append("projectId", projectId);
  form.append("userText", text || "");
  if (elImg.files[0]) form.append("image", elImg.files[0]);
  elText.value=""; elImg.value="";
  try{
    const r = await fetch("/api/chat-with-image",{ method:"POST", body: form });
    const data = await r.json();
    renderResponse(data.text || "(no response)");
    elStatus.textContent="Done.";
  }catch(e){
    renderResponse("**Error:** "+e);
    elStatus.textContent="Error.";
  }
};

// --- Memory / Files ---
async function refreshMemory(){
  const r = await fetch(`/api/memory?projectId=${encodeURIComponent(projectId)}`);
  const data = await r.json();
  elMemlog.textContent = data.memory || "(no memory yet)";
}
async function refreshFileList(){
  const r = await fetch(`/api/memory/files?projectId=${encodeURIComponent(projectId)}`);
  const data = await r.json();
  elFilelog.textContent =
    (data.files||[]).map(f=>`- ${f.originalName} (${f.mimetype}, ${f.size} bytes) stored: ${f.storedName} @${f.uploadedAt}`).join("\n")
    || "(no files yet)";
}

// Init
setTab("preview");
renderResponse("👋 Ready! You can generate maps on the left, draw circles, and ask for GPT feedback on the right.");
refreshMemory();
refreshFileList();


});
