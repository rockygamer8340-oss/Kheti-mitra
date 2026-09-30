// Kheti Mitra local server
// Serves index.html and forwards AI requests to Gemini or Claude.
// Your API key stays here on the server and is never sent to the browser.
// Needs Node.js 18+ (no npm packages required).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

// ---- read .env (KEY=value per line) ----
function loadEnv() {
  const file = path.join(DIR, ".env");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const PROVIDER = GEMINI_KEY ? "gemini" : ANTHROPIC_KEY ? "claude" : null;

// ---- helpers ----
function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("too_large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
// Merge back-to-back turns with the same role (both APIs prefer alternating turns)
function mergeTurns(turns) {
  const out = [];
  for (const t of turns) {
    if (!t || !t.content) continue;
    const role = t.role === "assistant" ? "assistant" : "user";
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += "\n\n" + t.content;
    else out.push({ role, content: String(t.content) });
  }
  return out;
}
function errorCode(status) {
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 401 || status === 403) return "bad_key";
  return "upstream_error";
}

// ---- Gemini ----
async function askGemini(turns, images, json) {
  const contents = turns.map((t, i) => {
    const parts = [];
    if (i === turns.length - 1) {
      for (const img of images) parts.push({ inline_data: { mime_type: img.mediaType, data: img.data } });
    }
    parts.push({ text: t.content });
    return { role: t.role === "assistant" ? "model" : "user", parts };
  });
  const body = { contents, generationConfig: { maxOutputTokens: 2048, temperature: 0.4 } };
  if (json) body.generationConfig.responseMimeType = "application/json";

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY }, body: JSON.stringify(body) }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Gemini error:", r.status, data?.error?.message || "");
    const code = r.status === 400 && /model/i.test(data?.error?.message || "") ? "upstream_error" : errorCode(r.status);
    throw { status: r.status, code, message: data?.error?.message };
  }
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw { code: cand?.finishReason === "SAFETY" ? "refused" : "empty_completion" };
  return { text, truncated: cand?.finishReason === "MAX_TOKENS" };
}

// ---- Claude (Anthropic) ----
async function askClaude(turns, images, json) {
  const messages = turns.map((t, i) => {
    if (i === turns.length - 1 && t.role === "user" && images.length) {
      return {
        role: "user",
        content: [
          ...images.map((img) => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } })),
          { type: "text", text: t.content + (json ? "\n\nReply with only the JSON, no other text." : "") },
        ],
      };
    }
    return { role: t.role, content: i === turns.length - 1 && json ? t.content + "\n\nReply with only the JSON, no other text." : t.content };
  });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 2048, messages }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Claude error:", r.status, data?.error?.message || "");
    throw { status: r.status, code: r.status === 400 ? "upstream_error" : errorCode(r.status), message: data?.error?.message };
  }
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!text) throw { code: "empty_completion" };
  return { text, truncated: data.stop_reason === "max_tokens" };
}

// ---- server ----
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: !!PROVIDER, provider: PROVIDER });
  }

  if (url.pathname === "/api/ai" && req.method === "POST") {
    if (!PROVIDER) return send(res, 503, { error: "no_key" });
    try {
      const body = JSON.parse(await readBody(req));
      const turns = mergeTurns(Array.isArray(body.turns) ? body.turns : []);
      if (!turns.length || turns[turns.length - 1].role !== "user") return send(res, 400, { error: "invalid_request" });
      const images = (Array.isArray(body.images) ? body.images : []).slice(0, 4);
      const out = PROVIDER === "gemini" ? await askGemini(turns, images, !!body.json) : await askClaude(turns, images, !!body.json);
      return send(res, 200, out);
    } catch (e) {
      if (e?.message === "too_large") return send(res, 413, { error: "image_rejected" });
      return send(res, e?.status && e.status >= 400 ? e.status : 502, { error: e?.code || "upstream_error", message: e?.message });
    }
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(path.join(DIR, "index.html")).pipe(res);
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("");
  console.log("  Kheti Mitra is running:  http://localhost:" + PORT);
  if (PROVIDER === "gemini") console.log("  AI: Google Gemini (" + GEMINI_MODEL + ")");
  else if (PROVIDER === "claude") console.log("  AI: Claude (" + ANTHROPIC_MODEL + ")");
  else {
    console.log("  AI: NOT CONNECTED - no API key found.");
    console.log("  Create a .env file in this folder with a line like:");
    console.log("    GEMINI_API_KEY=your_key_here");
    console.log("  then stop (Ctrl + C) and run  npm start  again.");
  }
  console.log("  Press Ctrl + C to stop.");
  console.log("");
});
