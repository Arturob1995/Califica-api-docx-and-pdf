const puppeteer = require("puppeteer");
const { buildPresentationHtml } = require("./presentation-html-template");

// ─── Lazy browser singleton (separate from exam & PDC browser instances) ─────
let browserPromise = null;
const TIMEOUT_MS = Number(process.env.PDF_RENDER_TIMEOUT_MS || 45000);

function getBrowser() {
  if (!browserPromise) {
    const opts = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-zygote",
      ],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    browserPromise = puppeteer.launch(opts);
  }
  return browserPromise;
}

async function closePresentationBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}

// ─── Generate presentation PDF using Puppeteer ──────────────────────────────
async function generatePresentationPdf(data) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(TIMEOUT_MS);
    page.setDefaultTimeout(TIMEOUT_MS);

    const html = buildPresentationHtml(data);
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT_MS,
    });
    await page.emulateMediaType("screen");
    await page.evaluate(() =>
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
    );

    const pdfPromise = page.pdf({
      landscape: true,
      width: "960px",
      height: "540px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
    });

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`PDF render timeout after ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);
      timer.unref?.();
    });

    return await Promise.race([pdfPromise, timeoutPromise]);
  } finally {
    await page.close();
  }
}

module.exports = { generatePresentationPdf, closePresentationBrowser };
