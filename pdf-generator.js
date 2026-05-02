const puppeteer = require("puppeteer");
const { buildExamHtml } = require("./exam-template");
const { normalizeExamData } = require("./exam-utils");

let browserPromise = null;
const PDF_RENDER_TIMEOUT_MS = Number(process.env.PDF_RENDER_TIMEOUT_MS || 45000);

function sanitizeHeaderText(value) {
  return String(value ?? "")
    .replace(/[<>&"'`]/g, "")
    .slice(0, 120);
}

async function getBrowser() {
  if (!browserPromise) {
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-zygote"
      ]
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browserPromise = puppeteer.launch(launchOptions);
  }

  return browserPromise;
}

async function generatePdf(examData) {
  const exam = normalizeExamData(examData);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(PDF_RENDER_TIMEOUT_MS);
    page.setDefaultTimeout(PDF_RENDER_TIMEOUT_MS);

    const html = buildExamHtml(examData);
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: PDF_RENDER_TIMEOUT_MS
    });
    await page.emulateMediaType("screen");
    await page.evaluate(() =>
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
    );

    const headerTitle = sanitizeHeaderText(exam.title || "Examen");
    const pdfPromise = page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        right: "18mm",
        bottom: "20mm",
        left: "18mm"
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 8px; color: #7D7D7D; padding: 0 10mm;">
          ${headerTitle}
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 8px; color: #7D7D7D;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `
    });

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`PDF render timeout after ${PDF_RENDER_TIMEOUT_MS}ms`));
      }, PDF_RENDER_TIMEOUT_MS);
      timer.unref?.();
    });

    return await Promise.race([pdfPromise, timeoutPromise]);
  } finally {
    await page.close();
  }
}

// Generic PDF generator that takes pre-built HTML (any source) and renders to PDF
// using the same Puppeteer instance as generatePdf. Used by /pdf-html endpoint
// for the "Crea tu ficha" feature on Califica — the Next.js side builds the HTML
// from a typed FichaLibreBody schema and forwards it here for rendering.
//
// The HTML is expected to be a fragment (e.g., <style>...</style><main>...</main>);
// this function wraps it in a minimal <!doctype html> shell with the Nunito web
// font loaded, so the PDF inherits Califica's brand typography.
async function generatePdfFromHtml(html, options = {}) {
  const { format = "Letter", margin = "0.5in" } = options;
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(PDF_RENDER_TIMEOUT_MS);
    page.setDefaultTimeout(PDF_RENDER_TIMEOUT_MS);

    const fullHtml = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;}body{font-family:'Nunito',Arial,sans-serif;}</style>
</head>
<body>${html}</body>
</html>`;

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
      timeout: PDF_RENDER_TIMEOUT_MS,
    });

    // Wait for web fonts (Nunito) to load before rendering — otherwise the PDF
    // ships with the system fallback font.
    await page.evaluate(() =>
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
    );

    const pdfPromise = page.pdf({
      format,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
      printBackground: true,
    });

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`PDF render timeout after ${PDF_RENDER_TIMEOUT_MS}ms`));
      }, PDF_RENDER_TIMEOUT_MS);
      pdfPromise.finally(() => clearTimeout(timer));
    });

    return await Promise.race([pdfPromise, timeoutPromise]);
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (!browserPromise) {
    return;
  }

  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}

module.exports = {
  generatePdf,
  generatePdfFromHtml,
  closeBrowser
};
