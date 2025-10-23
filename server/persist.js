// server/persist.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const HIST_DIR = path.join(DATA_DIR, "history");
const MEMO_DIR = path.join(DATA_DIR, "memory");
const UP_DIR   = path.join(DATA_DIR, "uploads");

for (const d of [DATA_DIR, HIST_DIR, MEMO_DIR, UP_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const histPath = (projectId) => path.join(HIST_DIR, `${projectId}.json`);
const memoPath = (projectId) => path.join(MEMO_DIR, `${projectId}.md`);
const projUploadDir = (projectId) => path.join(UP_DIR, projectId);
const filesIndexPath = (projectId) => path.join(projUploadDir(projectId), "_files.json");

// ---- Chat history ----
export function loadHistory(projectId) {
  const p = histPath(projectId);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
}
export function saveHistory(projectId, messages) {
  fs.writeFileSync(histPath(projectId), JSON.stringify(messages, null, 2), "utf8");
}

// ---- Project memory (persistent notes) ----
export function readProjectMemory(projectId) {
  const p = memoPath(projectId);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}
export function appendProjectMemory(projectId, text) {
  const p = memoPath(projectId);
  const header = `\n\n--- ${new Date().toISOString()} ---\n`;
  fs.appendFileSync(p, header + String(text).trim() + "\n");
}

// ---- File uploads ----
export function ensureUploadDir(projectId) {
  const dir = projUploadDir(projectId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readFilesIndex(projectId) {
  const p = filesIndexPath(projectId);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
}
function writeFilesIndex(projectId, arr) {
  const p = filesIndexPath(projectId);
  fs.writeFileSync(p, JSON.stringify(arr, null, 2), "utf8");
}

export function recordUploadedFile(projectId, meta) {
  const list = readFilesIndex(projectId);
  list.push(meta);
  writeFilesIndex(projectId, list);
}

export function listUploadedFiles(projectId) {
  return readFilesIndex(projectId);
}
