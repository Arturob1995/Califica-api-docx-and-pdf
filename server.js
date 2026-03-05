const express = require("express");
const cors = require("cors");
const { generatePdf, closeBrowser } = require("./pdf-generator");
const { generateDocx } = require("./docx-generator");
const { normalizeExamData } = require("./exam-utils");
const { generatePDCDocx } = require("./generate-pdc-docx");
const { generatePDCPdf, closePDCBrowser } = require("./generate-pdc-pdf");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());

// Capture ALL request bodies as raw Buffers regardless of Content-Type.
// This avoids express.json() throwing on malformed bodies from Bubble.
app.use(express.raw({ limit: "5mb", type: "*/*" }));

// Parse the raw buffer into JSON, handling every Bubble.io quirk:
//  - wrong Content-Type headers
//  - double-escaped quotes (""key"")
//  - outer-quote wrapping ("{ ... }")
//  - URL-encoded bodies (%7B%22...%22%7D)
//  - form-encoded wrappers (data={...})
app.use((req, _res, next) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    req.body = {};
    return next();
  }

  let raw = req.body.toString("utf8").trim();

  // Strip UTF-8 BOM if present
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  console.log("[body-parser] Content-Type:", req.headers["content-type"]);
  console.log("[body-parser] raw body (first 300 chars):", raw.slice(0, 300));

  // 1) Try parsing as-is (happy path: proper JSON with correct Content-Type)
  try { req.body = JSON.parse(raw); return next(); } catch (_) {}

  // 2) Bubble sends literal \n \r \t instead of real whitespace — unescape them
  if (raw.includes("\\n") || raw.includes("\\r") || raw.includes("\\t")) {
    const unescaped = raw
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");
    try { req.body = JSON.parse(unescaped); return next(); } catch (_) {}
  }

  // 4) URL-decode if the body looks URL-encoded
  if (raw.includes("%7B") || raw.includes("%22")) {
    try {
      const decoded = decodeURIComponent(raw);
      req.body = JSON.parse(decoded);
      return next();
    } catch (_) {}
  }

  // 3) Form-encoded wrapper: key=value  (e.g. data={...} or payload={...})
  if (raw.includes("=") && !raw.startsWith("{") && !raw.startsWith('"')) {
    const value = raw.slice(raw.indexOf("=") + 1);
    try {
      req.body = JSON.parse(decodeURIComponent(value));
      return next();
    } catch (_) {}
    try {
      req.body = JSON.parse(value);
      return next();
    } catch (_) {}
  }

  // 4) Strip outer quotes that Bubble wraps around the body
  if (raw.length >= 2 && raw[0] === '"' && raw[raw.length - 1] === '"') {
    raw = raw.slice(1, -1);
  }

  // 5) Fix doubled-quote escaping: ""key"" -> "key"
  if (raw.includes('""')) {
    raw = raw.replace(/""/g, '"');
  }

  try { req.body = JSON.parse(raw); return next(); } catch (lastErr) {
    // Nothing worked — log the last parse error for diagnosis
    console.error("[body-parser] could not parse body:", lastErr.message);
    console.error("[body-parser] first 50 char codes:", [...raw.slice(0, 50)].map(c => c.charCodeAt(0)).join(","));
    req.body = {};
    next();
  }
});

