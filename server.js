// server.js
import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import rewriteHTML from "./rewrites/html.js";
import rewriteJS from "./rewrites/js-ast.js";
import rewriteSW from "./rewrites/sw-patch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, "public")));

function applyDevHeaders(res, upstreamHeaders = {}) {
  // コアヘッダ
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");

  // 可能なら upstream の重要なヘッダをコピー（Content-Type は上書きしない）
  if (upstreamHeaders) {
    ["cache-control", "content-language"].forEach(k => {
      if (upstreamHeaders[k]) res.setHeader(k, upstreamHeaders[k]);
    });
  }
}

// helper: target parse from ?url= or path /p/<encoded>
function parseTarget(req) {
  const u = new URL(req.protocol + "://" + req.get("host") + req.originalUrl);
  if (u.searchParams.get("url")) return u.searchParams.get("url");
  // path-style: /p/https%3A%2F%2F...
  const m = req.path.match(/^\/p\/(.+)$/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

app.all("/p/*", async (req, res) => {
  // Allow both GET/POST etc.
  const target = parseTarget(req) || req.query.url;
  if (!target) return res.status(400).send("No URL provided");

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: {
        ...req.headers,
        // make it look like a real browser
        "user-agent": req.headers["user-agent"] || "Mozilla/5.0 (Proxy)"
      },
      body: req.method === "GET" ? undefined : req.body,
      redirect: "follow"
    });
  } catch (e) {
    console.error("fetch error:", e.message);
    return res.status(502).send("Bad Gateway");
  }

  const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
  applyDevHeaders(res, upstream.headers.raw ? upstream.headers.raw() : upstream.headers);

  try {
    if (contentType.includes("text/html")) {
      const text = await upstream.text();
      // HTML rewrite: convert absolute/relative to /p/<encodedAbsolute>
      const out = await rewriteHTML(text, target);
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.status(upstream.status).send(out);
    } else if (contentType.includes("javascript") || contentType.includes("application/x-javascript")) {
      const js = await upstream.text();
      const out = await rewriteJS(js, target);
      res.setHeader("content-type", contentType);
      return res.status(upstream.status).send(out);
    } else if (contentType.includes("text/css")) {
      const css = await upstream.text();
      // simple css rewrite (could be improved)
      const out = css.replace(/url\(([^)]+)\)/g, (m, g1) => {
        let url = g1.replace(/["']/g, "").trim();
        try {
          const abs = new URL(url, target).href;
          return `url(/p/${encodeURIComponent(abs)})`;
        } catch {
          return m;
        }
      });
      res.setHeader("content-type", contentType);
      return res.status(upstream.status).send(out);
    } else {
      // binary stream: pipe through
      res.status(upstream.status);
      upstream.body.pipe(res);
    }
  } catch (e) {
    console.error("rewrite pipeline error:", e);
    res.status(500).send("Proxy rewrite error");
  }
});

// convenience root index
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(3000, () => console.log("Proxy running at http://localhost:3000"));
