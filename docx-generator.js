const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} = require("docx");
const { normalizeExamData, buildAnswerKeyEntries } = require("./exam-utils");

function sectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: 280,
      after: 120
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: "1E3A8A",
        font: "Calibri"
      })
    ]
  });
}

function normalParagraph(text, options = {}) {
  return new Paragraph({
    spacing: {
      after: options.after ?? 120
    },
    indent: options.indent
      ? {
          left: options.indent
        }
      : undefined,
    children: [
      new TextRun({
        text,
        italics: Boolean(options.italics),
        bold: Boolean(options.bold),
        color: options.color,
        font: "Calibri",
        size: 22
      })
    ]
  });
}

function metadataTable(exam, dateValue, totalQuestions) {
  const borderColor = "D1D5DB";
  const borders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 1, color: borderColor }
  };

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [normalParagraph(`Materia: ${exam.subject}`, { bold: true, after: 60 })]
          }),
          new TableCell({
            borders,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [normalParagraph(`Curso: ${exam.grade}`, { bold: true, after: 60 })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [normalParagraph(`Fecha: ${dateValue}`, { after: 60 })]
          }),
          new TableCell({
            borders,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [normalParagraph(`Preguntas: ${totalQuestions}`, { after: 60 })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [
              normalParagraph("Nombre del Estudiante: ________________________________", {
                after: 60
              })
            ]
          }),
          new TableCell({
            borders,
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [normalParagraph("Fecha: _______________", { after: 60 })]
          })
        ]
      })
    ]
  });
}

function renderQuestionParagraphs(question, questionNumber) {
  const blocks = [];
  const questionText = question.text || "Pregunta";

  blocks.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `${questionNumber}. `,
          bold: true,
          font: "Calibri",
          size: 22
        }),
        new TextRun({
          text: questionText,
          font: "Calibri",
          size: 22
        })
      ]
    })
  );

  if (question.instructions) {
    blocks.push(normalParagraph(question.instructions, { italics: true, color: "4B5563", after: 80 }));
  }

  if (question.type === "multiple_choice") {
    for (const option of question.options) {
      blocks.push(normalParagraph(`${option.label}) ${option.text}`, { indent: 360, after: 60 }));
    }
    return blocks;
  }

  if (question.type === "true_false") {
    blocks.push(normalParagraph("Verdadero / Falso: ___________________________", { indent: 360 }));
    return blocks;
  }

  if (question.type === "fill_blank") {
    blocks.push(normalParagraph("Respuesta: ______________________________________________", { indent: 360 }));
    return blocks;
  }

  blocks.push(normalParagraph("__________________________________________________________", { indent: 360, after: 60 }));
  blocks.push(normalParagraph("__________________________________________________________", { indent: 360, after: 60 }));
  blocks.push(normalParagraph("__________________________________________________________", { indent: 360, after: 120 }));
  return blocks;
}

function renderAnswerKeyBlocks(exam) {
  const entries = buildAnswerKeyEntries(exam);
  const blocks = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: {
        before: 0,
        after: 200
      },
      children: [
        new TextRun({
          text: "Clave de Respuestas",
          bold: true,
          color: "0F3B82",
          font: "Calibri"
        })
      ]
    })
  ];

  if (entries.length === 0) {
    blocks.push(normalParagraph("No se detectaron respuestas para este examen.", { italics: true }));
    return blocks;
  }

  const grouped = new Map();
  for (const entry of entries) {
    if (!grouped.has(entry.sectionTitle)) {
      grouped.set(entry.sectionTitle, []);
    }
    grouped.get(entry.sectionTitle).push(entry);
  }

  for (const [sectionTitle, sectionEntries] of grouped.entries()) {
    blocks.push(sectionHeading(sectionTitle));
    for (const entry of sectionEntries) {
      blocks.push(normalParagraph(`${entry.number}. ${entry.answer}`, { after: 70 }));
    }
  }

  return blocks;
}

async function generateDocx(examData) {
  const exam = normalizeExamData(examData);
  const dateValue = exam.date || new Date().toISOString().slice(0, 10);
  const totalQuestions = exam.sections.reduce(
    (count, section) => count + section.questions.length,
    0
  );

  const body = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
      spacing: { after: 150 },
      children: [
        new TextRun({
          text: exam.title,
          bold: true,
          color: "0F172A",
          font: "Calibri"
        })
      ]
    }),
    metadataTable(exam, dateValue, totalQuestions)
  ];

  if (exam.instructions) {
    body.push(sectionHeading("Instrucciones Generales"));
    body.push(normalParagraph(exam.instructions, { color: "374151" }));
  }

  let questionNumber = 1;
  for (const section of exam.sections) {
    body.push(sectionHeading(section.title));

    if (section.instructions) {
      body.push(normalParagraph(section.instructions, { italics: true, color: "4B5563" }));
    }

    if (section.passage) {
      body.push(normalParagraph("Texto de lectura:", { bold: true, after: 60 }));
      body.push(normalParagraph(section.passage, { color: "1F2937" }));
    }

    for (const question of section.questions) {
      body.push(...renderQuestionParagraphs(question, questionNumber));
      questionNumber += 1;
    }
  }

  body.push(...renderAnswerKeyBlocks(exam));

  const document = new Document({
    creator: "Califica API",
    title: exam.title,
    sections: [
      {
        properties: {},
        children: body
      }
    ]
  });

  return Packer.toBuffer(document);
}

module.exports = {
  generateDocx
};
