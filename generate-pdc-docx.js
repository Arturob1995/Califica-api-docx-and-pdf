const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} = require("docx");

// ─── Califica brand colors ──────────────────────────────────────────
const C = {
  ORANGE_500: "FF6768",
  ORANGE_100: "FFD1D1",
  BLUE_700:   "2F4060",
  NEUTRAL_900:"1F1F1F",
  NEUTRAL_700:"4C4C4C",
  NEUTRAL_600:"616161",
  SECTION_BG: "F5F3F0",
  BORDER:     "D9D9D9",
  ADAPT_BG:   "C9E6FF",
  OBJ_BG:     "FFF0BF",
};

const FONT = "Arial Narrow";
const SZ_TITLE = 22;
const SZ_BODY = 18;
const SZ_SECTION = 20;
const SZ_HDR = 16;

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: C.BORDER };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NO_BORDER = { style: BorderStyle.NONE, size: 0 };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const CELL_MARGINS = { top: 40, bottom: 40, left: 80, right: 80 };
const PAGE = { width: 12240, height: 15840 };
const MARGIN = { top: 720, right: 720, bottom: 720, left: 720 };
const CW = PAGE.width - MARGIN.left - MARGIN.right;

// ─── Helpers ────────────────────────────────────────────────────────
function txt(text, o = {}) {
  return new TextRun({
    text: text || "", font: FONT, size: o.size || SZ_BODY,
    bold: o.bold || false, italics: o.italics || false, color: o.color || C.NEUTRAL_700,
  });
}
function para(ch, o = {}) {
  return new Paragraph({
    children: Array.isArray(ch) ? ch : [ch],
    alignment: o.alignment || AlignmentType.LEFT,
    spacing: o.spacing || { after: 60 },
  });
}
function cPara(ch, o = {}) { return para(ch, { ...o, alignment: AlignmentType.CENTER }); }
function jPara(ch, o = {}) { return para(ch, { ...o, alignment: AlignmentType.JUSTIFIED }); }
function ePara() { return new Paragraph({ children: [txt("")], spacing: { after: 0 } }); }

function mkCell(children, o = {}) {
  const ps = Array.isArray(children) ? children : [children];
  const final = ps.map(c =>
    c instanceof Paragraph ? c : c instanceof TextRun ? para([c]) : para([txt(String(c))])
  );
  return new TableCell({
    borders: o.borders || BORDERS,
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    margins: CELL_MARGINS,
    shading: o.shading ? { fill: o.shading, type: ShadingType.CLEAR } : undefined,
    verticalAlign: o.verticalAlign || VerticalAlign.TOP,
    rowSpan: o.rowSpan, columnSpan: o.columnSpan,
    children: final.length > 0 ? final : [ePara()],
  });
}
function hCell(text, o = {}) {
  return mkCell([cPara([txt(text, { bold: true, size: SZ_HDR, color: C.BLUE_700 })])], { shading: C.ORANGE_100, ...o });
}
function lCell(text, o = {}) {
  return mkCell([para([txt(text, { bold: true, size: SZ_BODY, color: C.NEUTRAL_700 })])], { shading: C.SECTION_BG, ...o });
}
function tCell(text, o = {}) {
  return mkCell([para([txt(text || "", { size: SZ_BODY })])], o);
}

function momentosParas(text) {
  if (!text) return [ePara()];
  return text.replace(/\\n/g, "\n").split("\n").filter(l => l.trim()).map(l => {
    const isMom = /^(PR\u00c1CTICA|TEOR\u00cdA|VALORACI\u00d3N|PRODUCCI\u00d3N):?$/i.test(l.trim());
    return para(
      [txt(l.trim(), { bold: isMom, size: SZ_BODY, color: isMom ? C.BLUE_700 : C.NEUTRAL_700 })],
      { spacing: { after: 20 } }
    );
  });
}

function criteriosParas(c) {
  if (!c) return [ePara()];
  const p = [];
  if (c.ser)   p.push(para([txt("SER: ", { bold: true, size: SZ_BODY, color: C.ORANGE_500 }), txt(c.ser, { size: SZ_BODY })], { spacing: { after: 20 } }));
  if (c.saber) p.push(para([txt("SABER: ", { bold: true, size: SZ_BODY, color: C.ORANGE_500 }), txt(c.saber, { size: SZ_BODY })], { spacing: { after: 20 } }));
  if (c.hacer) p.push(para([txt("HACER: ", { bold: true, size: SZ_BODY, color: C.ORANGE_500 }), txt(c.hacer, { size: SZ_BODY })], { spacing: { after: 20 } }));
  return p.length > 0 ? p : [ePara()];
}

