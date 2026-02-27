function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return "";
}

function toLetter(index) {
  const safeIndex = Number.isInteger(index) && index >= 0 ? index : 0;
  return String.fromCharCode(97 + (safeIndex % 26));
}

function normalizeOptionLabel(rawLabel, index) {
  const fallback = toLetter(index);
  if (rawLabel === null || rawLabel === undefined) {
    return fallback;
  }

  const cleaned = String(rawLabel).trim().toLowerCase().replace(/[.)]/g, "");
  if (/^[a-z]$/.test(cleaned)) {
    return cleaned;
  }

  const asNumber = Number(cleaned);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 26) {
    return toLetter(asNumber - 1);
  }

  return fallback;
}

function normalizeQuestionType(rawQuestion, options) {
  const rawType = firstNonEmpty(rawQuestion?.type, rawQuestion?.questionType).toLowerCase();

  if (
    rawType.includes("multiple") ||
    rawType === "mc" ||
    rawType.includes("choice") ||
    rawType.includes("seleccion")
  ) {
    return "multiple_choice";
  }

  if (rawType.includes("true") || rawType.includes("false") || rawType.includes("vf")) {
    return "true_false";
  }

  if (rawType.includes("fill") || rawType.includes("blank") || rawType.includes("completar")) {
    return "fill_blank";
  }

  if (rawType.includes("open") || rawType.includes("short") || rawType.includes("essay")) {
    return "open";
  }

  if (options.length > 0) {
    return "multiple_choice";
  }

  return "open";
}

function normalizeOptions(rawQuestion) {
  const rawOptions = asArray(
    rawQuestion?.options ??
      rawQuestion?.choices ??
      rawQuestion?.alternatives ??
      rawQuestion?.answers ??
      []
  );

  return rawOptions
    .map((rawOption, index) => {
      if (rawOption && typeof rawOption === "object") {
        const text = firstNonEmpty(
          rawOption.text,
          rawOption.option,
          rawOption.value,
          rawOption.label
        );
        if (!text) {
          return null;
        }
        const label = normalizeOptionLabel(
          firstNonEmpty(rawOption.key, rawOption.letter, rawOption.id),
          index
        );
        return { label, text };
      }

      const text = firstNonEmpty(rawOption);
      if (!text) {
        return null;
      }
      return { label: toLetter(index), text };
    })
    .filter(Boolean);
}

function normalizeQuestion(rawQuestion) {
  const options = normalizeOptions(rawQuestion);
  const type = normalizeQuestionType(rawQuestion, options);
  const text = firstNonEmpty(
    rawQuestion?.prompt,
    rawQuestion?.question,
    rawQuestion?.text,
    rawQuestion?.statement,
    rawQuestion?.enunciado
  );
  const instructions = firstNonEmpty(rawQuestion?.instructions, rawQuestion?.instruction);

  const answer =
    rawQuestion?.correctAnswer ??
    rawQuestion?.answer ??
    rawQuestion?.correct ??
    rawQuestion?.solution ??
    rawQuestion?.expectedAnswer ??
    rawQuestion?.rightAnswer;

  return {
    type,
    text,
    instructions,
    options,
    answer
  };
}

function normalizeSection(rawSection, index) {
  const rawQuestions = asArray(
    rawSection?.questions ??
      rawSection?.items ??
      rawSection?.prompts ??
      rawSection?.exercise ??
      []
  );

  return {
    title: firstNonEmpty(rawSection?.title, rawSection?.name, `Section ${index + 1}`),
    instructions: firstNonEmpty(
      rawSection?.instructions,
      rawSection?.description,
      rawSection?.guidance
    ),
    passage: firstNonEmpty(rawSection?.passage, rawSection?.reading, rawSection?.text),
    questions: rawQuestions.map(normalizeQuestion).filter((question) => question.text || question.options.length)
  };
}

