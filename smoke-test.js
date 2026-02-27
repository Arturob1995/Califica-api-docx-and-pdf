const fs = require("fs");
const path = require("path");
const { generatePdf, closeBrowser } = require("./pdf-generator");
const { generateDocx } = require("./docx-generator");

async function run() {
  const samplePath = path.join(__dirname, "sample-exam.json");
  const examData = JSON.parse(fs.readFileSync(samplePath, "utf8"));

  const pdf = await generatePdf(examData);
  const docx = await generateDocx(examData);

  fs.writeFileSync(path.join(__dirname, "test.pdf"), pdf);
  fs.writeFileSync(path.join(__dirname, "test.docx"), docx);

  await closeBrowser();
  console.log(`Smoke test complete. PDF bytes=${pdf.length}, DOCX bytes=${docx.length}`);
}

run().catch(async (error) => {
  console.error("Smoke test failed:", error);
  try {
    await closeBrowser();
  } catch (_) {
    // Ignore close errors in failure path.
  }
  process.exit(1);
});