const NIVEL_LABELS = {
  inicial:    "EDUCACI\u00d3N INICIAL EN FAMILIA COMUNITARIA",
  primaria:   "EDUCACI\u00d3N PRIMARIA COMUNITARIA VOCACIONAL",
  secundaria: "EDUCACI\u00d3N SECUNDARIA COMUNITARIA PRODUCTIVA",
  multigrado: "EDUCACI\u00d3N PRIMARIA COMUNITARIA VOCACIONAL\nMULTIGRADO",
};

// ─── Datos Referenciales table ──────────────────────────────────────
function buildDatosRef(dr, nivel) {
  const w1 = 2000, w2 = 3400, w3 = 2200, w4 = 3200;
  const rows = [];
  rows.push(new TableRow({ children: [lCell("Distrito educativo", { width: w1 }), tCell(dr.distrito_educativo, { width: w2 }), lCell("Unidad educativa", { width: w3 }), tCell(dr.unidad_educativa, { width: w4 })] }));
  rows.push(new TableRow({ children: [lCell("Nivel", { width: w1 }), tCell(dr.nivel_display || dr.nivel, { width: w2 }), lCell("A\u00f1o de escolaridad", { width: w3 }), tCell(dr.anio_escolaridad, { width: w4 })] }));
  if (dr.director) {
    rows.push(new TableRow({ children: [lCell("Director/a", { width: w1 }), tCell(dr.director, { width: w2, columnSpan: 3 })] }));
  }
  rows.push(new TableRow({ children: [lCell("Maestra/o", { width: w1 }), tCell(dr.maestro, { width: w2, columnSpan: 3 })] }));
  const aLabel = nivel === "inicial" ? "Campos" : "\u00c1reas";
  const aVal = Array.isArray(dr.areas) ? dr.areas.join("  /  ") : (dr.areas || "");
  rows.push(new TableRow({ children: [lCell(aLabel, { width: w1 }), tCell(aVal, { width: w2, columnSpan: 3 })] }));
  rows.push(new TableRow({ children: [lCell("Trimestre", { width: w1 }), tCell(dr.trimestre, { width: w2, columnSpan: 3 })] }));
  if (dr.fechas && dr.fechas.length > 0) {
    const fc = [lCell("Fechas", { width: w1 })];
    for (let i = 0; i < 3; i++) {
      const f = dr.fechas[i];
      fc.push(tCell(f ? `Del: ${f.del}  Al: ${f.al}` : "", { width: i === 0 ? w2 : (i === 1 ? w3 : w4) }));
    }
    rows.push(new TableRow({ children: fc }));
  }
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [w1, w2, w3, w4], rows });
}

// ─── Adaptaciones Significativas table ──────────────────────────────
function buildAdaptSig(items) {
  const data = items && items.length > 0 ? items : [
    { contenido: "", discapacidad: "Estudiante 1:", adaptacion: "", criterio: "" },
    { contenido: "", discapacidad: "Estudiante 2:", adaptacion: "", criterio: "" },
  ];
  const w = 2700;
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [w, w, w, w],
    rows: [
      new TableRow({ children: [hCell("ADAPTACIONES CURRICULARES SIGNIFICATIVAS", { columnSpan: 4, width: CW })] }),
      new TableRow({ children: [hCell("Contenido", { width: w }), hCell("Discapacidad/TDH/TEA y otros", { width: w }), hCell("Adaptaci\u00f3n", { width: w }), hCell("Criterio de evaluaci\u00f3n", { width: w })] }),
      ...data.map(r => new TableRow({ children: [tCell(r.contenido, { width: w }), tCell(r.discapacidad, { width: w }), tCell(r.adaptacion, { width: w }), tCell(r.criterio, { width: w })] })),
    ],
  });
}

// ─── Primaria / Secundaria area table ───────────────────────────────
function buildPrimSecTable(ad) {
  const w = [1600, 1500, 2800, 1400, 700, 2800];
  const sems = ad.semanas || [];
  const dataRows = sems.map((s, i) => {
    const cells = [];
    if (i === 0) {
      cells.push(mkCell(
        [jPara([txt(ad.objetivo_aprendizaje || "", { size: SZ_BODY })])],
        { width: w[0], rowSpan: sems.length }
      ));
    }
    cells.push(mkCell([
      para([txt(s.semana, { bold: true, size: SZ_HDR, color: C.BLUE_700 })], { spacing: { after: 20 } }),
      para([txt(s.contenido || "", { size: SZ_BODY })]),
    ], { width: w[1] }));
    cells.push(mkCell(momentosParas(s.momentos), { width: w[2] }));
    cells.push(tCell(s.recursos || "", { width: w[3] }));
    cells.push(mkCell([cPara([txt(s.periodos || "", { size: SZ_BODY })])], { width: w[4] }));
    cells.push(mkCell(criteriosParas(s.criterios), { width: w[5] }));
    return new TableRow({ children: cells });
  });

  const adaptRow = new TableRow({
    children: [mkCell([
      para([txt("ADAPTACIONES CURRICULARES", { bold: true, size: SZ_HDR, color: C.BLUE_700 })], { spacing: { after: 40 } }),
      para([txt("(Estudiantes con: dificultades en el aprendizaje, talento extraordinario o discapacidad)", { size: SZ_HDR, italics: true, color: C.NEUTRAL_600 })], { spacing: { after: 60 } }),
      para([txt(ad.adaptaciones_curriculares || "", { size: SZ_BODY })]),
    ], { columnSpan: 6, width: CW, shading: C.ADAPT_BG })],
  });

  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: w,
    rows: [
      new TableRow({ children: [hCell(`\u00c1rea de saberes y conocimiento: ${ad.area}`, { columnSpan: 6, width: CW })] }),
      new TableRow({ children: [hCell("Objetivo de aprendizaje", { width: w[0] }), hCell("Contenidos", { width: w[1] }), hCell("Momentos del proceso formativo", { width: w[2] }), hCell("Recursos", { width: w[3] }), hCell("Per\u00edodos", { width: w[4] }), hCell("Criterios de evaluaci\u00f3n", { width: w[5] })] }),
      ...dataRows,
      adaptRow,
    ],
  });
}