function normalizeExamData(examData) {
  const safeExamData = examData && typeof examData === "object" ? examData : {};
  const rawSections = asArray(
    safeExamData.sections ??
      safeExamData.exam?.sections ??
      safeExamData.content?.sections ??
      safeExamData.data?.sections ??
      []
  );

  return {
    title: firstNonEmpty(safeExamData.title, safeExamData.examTitle, "Exam"),
    subject: firstNonEmpty(safeExamData.subject, safeExamData.course, safeExamData.area, "General"),
    grade: firstNonEmpty(safeExamData.grade, safeExamData.gradeLevel, safeExamData.level, "N/A"),
    date: firstNonEmpty(safeExamData.date, safeExamData.examDate),
    instructions: firstNonEmpty(
      safeExamData.instructions,
      safeExamData.generalInstructions,
      safeExamData.description
    ),
    sections: rawSections.map(normalizeSection).filter((section) => section.questions.length > 0)
  };
}

function normalizeTrueFalseAnswer(answer) {
  if (typeof answer === "boolean") {
    return answer ? "Verdadero" : "Falso";
  }

  const raw = firstNonEmpty(answer).toLowerCase();
  if (!raw) {
    return "";
  }

  if (["v", "verdadero", "true", "t", "1", "si", "yes"].includes(raw)) {
    return "Verdadero";
  }

  if (["f", "falso", "false", "0", "no"].includes(raw)) {
    return "Falso";
  }

  return raw;
}

function resolveMultipleChoiceAnswer(question) {
  const options = asArray(question.options);
  const answer = question.answer;

  if (answer === undefined || answer === null || answer === "") {
    return "";
  }

  const optionFromIndex = (rawIndex) => {
    if (!Number.isInteger(rawIndex)) {
      return null;
    }

    if (rawIndex >= 0 && rawIndex < options.length) {
      return options[rawIndex];
    }

    if (rawIndex >= 1 && rawIndex <= options.length) {
      return options[rawIndex - 1];
    }

    return null;
  };

  if (typeof answer === "number") {
    const matched = optionFromIndex(answer);
    return matched ? `${matched.label}) ${matched.text}` : String(answer);
  }

  if (typeof answer === "string") {
    const trimmed = answer.trim();
    if (!trimmed) {
      return "";
    }

    const letter = trimmed.toLowerCase().replace(/[.)]/g, "");
    if (/^[a-z]$/.test(letter)) {
      const matched = options.find((option) => option.label === letter);
      return matched ? `${matched.label}) ${matched.text}` : `${letter})`;
    }

    const asNumber = Number(trimmed);
    if (Number.isInteger(asNumber)) {
      const matched = optionFromIndex(asNumber);
      return matched ? `${matched.label}) ${matched.text}` : trimmed;
    }

    const matchedByText = options.find(
      (option) => option.text.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedByText) {
      return `${matchedByText.label}) ${matchedByText.text}`;
    }

    return trimmed;
  }

  if (typeof answer === "object") {
    const normalized = firstNonEmpty(answer.text, answer.value, answer.label);
    if (!normalized) {
      return "";
    }
    const matchedByText = options.find(
      (option) => option.text.toLowerCase() === normalized.toLowerCase()
    );
    if (matchedByText) {
      return `${matchedByText.label}) ${matchedByText.text}`;
    }
    return normalized;
  }

  return String(answer);
}

function buildAnswerKeyEntries(normalizedExam) {
  const entries = [];
  let questionNumber = 1;

  for (const section of normalizedExam.sections) {
    for (const question of section.questions) {
      let answerText = "";

      if (question.type === "multiple_choice") {
        answerText = resolveMultipleChoiceAnswer(question);
      } else if (question.type === "true_false") {
        answerText = normalizeTrueFalseAnswer(question.answer);
      } else if (question.type === "fill_blank") {
        answerText = firstNonEmpty(question.answer);
      }

      if (answerText) {
        entries.push({
          sectionTitle: section.title,
          number: questionNumber,
          answer: answerText
        });
      }

      questionNumber += 1;
    }
  }

  return entries;
}

module.exports = {
  normalizeExamData,
  buildAnswerKeyEntries
};
