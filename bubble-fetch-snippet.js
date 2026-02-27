const CALIFICA_API_URL = "https://your-railway-url.up.railway.app";
const CALIFICA_API_KEY = "your-api-key";

async function downloadPdf(examData) {
  // Keep iframe separate: pass examData from Bubble database directly.
  const response = await fetch(`${CALIFICA_API_URL}/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CALIFICA_API_KEY
    },
    body: JSON.stringify(examData)
  });

  if (!response.ok) {
    throw new Error(`PDF download failed (${response.status})`);
  }

  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "exam.pdf";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function downloadDocx(examData) {
  const response = await fetch(`${CALIFICA_API_URL}/docx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CALIFICA_API_KEY
    },
    body: JSON.stringify(examData)
  });

  if (!response.ok) {
    throw new Error(`DOCX download failed (${response.status})`);
  }

  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "exam.docx";
  link.click();
  URL.revokeObjectURL(link.href);
}

// Optional wrapper payload format also supported by the API:
// JSON.stringify({ examData })