// ─── Inicial table ──────────────────────────────────────────────────
function buildInicialTable(campos) {
  const w = [1900, 1900, 3000, 1500, 2500];
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: w,
    rows: [
      new TableRow({ children: [
        hCell("Campos y \u00c1reas de Saberes y Conocimientos", { width: w[0] }),
        hCell("Perfiles de Salida", { width: w[1] }),
        hCell("Momentos del Proceso Formativo", { width: w[2] }),
        hCell("Recursos", { width: w[3] }),
        hCell("Criterios de Evaluaci\u00f3n", { width: w[4] }),
      ] }),
      ...(campos || []).map(c => new TableRow({
        children: [
          mkCell([para([txt(c.campo, { bold: true, size: SZ_BODY, color: C.ORANGE_500 })])], { width: w[0] }),
          tCell(c.perfil_salida || "", { width: w[1] }),
          mkCell(momentosParas(c.momentos), { width: w[2] }),
          tCell(c.recursos || "", { width: w[3] }),
          tCell(c.criterios_evaluacion || "", { width: w[4] }),
        ],
      })),
    ],
  });
}

// ─── Multigrado: contenidos table ───────────────────────────────────
function buildMultigradoContenidos(cc) {
  const anios = cc.anios || ["Primer A\u00f1o", "Segundo A\u00f1o", "Tercer A\u00f1o"];
  const w0 = 1400, w1 = 1800;
  const wA = Math.floor((CW - w0 - w1) / anios.length);
  const cw = [w0, w1, ...anios.map(() => wA)];

  const dataRows = [];
  (cc.semanas || []).forEach(sem => {
    (sem.areas || []).forEach((area, ai) => {
      const cells = [];
      if (ai === 0) {
        cells.push(mkCell(
          [cPara([txt(sem.semana, { bold: true, size: SZ_BODY })])],
          { width: w0, rowSpan: sem.areas.length, verticalAlign: VerticalAlign.CENTER }
        ));
      }
      cells.push(mkCell([para([txt(area.area, { bold: true, size: SZ_BODY })])], { width: w1 }));
      (area.contenidos_por_anio || []).forEach(c => cells.push(tCell(c, { width: wA })));
      dataRows.push(new TableRow({ children: cells }));
    });
  });

  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: cw,
    rows: [
      new TableRow({ children: [hCell("Semana", { width: w0 }), hCell("\u00c1reas", { width: w1 }), ...anios.map(a => hCell(a, { width: wA }))] }),
      ...dataRows,
    ],
  });
}

// ─── Multigrado: desarrollo table ───────────────────────────────────
function buildMultigradoDesarrollo(devs, adapt) {
  const w = [1000, 1800, 2800, 1400, 700, 3100];
  const dataRows = (devs || []).map(d => new TableRow({
    children: [
      mkCell([cPara([txt(d.anio, { bold: true, size: SZ_BODY })])], { width: w[0], verticalAlign: VerticalAlign.CENTER }),
      tCell(d.objetivo_aprendizaje || "", { width: w[1] }),
      mkCell(momentosParas(d.momentos), { width: w[2] }),
      tCell(d.recursos || "", { width: w[3] }),
      mkCell([cPara([txt(d.periodos || "", { size: SZ_BODY })])], { width: w[4] }),
      mkCell(criteriosParas(d.criterios), { width: w[5] }),
    ],
  }));

  const adaptRow = new TableRow({
    children: [mkCell([
      para([txt("ADAPTACIONES CURRICULARES", { bold: true, size: SZ_HDR, color: C.BLUE_700 })], { spacing: { after: 40 } }),
      para([txt(adapt || "", { size: SZ_BODY })]),
    ], { columnSpan: 6, width: CW, shading: C.ADAPT_BG })],
  });

  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: w,
    rows: [
      new TableRow({ children: [
        hCell("A\u00f1o", { width: w[0] }),
        hCell("Objetivos de Aprendizaje", { width: w[1] }),
        hCell("Momentos del Proceso Formativo", { width: w[2] }),
        hCell("Recursos", { width: w[3] }),
        hCell("Per\u00edodos", { width: w[4] }),
        hCell("Criterios de Evaluaci\u00f3n", { width: w[5] }),
      ] }),
      ...dataRows,
      adaptRow,
    ],
  });
}

