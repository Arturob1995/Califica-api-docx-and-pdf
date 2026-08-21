const { normalizeExamData, buildAnswerKeyEntries, encabezadoLabels } = require("./exam-utils");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderQuestion(question, questionNumber) {
  const safeText = escapeHtml(question.text || "Pregunta");
  const safeInstructions = question.instructions
    ? `<p class="question-instructions">${escapeHtml(question.instructions)}</p>`
    : "";

  if (question.type === "multiple_choice") {
    const options = question.options
      .map(
        (option) =>
          `<li><span class="option-label">${escapeHtml(option.label)})</span> ${escapeHtml(
            option.text
          )}</li>`
      )
      .join("");

    return `
      <article class="question">
        <p class="question-text"><span class="q-number">${questionNumber}.</span> ${safeText}</p>
        ${safeInstructions}
        <ol class="options">
          ${options}
        </ol>
      </article>
    `;
  }

  if (question.type === "true_false") {
    return `
      <article class="question">
        <p class="question-text"><span class="q-number">${questionNumber}.</span> ${safeText}</p>
        ${safeInstructions}
        <p class="answer-placeholder">Verdadero / Falso: _______________________</p>
      </article>
    `;
  }

  if (question.type === "fill_blank") {
    return `
      <article class="question">
        <p class="question-text"><span class="q-number">${questionNumber}.</span> ${safeText}</p>
        ${safeInstructions}
        <p class="answer-placeholder">Respuesta: ____________________________________________</p>
      </article>
    `;
  }

  return `
    <article class="question">
      <p class="question-text"><span class="q-number">${questionNumber}.</span> ${safeText}</p>
      ${safeInstructions}
      <div class="open-lines">
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      </div>
    </article>
  `;
}

function renderAnswerKey(exam) {
  const entries = buildAnswerKeyEntries(exam);
  if (entries.length === 0) {
    return '<p class="key-empty">No se detectaron respuestas para este examen.</p>';
  }

  const sections = new Map();
  for (const entry of entries) {
    if (!sections.has(entry.sectionTitle)) {
      sections.set(entry.sectionTitle, []);
    }
    sections.get(entry.sectionTitle).push(entry);
  }

  let sectionBlocks = "";
  for (const [title, sectionEntries] of sections.entries()) {
    const answers = sectionEntries
      .map(
        (entry) =>
          `<li><span class="q-number">${entry.number}.</span> ${escapeHtml(entry.answer)}</li>`
      )
      .join("");
    sectionBlocks += `
      <section class="answer-key-section">
        <h3>${escapeHtml(title)}</h3>
        <ol>
          ${answers}
        </ol>
      </section>
    `;
  }

  return sectionBlocks;
}