function authenticateApiKey(req, res, next) {
  const configuredApiKey = process.env.API_KEY;
  if (!configuredApiKey) {
    console.error("API_KEY environment variable is not set.");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const headerApiKey = req.header("x-api-key");
  if (!headerApiKey || headerApiKey !== configuredApiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

function hasValidExamBody(examData) {
  if (!examData || typeof examData !== "object" || Array.isArray(examData)) {
    return false;
  }

  const normalized = normalizeExamData(examData);
  return normalized.sections.length > 0;
}

function tryParseJsonString(value) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function extractExamData(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (!Array.isArray(payload) && payload.sections) {
    return payload;
  }

  const candidates = ["examData", "data", "payload", "exam"];
  for (const key of candidates) {
    if (!(key in payload)) {
      continue;
    }

    const value = payload[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }

    const parsed = tryParseJsonString(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  }

  return null;
}

function safeFileName(baseName) {
  return String(baseName || "exam")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "exam";
}

function toFilePayload(buffer, fileName, mimeType) {
  const base64 = buffer.toString("base64");
  return {
    success: true,
    fileName,
    mimeType,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`
  };
}

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/pdf", authenticateApiKey, async (req, res) => {
  try {
    const examData = extractExamData(req.body);
    if (!hasValidExamBody(examData)) {
      return res.status(400).json({ error: "Invalid examData body" });
    }

    const normalized = normalizeExamData(examData);
    const pdfBuffer = await generatePdf(examData);
    const fileName = `${safeFileName(normalized.title)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdfBuffer.length));
    res.setHeader("Content-Transfer-Encoding", "binary");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).end(pdfBuffer);
  } catch (error) {
    console.error("PDF generation failed:", error);
    return res.status(500).json({ error: "PDF generation failed" });
  }
});

app.post("/docx", authenticateApiKey, async (req, res) => {
  try {
    const examData = extractExamData(req.body);
    if (!hasValidExamBody(examData)) {
      return res.status(400).json({ error: "Invalid examData body" });
    }

    const normalized = normalizeExamData(examData);
    const docxBuffer = await generateDocx(examData);
    const fileName = `${safeFileName(normalized.title)}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(docxBuffer);
  } catch (error) {
    console.error("DOCX generation failed:", error);
    return res.status(500).json({ error: "DOCX generation failed" });
  }
});

app.post("/pdf-json", authenticateApiKey, async (req, res) => {
  try {
    const examData = extractExamData(req.body);
    if (!hasValidExamBody(examData)) {
      return res.status(400).json({ error: "Invalid examData body" });
    }

    const normalized = normalizeExamData(examData);
    const pdfBuffer = await generatePdf(examData);
    const fileName = `${safeFileName(normalized.title)}.pdf`;

    return res.status(200).json(
      toFilePayload(
        pdfBuffer,
        fileName,
        "application/pdf"
      )
    );
  } catch (error) {
    console.error("PDF JSON generation failed:", error);
    return res.status(500).json({ error: "PDF JSON generation failed" });
  }
});

app.post("/docx-json", authenticateApiKey, async (req, res) => {
  try {
    const examData = extractExamData(req.body);
    if (!hasValidExamBody(examData)) {
      return res.status(400).json({ error: "Invalid examData body" });
    }

    const normalized = normalizeExamData(examData);
    const docxBuffer = await generateDocx(examData);
    const fileName = `${safeFileName(normalized.title)}.docx`;

    return res.status(200).json(
      toFilePayload(
        docxBuffer,
        fileName,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    );
  } catch (error) {
    console.error("DOCX JSON generation failed:", error);
    return res.status(500).json({ error: "DOCX JSON generation failed" });
  }
});

// ─── PDC endpoints ──────────────────────────────────────────────────
const VALID_NIVELES = ["inicial", "primaria", "secundaria", "multigrado"];

app.post("/generate/pdc/docx", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.nivel) return res.status(400).json({ error: "Missing: nivel" });
    if (!VALID_NIVELES.includes(data.nivel)) return res.status(400).json({ error: "Invalid nivel" });
    const buffer = await generatePDCDocx(data);
    const filename = `PDC_${data.nivel}_${data.numero_pdc || 1}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("PDC DOCX error:", err);
    res.status(500).json({ error: "Failed to generate DOCX", details: err.message });
  }
});

app.post("/generate/pdc/pdf", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.nivel) return res.status(400).json({ error: "Missing: nivel" });
    if (!VALID_NIVELES.includes(data.nivel)) return res.status(400).json({ error: "Invalid nivel" });
    const pdfBuf = Buffer.from(await generatePDCPdf(data));
    const filename = `PDC_${data.nivel}_${data.numero_pdc || 1}.pdf`;
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuf.length,
      "Content-Transfer-Encoding": "binary",
      "Cache-Control": "no-store",
    });
    res.end(pdfBuf, "binary");
  } catch (err) {
    console.error("PDC PDF error:", err);
    res.status(500).json({ error: "Failed to generate PDF", details: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = app.listen(port, () => {
  console.log(`Califica API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);

  try {
    await closeBrowser();
    await closePDCBrowser();
  } catch (error) {
    console.error("Error while closing browser:", error);
  }

  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