// ─── Main export ────────────────────────────────────────────────────
async function generatePDCDocx(data) {
  const { nivel, numero_pdc, datos_referenciales: dr, objetivo_holistico, desarrollo } = data;
  const nivelLabel = NIVEL_LABELS[nivel] || nivel.toUpperCase();
  const ch = [];

  // Title
  nivelLabel.split("\n").forEach(l =>
    ch.push(cPara([txt(l, { bold: true, size: SZ_TITLE, color: C.NEUTRAL_900 })], { spacing: { after: 0 } }))
  );
  ch.push(cPara(
    [txt(`PLAN DE DESARROLLO CURRICULAR N\u00ba ${numero_pdc || 1}`, { bold: true, size: SZ_TITLE, color: C.NEUTRAL_900 })],
    { spacing: { after: 200 } }
  ));

  // Datos Referenciales
  ch.push(jPara([txt("DATOS REFERENCIALES", { bold: true, size: SZ_SECTION, color: C.ORANGE_500 })], { spacing: { before: 100, after: 100 } }));
  ch.push(buildDatosRef(dr, nivel));

  // Desarrollo
  ch.push(jPara([txt("DESARROLLO", { bold: true, size: SZ_SECTION, color: C.ORANGE_500 })], { spacing: { before: 200, after: 100 } }));
  ch.push(jPara([txt("Objetivo hol\u00edstico de nivel", { bold: true, size: SZ_BODY, color: C.NEUTRAL_900 })], { spacing: { after: 60 } }));
  ch.push(jPara([txt(objetivo_holistico || "", { size: SZ_BODY })], { spacing: { after: 200 } }));

  switch (nivel) {
    case "inicial":
      ch.push(buildInicialTable(desarrollo.campos));
      break;
    case "primaria":
      (desarrollo.areas || []).forEach((a, i) => {
        if (i > 0) ch.push(para([txt("")], { spacing: { after: 100 } }));
        ch.push(buildPrimSecTable(a));
      });
      break;
    case "secundaria":
      ch.push(buildPrimSecTable({
        area: (dr.areas && dr.areas[0]) || "\u00c1rea",
        objetivo_aprendizaje: desarrollo.objetivo_aprendizaje,
        semanas: desarrollo.semanas,
        adaptaciones_curriculares: desarrollo.adaptaciones_curriculares,
      }));
      break;
    case "multigrado":
      ch.push(jPara([txt("Contenidos Curriculares", { bold: true, size: SZ_BODY, color: C.NEUTRAL_900 })], { spacing: { after: 100 } }));
      ch.push(buildMultigradoContenidos(desarrollo.contenidos_curriculares));
      ch.push(para([txt("")], { spacing: { after: 200 } }));
      ch.push(buildMultigradoDesarrollo(desarrollo.anios_desarrollo, desarrollo.adaptaciones_curriculares));
      break;
  }

  // Adaptaciones Significativas
  ch.push(para([txt("")], { spacing: { after: 200 } }));
  ch.push(buildAdaptSig(data.adaptaciones_significativas));

  // Signatures
  ch.push(para([txt("")], { spacing: { after: 400 } }));
  const sigW = CW / 2;
  ch.push(new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [sigW, sigW],
    rows: [new TableRow({
      children: [
        mkCell([
          para([txt("")], { spacing: { after: 600 } }),
          cPara([txt("_________________________", { size: SZ_BODY })], { spacing: { after: 20 } }),
          cPara([txt("Maestra/o", { bold: true, size: SZ_BODY })]),
        ], { borders: NO_BORDERS, width: sigW }),
        mkCell([
          para([txt("")], { spacing: { after: 600 } }),
          cPara([txt("_________________________", { size: SZ_BODY })], { spacing: { after: 20 } }),
          cPara([txt("Director/a", { bold: true, size: SZ_BODY })]),
        ], { borders: NO_BORDERS, width: sigW }),
      ],
    })],
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SZ_BODY } } } },
    sections: [{ properties: { page: { size: PAGE, margin: MARGIN } }, children: ch }],
  });
  return Packer.toBuffer(doc);
}

module.exports = { generatePDCDocx };
