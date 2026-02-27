# Califica API

Express API for generating student-facing PDF and DOCX exams, with an answer key page at the end.

## Endpoints

- `GET /health` -> `{ "status": "ok" }`
- `POST /pdf` -> `application/pdf`
- `POST /docx` -> `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `POST /pdf-json` -> JSON with base64 PDF payload
- `POST /docx-json` -> JSON with base64 DOCX payload

Protected endpoints require the `x-api-key` header with the value from `API_KEY`.

Request body can be either:
- raw exam object: `{ "title": "...", "sections": [...] }`
- wrapped exam object: `{ "examData": { ... } }` (also supports `data`, `payload`, or `exam`)

`/pdf-json` and `/docx-json` return this shape:

```json
{
  "success": true,
  "fileName": "science-and-reading-exam.pdf",
  "mimeType": "application/pdf",
  "base64": "<very long base64 string>",
  "dataUrl": "data:application/pdf;base64,<same base64>"
}
```

## Local run

```bash
npm install
cp .env.example .env
set API_KEY=test-key
node server.js
```

PowerShell:

```powershell
$env:API_KEY = "test-key"
node server.js
```

## Smoke test

```bash
npm run smoke
```

This generates `test.pdf` and `test.docx` in this folder from `sample-exam.json`.

## Curl examples

```bash
curl -X POST http://localhost:3000/pdf ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: test-key" ^
  --data-binary "@sample-exam.json" ^
  -o test.pdf
```

```bash
curl -X POST http://localhost:3000/docx ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: test-key" ^
  --data-binary "@sample-exam.json" ^
  -o test.docx
```

## Bubble iframe fetch update

Add the API key header to both download functions:

```js
const CALIFICA_API_URL = "https://your-railway-url.up.railway.app";
const CALIFICA_API_KEY = "your-api-key";

fetch(`${CALIFICA_API_URL}/pdf`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": CALIFICA_API_KEY
  },
  body: JSON.stringify(examData)
});
```

Ready-to-paste version: `bubble-fetch-snippet.js`.

## Railway deploy

1. Authenticate CLI (on your machine/session):

```bash
railway login
```

2. In this folder, initialize and link service:

```bash
railway init
```

3. Set required env var:

```bash
railway variables set API_KEY=your-strong-key
```

4. Deploy:

```bash
railway up
```

5. Verify:

```bash
curl https://<your-service>.up.railway.app/health
```