function buildExamHtml(examData) {
  const exam = normalizeExamData(examData);
  const labels = encabezadoLabels(exam.pais);
  // La fecha SOLO se imprime si el que llama la mandó explícitamente. Antes caía
  // a `new Date()`: la fecha en que la docente DESCARGA, no la del examen, y en
  // ISO, que nadie escribe a mano en Latinoamérica. Imprime el martes, aplica el
  // viernes, y la hoja nace con la fecha equivocada. Sin fecha va la casilla en
  // blanco de la fila de abajo, que ya existía.
  const dateValue = exam.date || "";

  let questionNumber = 1;
  const sectionsHtml = exam.sections
    .map((section) => {
      const sectionQuestions = section.questions
        .map((question) => {
          const block = renderQuestion(question, questionNumber);
          questionNumber += 1;
          return block;
        })
        .join("");

      return `
        <section class="exam-section">
          <h2>${escapeHtml(section.title)}</h2>
          ${section.instructions ? `<p class="section-instructions">${escapeHtml(section.instructions)}</p>` : ""}
          ${section.passage ? `<div class="passage">${escapeHtml(section.passage)}</div>` : ""}
          ${sectionQuestions}
        </section>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(exam.title)}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #4C4C4C;
            font-family: "Nunito", "Segoe UI", Arial, sans-serif;
            font-size: 12.2pt;
            line-height: 1.45;
          }

          .page {
            width: 100%;
          }

          .exam-header {
            border-bottom: 2px solid #D9D9D9;
            margin-bottom: 14px;
            padding-bottom: 12px;
          }

          .exam-header h1 {
            color: #1F1F1F;
            font-size: 19pt;
            margin: 0 0 10px;
          }

          /* Tres datos que ya sabemos (materia, grado, cuántas preguntas). La
             fecha salió de acá: se llena a mano, así que vive en la fila de
             casillas de abajo. */
          .meta-grid {
            border: 1px solid #D9D9D9;
            border-radius: 8px;
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            padding: 10px 12px;
          }

          .meta-item {
            font-size: 10.8pt;
          }

          .meta-label {
            color: #616161;
            font-weight: 700;
            margin-right: 4px;
          }

          /* Nombre y apellidos manda; sección, fecha y nota son casillas cortas
             que se llenan a mano. Cuatro columnas: si se agrega una quinta,
             revisar que el nombre no quede sin espacio para escribirlo. */
          .student-row {
            display: grid;
            gap: 14px;
            grid-template-columns: 2fr 1fr 1fr 0.8fr;
            margin-bottom: 12px;
          }

          .field-box {
            border-bottom: 1px solid #D9D9D9;
            min-height: 23px;
            padding-bottom: 4px;
          }

          .instructions-box {
            background: #F5F3F0;
            border: 1px solid #D9D9D9;
            border-radius: 8px;
            margin: 12px 0 16px;
            padding: 10px 12px;
          }

          .instructions-box h3 {
            color: #FF6768;
            font-size: 11.4pt;
            margin: 0 0 4px;
            text-transform: uppercase;
          }

          .instructions-box p {
            margin: 0;
            white-space: pre-wrap;
          }

          .exam-section {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }

          .exam-section h2 {
            border-left: 4px solid #FF6768;
            color: #2F4060;
            font-size: 13pt;
            margin: 0 0 6px;
            padding-left: 10px;
          }

          .section-instructions {
            color: #616161;
            font-style: italic;
            margin: 0 0 8px;
            white-space: pre-wrap;
          }

          .passage {
            background: #F5F3F0;
            border: 1px solid #D9D9D9;
            border-radius: 6px;
            margin-bottom: 10px;
            padding: 10px;
            white-space: pre-wrap;
          }

          .question {
            margin-bottom: 10px;
            page-break-inside: avoid;
          }

          .question-text {
            margin: 0 0 4px;
            white-space: pre-wrap;
          }

          .q-number {
            font-weight: 700;
          }

          .question-instructions {
            color: #616161;
            font-size: 10.4pt;
            font-style: italic;
            margin: 0 0 5px;
            white-space: pre-wrap;
          }

          .options {
            list-style: none;
            margin: 0;
            padding-left: 8px;
          }

          .options li {
            margin-bottom: 3px;
          }

          .option-label {
            font-weight: 700;
          }

          .answer-placeholder {
            color: #2F4060;
            margin: 0;
          }

          .open-lines .line {
            border-bottom: 1px solid #D9D9D9;
            height: 18px;
            margin-bottom: 4px;
          }

          .answer-key-page {
            break-before: page;
            page-break-before: always;
          }

          .answer-key-page h2 {
            color: #FF6768;
            font-size: 16pt;
            margin: 0 0 10px;
          }

          .answer-key-section {
            margin-bottom: 12px;
            page-break-inside: avoid;
          }

          .answer-key-section h3 {
            border-bottom: 1px solid #D9D9D9;
            color: #2F4060;
            font-size: 12pt;
            margin: 0 0 6px;
            padding-bottom: 3px;
          }

          .answer-key-section ol {
            list-style: none;
            margin: 0;
            padding: 0;
          }

          .answer-key-section li {
            margin-bottom: 4px;
          }

          .key-empty {
            color: #616161;
            font-style: italic;
            margin: 8px 0 0;
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="exam-header">
            <h1>${escapeHtml(exam.title)}</h1>
            <div class="meta-grid">
              <div class="meta-item"><span class="meta-label">Materia:</span> ${escapeHtml(exam.subject)}</div>
              <div class="meta-item"><span class="meta-label">${escapeHtml(labels.grado)}:</span> ${escapeHtml(exam.grade)}</div>
              <div class="meta-item"><span class="meta-label">Preguntas:</span> ${questionNumber - 1}</div>
            </div>
          </header>

          <section class="student-row">
            <div>
              <div class="meta-label">Nombre y apellidos</div>
              <div class="field-box"></div>
            </div>
            <div>
              <div class="meta-label">${escapeHtml(labels.seccion)}</div>
              <div class="field-box"></div>
            </div>
            <div>
              <div class="meta-label">Fecha</div>
              <div class="field-box">${escapeHtml(dateValue)}</div>
            </div>
            <div>
              <div class="meta-label">Nota</div>
              <div class="field-box"></div>
            </div>
          </section>

          ${
            exam.instructions
              ? `
                <section class="instructions-box">
                  <h3>Instrucciones Generales</h3>
                  <p>${escapeHtml(exam.instructions)}</p>
                </section>
              `
              : ""
          }

          ${sectionsHtml}
        </main>

        <section class="answer-key-page">
          <h2>Clave de Respuestas</h2>
          ${renderAnswerKey(exam)}
        </section>
      </body>
    </html>
  `;
}

module.exports = {
  buildExamHtml
};
