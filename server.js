const express = require("express");
const cors = require("cors");
const { generatePdf, closeBrowser } = require("./pdf-generator");
const { generateDocx } = require("./docx-generator");
const { normalizeExamData } = require("./exam-utils");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  return next(err);
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
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
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
  } catch (error) {
    console.error("Error while closing browser:", error);
  }

  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
