const puppeteer = require("puppeteer");
const { buildExamHtml } = require("./exam-template");
const { normalizeExamData } = require("./exam-utils");

let browserPromise = null;

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
    const html = buildExamHtml(examData);
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const headerTitle = sanitizeHeaderText(exam.title || "Exam");
    return await page.pdf({
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
