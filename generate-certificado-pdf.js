const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const TEMPLATE_URL =
  "https://21ef14ceede06d8f2ec712516a20a8e7.cdn.bubble.io/f1771260283793x887263521069773400/CERTIFICADO%20CALIFICA.docx";

/** Cache the template buffer so we only download it once */
let cachedTemplate = null;

async function fetchTemplate() {
  if (cachedTemplate) return cachedTemplate;
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error(`Template fetch failed: ${res.status}`);
  cachedTemplate = Buffer.from(await res.arrayBuffer());
  return cachedTemplate;
}

/**
 * Generate a certificate PDF by:
 * 1. Downloading the .docx template from Bubble CDN
 * 2. Replacing {placeholders} with docxtemplater
 * 3. Converting the filled .docx to PDF via Puppeteer
 *
 * @param {Object} data — { titulo, nombre, descripcion, fecha, id }
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateCertificadoPdf(data) {
  const { titulo = "", nombre = "", descripcion = "", fecha = "", id = "" } = data;

  // 1. Get template
  const templateBuf = await fetchTemplate();

  // 2. Fill placeholders using docxtemplater
  const zip = new PizZip(templateBuf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Don't throw on missing placeholders — replace with empty string
    nullGetter() { return ""; },
  });

  doc.render({
    titulo,
    nombre,
    descripcion,
    fecha,
    ID: id,
  });

  const filledDocxBuf = doc.getZip().generate({
    type: "nodebuffer",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  // 3. Convert DOCX to PDF
  // Use libre office if available, otherwise fall back to Puppeteer HTML render
  // For now: upload to the Cloudflare worker that Califica already uses for DOCX→PDF
  const WORKER_URL = "https://little-violet-31c9.arturo-5ab.workers.dev";

  const formData = new FormData();
  const blob = new Blob([filledDocxBuf], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  formData.append("files", blob, "Certificado.docx");

  const workerRes = await fetch(WORKER_URL, {
    method: "POST",
    body: formData,
  });

  if (!workerRes.ok) {
    const errText = await workerRes.text().catch(() => "");
    throw new Error(`PDF conversion failed: ${workerRes.status} ${errText}`);
  }

  const pdfBuffer = Buffer.from(await workerRes.arrayBuffer());
  if (pdfBuffer.length === 0) {
    throw new Error("PDF conversion returned empty buffer");
  }

  return pdfBuffer;
}

module.exports = { generateCertificadoPdf };
