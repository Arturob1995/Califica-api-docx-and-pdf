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
        <div style="width: 100%; text-align: center; font-size: 8px; color: #6b7280; padding: 0 10mm;">
          ${headerTitle}
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 8px; color: #6b7280;">
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
  closeBrowser
};
