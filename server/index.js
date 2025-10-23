import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

import {
  conversational,
  buildSystem,
  getHistory,
  llm,
  pushManualTurn
} from "./langchain.js";

import {
  saveHistory,
  appendProjectMemory,
  readProjectMemory,
  ensureUploadDir,
  recordUploadedFile,
  listUploadedFiles
} from "./persist.js";

/* ---------------- App & static ---------------- */
const app = express();
app.use(express.json({ limit: "10mb" }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "../");
const UPLOADS_ROOT = path.join(__dirname, "data", "uploads");

// serve UI and uploaded files
app.use(express.static(WEB_DIR));
app.use("/uploads", express.static(UPLOADS_ROOT));

/* ---------------- Multer (disk for general uploads) ---------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.body.projectId || "sketchtiler";
    cb(null, ensureUploadDir(projectId));
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${ts}-${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

/* ---------------- Multer (memory for annotator image) ---------------- */
const annotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/* ---------------- Helpers ---------------- */
async function persistChat(projectId) {
  const h = getHistory(projectId);
  const msgs = await h.getMessages();
  const flat = msgs.map(m => ({
    role: m._getType() === "human" ? "user" : "assistant",
    content: m.content
  }));
  saveHistory(projectId, flat);
}

function resolveUploadPathFromUrl(uploadUrl) {
  if (!uploadUrl) return null;
  try {
    const u = uploadUrl.replace(/^https?:\/\/[^/]+/i, ""); // strip origin
    const m = u.match(/\/uploads\/([^/]+)\/([^/?#]+)/i);
    if (!m) return null;
    const pid = decodeURIComponent(m[1]);
    const fname = decodeURIComponent(m[2]);
    const abs = path.join(UPLOADS_ROOT, pid, fname);
    return fs.existsSync(abs) ? abs : null;
  } catch {
    return null;
  }
}

function safeJsonParse(s) { try { return JSON.parse(s); } catch { return null; } }

/* ---------------- Chat ---------------- */
app.post("/api/chat", async (req, res) => {
  try {
    const { projectId = "sketchtiler", userText = "", annot = null } = req.body || {};
    if (!userText.trim()) return res.status(400).json({ error: "userText is required" });

    const system = buildSystem(projectId);
    const userContent = [];
    if (userText) userContent.push({ type: "text", text: userText });

    // Optional annotator context: image + circles
    if (annot && annot.thumbUrl && Array.isArray(annot.circles) && annot.circles.length) {
      const thumbLocal = resolveUploadPathFromUrl(annot.thumbUrl) ||
                         resolveUploadPathFromUrl(annot.imageUrl);
      if (thumbLocal) {
        const b64 = fs.readFileSync(thumbLocal).toString("base64");
        userContent.push({ type: "image_url", image_url: { url: `data:image/png;base64,${b64}`, detail: "auto" } });
      } else {
        console.warn("[chat] could not resolve annot image from URL:", annot?.thumbUrl);
      }
      const gW = annot.gridWidth  || 20;
      const gH = annot.gridHeight || 20;
      const circlesTxt = annot.circles.map(c => `(${c.cx},${c.cy},r=${c.r})`).join(", ");
      userContent.push({
        type: "text",
        text: `Context: grid ${gW}x${gH}. User highlighted circular regions (normalized cx,cy,r): ${circlesTxt}. Focus on these regions.`
      });
    }

    await pushManualTurn(projectId, "user", userText || "[context: image+circles]");
    const result = await llm.invoke([
      { role: "system", content: system },
      { role: "user", content: userContent }
    ]);

    const assistantText =
      (Array.isArray(result?.content) && result.content.map(c => c?.text).join("")) ||
      result?.content?.text ||
      (typeof result?.content === "string" ? result.content : "") ||
      "(no response)";

    await pushManualTurn(projectId, "assistant", assistantText);
    await persistChat(projectId);
    const hadVision = userContent.some(p => p.type === "image_url");
    res.json({ threadId: uuid(), text: assistantText, vision: hadVision });
  } catch (e) {
    console.error("chat error:", e);
    res.status(500).json({ error: "chat failed" });
  }
});

app.post("/api/chat-with-image", upload.single("image"), async (req, res) => {
  try {
    const { projectId = "sketchtiler", userText = "" } = req.body || {};
    if (!userText && !req.file) return res.status(400).json({ error: "Provide userText and/or an image file." });

    const mime = req.file?.mimetype || "image/png";
    const b64  = req.file ? fs.readFileSync(req.file.path).toString("base64") : null;

    const userContent = [];
    if (userText) userContent.push({ type: "text", text: userText });
    if (b64) userContent.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}`, detail: "auto" } });

    await pushManualTurn(projectId, "user", userText || "[image]");
    const system = buildSystem(projectId);
    const result = await llm.invoke([
      { role: "system", content: system },
      { role: "user", content: userContent }
    ]);

    const assistantText =
      (Array.isArray(result?.content) && result.content.map(c => c?.text).join("")) ||
      result?.content?.text ||
      (typeof result?.content === "string" ? result.content : "") ||
      "(no response)";

    await pushManualTurn(projectId, "assistant", assistantText);
    await persistChat(projectId);
    res.json({ threadId: uuid(), text: assistantText });
  } catch (e) {
    console.error("chat-with-image error:", e);
    res.status(500).json({ error: String(e) });
  }
});

/* ---------------- Project memory ---------------- */
app.get("/api/memory", (req, res) => {
  const projectId = req.query.projectId || "sketchtiler";
  res.json({ projectId, memory: readProjectMemory(projectId) || "" });
});

app.post("/api/memory/add", (req, res) => {
  const { projectId = "sketchtiler", note = "" } = req.body || {};
  if (!note.trim()) return res.status(400).json({ error: "note is required" });
  appendProjectMemory(projectId, note.trim());
  res.json({ ok: true });
});

/* ---------------- Upload & summarize into memory (multi-file) ---------------- */
app.post("/api/memory/upload", upload.array("files", 16), async (req, res) => {
  try {
    const { projectId = "sketchtiler", note = "" } = req.body || {};
    const files = req.files || [];
    if (files.length === 0 && !note.trim()) {
      return res.status(400).json({ error: "Attach at least one file or provide a note." });
    }

    const saved = [];
    for (const f of files) {
      const meta = {
        storedName: path.basename(f.path),
        originalName: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
        uploadedAt: new Date().toISOString(),
      };
      recordUploadedFile(projectId, meta);
      saved.push(meta);

      // summarize small text files into memory
      let contentText = "";
      const isTextish =
        /^text\/|\/json$|\/xml$|\/csv$|\/yaml$|\/markdown$/.test(f.mimetype) ||
        /\.(txt|md|json|csv|xml|yaml|yml)$/i.test(f.originalname);
      if (isTextish && f.size < 2 * 1024 * 1024) {
        try { contentText = fs.readFileSync(f.path, "utf8").slice(0, 20000); } catch {}
      }

      const prompt = [
        { role: "system", content: "You are a concise archivist. Summarize files for future retrieval." },
        { role: "user", content: [
          { type: "text", text:
            `Summarize this file in 3–6 bullets for future use in SketchTiler.
             Include: file purpose, key entities/rules, and how it could inform level design.
             Filename: ${meta.originalName} (${meta.mimetype}, ${meta.size} bytes).` },
          ...(contentText
            ? [{ type: "text", text: `File preview:\n${contentText}` }]
            : [{ type: "text", text: "(Binary or large file; no inline preview.)" }])
        ]}
      ];
      const summary = await llm.invoke(prompt);
      const summaryText =
        (Array.isArray(summary?.content) && summary.content.map(c => c?.text).join("")) ||
        summary?.content?.text ||
        (typeof summary?.content === "string" ? summary.content : "") ||
        "";
      appendProjectMemory(
        projectId,
        `Uploaded file: ${meta.originalName}\nStored as: ${meta.storedName}\nType: ${meta.mimetype}, Size: ${meta.size} bytes\nSummary:\n${summaryText}`
      );
    }

    if (note && note.trim()) appendProjectMemory(projectId, `Note with uploads:\n${note.trim()}`);
    res.json({ ok: true, saved });
  } catch (e) {
    console.error("memory/upload error:", e);
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/memory/files", (req, res) => {
  const projectId = req.query.projectId || "sketchtiler";
  res.json({ projectId, files: listUploadedFiles(projectId) });
});

/* ---------------- Ingest tileset (+spec +legend) ---------------- */
app.post("/api/memory/ingest-tileset", async (req, res) => {
  try {
    const {
      projectId = "sketchtiler",
      tilesetPath = "../tilemap.png",
      specPath    = "../Tilesheet.txt",
      legendPath  = null
    } = req.body || {};

    const serverDir = path.dirname(fileURLToPath(import.meta.url));
    const tilesetAbs = path.resolve(serverDir, tilesetPath);
    const specAbs    = path.resolve(serverDir, specPath);
    const legendAbs  = legendPath ? path.resolve(serverDir, legendPath) : null;

    if (!fs.existsSync(tilesetAbs)) return res.status(404).json({ error: `tileset not found: ${tilesetAbs}` });
    if (!fs.existsSync(specAbs))    return res.status(404).json({ error: `spec not found: ${specAbs}` });
    if (legendPath && !fs.existsSync(legendAbs)) return res.status(404).json({ error: `legend not found: ${legendAbs}` });

    const uploadDir = ensureUploadDir(projectId);
    const tsName = `${Date.now()}-${path.basename(tilesetAbs)}`;
    const spName = `${Date.now()}-${path.basename(specAbs)}`;
    const lgName = legendAbs ? `${Date.now()}-${path.basename(legendAbs)}` : null;

    fs.copyFileSync(tilesetAbs, path.join(uploadDir, tsName));
    fs.copyFileSync(specAbs,    path.join(uploadDir, spName));
    if (legendAbs) fs.copyFileSync(legendAbs, path.join(uploadDir, lgName));

    const tilesetStat = fs.statSync(path.join(uploadDir, tsName));
    const specStat    = fs.statSync(path.join(uploadDir, spName));
    recordUploadedFile(projectId, {
      storedName: tsName, originalName: path.basename(tilesetAbs),
      size: tilesetStat.size, mimetype: "image/png", uploadedAt: new Date().toISOString(),
    });
    recordUploadedFile(projectId, {
      storedName: spName, originalName: path.basename(specAbs),
      size: specStat.size, mimetype: "text/plain", uploadedAt: new Date().toISOString(),
    });
    if (lgName) {
      const lgStat = fs.statSync(path.join(uploadDir, lgName));
      recordUploadedFile(projectId, {
        storedName: lgName, originalName: path.basename(legendAbs),
        size: lgStat.size, mimetype: "application/json", uploadedAt: new Date().toISOString(),
      });
    }

    const rawSpec = fs.readFileSync(specAbs, "utf8");
    const grab = (label) => {
      const re = new RegExp(label + "[^\\d]*(\\d+)[^\\d]+(\\d+)", "i");
      const m = rawSpec.match(re);
      return m ? [Number(m[1]), Number(m[2])] : null;
    };
    const sizePair   = grab("Tile size");
    const spacePair  = grab("Space between tiles");
    const totalH = (rawSpec.match(/Total tiles \(horizontal\)[^\d]*(\d+)/i)?.[1]) ?? null;
    const totalV = (rawSpec.match(/Total tiles \(vertical\)[^\d]*(\d+)/i)?.[1]) ?? null;
    const gridPair = totalH && totalV ? [Number(totalH), Number(totalV)] : null;
    const totalSheet = rawSpec.match(/Total tiles in sheet[^\d]*(\d+)/i)?.[1];

    const md = [
      "Tileset: Kenney Tiny Town (spaced atlas)",
      `Source: https://kenney.nl/assets/tiny-town`,
      `Image stored: ${tsName}`,
      `Spec stored: ${spName}`,
      lgName ? `Legend stored: ${lgName}` : null,
      "",
      "```tileset",
      `tile_size: ${sizePair ? `${sizePair[0]}x${sizePair[1]} px` : "unknown"}`,
      `spacing:   ${spacePair ? `${spacePair[0]}x${spacePair[1]} px` : "unknown"}`,
      `grid:      ${gridPair ? `${gridPair[0]}x${gridPair[1]} tiles` : "unknown"}`,
      `count:     ${totalSheet ? Number(totalSheet) : "unknown"}`,
      "```",
      "",
      "Usage notes:",
      "- Treat as a 16×16 grid with 1px gutters (if spec says so).",
      "- Include spacing when slicing.",
      "- Stable name: `kenney_tiny_town_spaced_16`."
    ].filter(Boolean).join("\n");

    appendProjectMemory(projectId, md);

    res.json({
      ok: true,
      stored: { tileset: tsName, spec: spName, legend: lgName || null },
      parsed: {
        tile_size: sizePair || null,
        spacing: spacePair || null,
        grid: gridPair || null,
        count: totalSheet ? Number(totalSheet) : null
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

/* ---------------- Map generation ---------------- */
app.post("/api/map/generate", async (req, res) => {
  try {
    const { projectId = "sketchtiler", prompt = "" } = req.body || {};
    if (!prompt.trim()) return res.status(400).json({ error: "prompt is required" });

    const uploadDir = ensureUploadDir(projectId);
    const jsons = fs.readdirSync(uploadDir).filter(f => f.toLowerCase().endsWith(".json"));
    jsons.sort((a, b) => fs.statSync(path.join(uploadDir, b)).mtimeMs - fs.statSync(path.join(uploadDir, a)).mtimeMs);
    let legendMap = {};
    let bounds = { cols: 12, rows: 11 };
    if (jsons[0]) {
      try {
        const raw = fs.readFileSync(path.join(uploadDir, jsons[0]), "utf8");
        const legend = JSON.parse(raw);
        if (legend?.meta?.cols && legend?.meta?.rows) {
          bounds = { cols: Number(legend.meta.cols), rows: Number(legend.meta.rows) };
        }
        if (Array.isArray(legend?.tiles)) {
          for (const t of legend.tiles) {
            if (t?.name && t.name.trim()) {
              legendMap[t.name.trim().toLowerCase()] = { col: Number(t.col), row: Number(t.row) };
            }
          }
        }
      } catch {}
    }

    const system = [
      "You convert natural language into a tilemap JSON for a 2D grid.",
      "Return ONLY valid minified JSON with keys: width, height, tiles[].",
      "Each tile: { x, y, col, row } where (col,row) index into the tileset atlas (0-based).",
      `Use only indices within 0 <= col < ${bounds.cols} and 0 <= row < ${bounds.rows}.`,
      "Never include comments or extra text.",
      "If the user names tiles, map them using this legend (case-insensitive):",
      JSON.stringify(legendMap),
      "Always include at least one tile."
    ].join(" ");

    const user = `Create a tilemap from this request:\n${prompt}\n\nOutput JSON as: {"width":W,"height":H,"tiles":[{"x":0,"y":0,"col":C,"row":R}]}`;

    const result = await llm.invoke([
      { role: "system", content: system },
      { role: "user", content: user }
    ]);

    let text =
      result?.content?.map?.(c => c?.text).join("") ||
      result?.content?.text ||
      String(result?.content || "");

    const match = text.match(/\{[\s\S]*\}$/);
    if (match) text = match[0];

    const data = JSON.parse(text);

    if (typeof data.width !== "number" || typeof data.height !== "number" || !Array.isArray(data.tiles)) {
      return res.status(400).json({ error: "Invalid JSON shape from model." });
    }

    data.tiles = data.tiles.filter(t =>
      Number.isFinite(t.x) && Number.isFinite(t.y) &&
      Number.isFinite(t.col) && Number.isFinite(t.row) &&
      t.col >= 0 && t.row >= 0 && t.col < bounds.cols && t.row < bounds.rows
    );

    res.json({ ok: true, map: data });
  } catch (e) {
    console.error("map/generate error:", e);
    res.status(500).json({ error: "Failed to generate map JSON." });
  }
});

/* ---------------- Tileset meta ---------------- */
app.get("/api/memory/tileset-meta", (req, res) => {
  try {
    const projectId = req.query.projectId || "sketchtiler";
    const mem = readProjectMemory(projectId) || "";

    const size = mem.match(/tile_size:\s*(\d+)\s*x\s*(\d+)/i);
    const spacing = mem.match(/spacing:\s*(\d+)\s*x\s*(\d+)/i);
    const tileWidth  = size ? Number(size[1]) : 16;
    const tileHeight = size ? Number(size[2]) : 16;
    const spaceX     = spacing ? Number(spacing[1]) : 1;
    const spaceY     = spacing ? Number(spacing[2]) : 1;

    const uploadDir = ensureUploadDir(projectId);
    const filesPng = fs.readdirSync(uploadDir).filter(f => f.toLowerCase().endsWith(".png"))
      .sort((a,b)=>fs.statSync(path.join(uploadDir,b)).mtimeMs - fs.statSync(path.join(uploadDir,a)).mtimeMs);
    const filesJson = fs.readdirSync(uploadDir).filter(f => f.toLowerCase().endsWith(".json"))
      .sort((a,b)=>fs.statSync(path.join(uploadDir,b)).mtimeMs - fs.statSync(path.join(uploadDir,a)).mtimeMs);
    const latestPng  = filesPng[0]  || null;
    const latestJson = filesJson[0] || null;

    const base = `/uploads/${encodeURIComponent(projectId)}/`;
    const tilesetUrl = latestPng  ? `${base}${encodeURIComponent(latestPng)}`  : null;
    const legendUrl  = latestJson ? `${base}${encodeURIComponent(latestJson)}` : null;

    let legendMeta = null;
    if (latestJson) {
      try {
        const raw = fs.readFileSync(path.join(uploadDir, latestJson), "utf8");
        const j = JSON.parse(raw);
        if (j?.meta) legendMeta = j.meta;
      } catch {}
    }

    res.json({ ok: true, tilesetUrl, legendUrl, legendMeta, tileWidth, tileHeight, spaceX, spaceY });
  } catch (e) {
    console.error("tileset-meta error:", e);
    res.status(500).json({ error: "Failed to read tileset meta." });
  }
});

/* ---------------- Annotator: upload (PNG + thumb) ---------------- */
// form-data: projectId, image
app.post("/api/annot/upload", annotUpload.single("image"), async (req, res) => {
  try {
    const projectId = req.body.projectId || "sketchtiler";
    if (!req.file) return res.status(400).json({ ok: false, error: "image is required" });

    const dir = ensureUploadDir(projectId);
    const stamp = Date.now();
    const base = crypto.randomBytes(6).toString("hex");
    const pngPath = path.join(dir, `${stamp}_${base}.png`);
    const thumbPath = path.join(dir, `${stamp}_${base}_thumb.png`);

    // Normalize to PNG + 512w thumbnail
    const img = sharp(req.file.buffer).png();
    const meta = await img.metadata();
    await img.toFile(pngPath);

    const maxW = 512;
    const scale = Math.min(1, maxW / (meta.width || maxW));
    await sharp(req.file.buffer).resize({
      width: Math.round((meta.width || maxW) * scale)
    }).png().toFile(thumbPath);

    res.json({
      ok: true,
      imageUrl: `/uploads/${encodeURIComponent(projectId)}/${path.basename(pngPath)}`,
      thumbUrl: `/uploads/${encodeURIComponent(projectId)}/${path.basename(thumbPath)}`,
      width: meta.width || null,
      height: meta.height || null
    });
  } catch (e) {
    console.error("annot/upload error:", e);
    res.status(500).json({ ok: false, error: "failed to upload" });
  }
});

/* ---------------- Listen ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
