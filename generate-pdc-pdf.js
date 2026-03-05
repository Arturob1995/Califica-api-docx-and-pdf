const puppeteer = require("puppeteer");

// ─── Lazy browser singleton (same pattern as exam pdf-generator) ─────
let browserPromise = null;
const TIMEOUT_MS = Number(process.env.PDF_RENDER_TIMEOUT_MS || 45000);

function getBrowser() {
  if (!browserPromise) {
    const opts = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--no-zygote"],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    browserPromise = puppeteer.launch(opts);
  }
  return browserPromise;
}

async function closePDCBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}

// ─── Califica brand colors ──────────────────────────────────────────
const C = {
  ORANGE_500: "#FF6768",
  ORANGE_100: "#FFD1D1",
  BLUE_700:   "#2F4060",
  NEUTRAL_900:"#1F1F1F",
  NEUTRAL_700:"#4C4C4C",
  NEUTRAL_600:"#616161",
  NEUTRAL_500:"#7D7D7D",
  SECTION_BG: "#F5F3F0",
  BORDER:     "#D9D9D9",
  ADAPT_BG:   "#C9E6FF",
  OBJ_BG:     "#FFF0BF",
  OBJ_BORDER: "#FFBD2E",
  WHITE:      "#FFFFFF",
};

const NIVEL_LABELS = {
  inicial:    "EDUCACI\u00d3N INICIAL EN FAMILIA COMUNITARIA",
  primaria:   "EDUCACI\u00d3N PRIMARIA COMUNITARIA VOCACIONAL",
  secundaria: "EDUCACI\u00d3N SECUNDARIA COMUNITARIA PRODUCTIVA",
  multigrado: "EDUCACI\u00d3N PRIMARIA COMUNITARIA VOCACIONAL<br>MULTIGRADO",
};

// ─── HTML helpers ───────────────────────────────────────────────────
function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderMomentos(text) {
  if (!text) return "";
  return text.replace(/\\n/g, "\n").split("\n").filter(l => l.trim()).map(l => {
    const isMom = /^(PR\u00c1CTICA|TEOR\u00cdA|VALORACI\u00d3N|PRODUCCI\u00d3N):?$/i.test(l.trim());
    return isMom
      ? `<div style="font-weight:700;color:${C.BLUE_700};margin-top:6px;">${esc(l.trim())}</div>`
      : `<div>${esc(l.trim())}</div>`;
  }).join("");
}

function renderCriterios(c) {
  if (!c) return "";
  let h = "";
  if (c.ser)   h += `<div><span class="crit-label">SER:</span> ${esc(c.ser)}</div>`;
  if (c.saber) h += `<div style="margin-top:3px;"><span class="crit-label">SABER:</span> ${esc(c.saber)}</div>`;
  if (c.hacer) h += `<div style="margin-top:3px;"><span class="crit-label">HACER:</span> ${esc(c.hacer)}</div>`;
  return h;
}

// ─── Area development table (used by primaria, secundaria) ──────────
function buildAreaTableHTML(area) {
  const sems = area.semanas || [];
  const rowCount = sems.length || 1;
  let h = `<table>
    <tr><th colspan="6" style="text-align:left;padding:6px 10px;">\u00c1rea de saberes y conocimiento: ${esc(area.area)}</th></tr>
    <tr><th style="width:15%">Objetivo de Aprendizaje</th><th style="width:14%">Contenidos</th><th style="width:26%">Momentos del Proceso Formativo</th><th style="width:12%">Recursos</th><th style="width:7%">Per\u00edodos</th><th style="width:26%">Criterios de Evaluaci\u00f3n</th></tr>`;
  sems.forEach((s, i) => {
    h += `<tr>`;
    if (i === 0) h += `<td rowspan="${rowCount}">${esc(area.objetivo_aprendizaje)}</td>`;
    h += `<td><div style="font-weight:700;font-size:8px;color:${C.NEUTRAL_500};margin-bottom:2px;">${esc(s.semana)}</div>${esc(s.contenido)}</td>`;
    h += `<td>${renderMomentos(s.momentos)}</td>`;
    h += `<td>${esc(s.recursos)}</td>`;
    h += `<td style="text-align:center;">${esc(s.periodos)}</td>`;
    h += `<td>${renderCriterios(s.criterios)}</td></tr>`;
  });
  h += `<tr><td colspan="6" class="adapt-cell"><div class="adapt-banner">ADAPTACIONES CURRICULARES</div>`;
  h += `<div class="adapt-sub">(Estudiantes con: dificultades en el aprendizaje, talento extraordinario o discapacidad)</div>`;
  if (area.adaptaciones_curriculares) h += `<div class="adapt-text">${esc(area.adaptaciones_curriculares)}</div>`;
  h += `</td></tr></table>`;
  return h;
}

// ─── Build complete HTML document ───────────────────────────────────
function buildHTML(data) {
  const { nivel, numero_pdc, datos_referenciales: dr, objetivo_holistico, desarrollo } = data;
  const nivelLabel = NIVEL_LABELS[nivel] || nivel.toUpperCase();
  const areasLabel = nivel === "inicial" ? "Campos" : "\u00c1reas";
  const areasVal = Array.isArray(dr.areas) ? dr.areas.join("  /  ") : esc(dr.areas || "");

  let fechasRow = "";
  if (dr.fechas && dr.fechas.length > 0) {
    fechasRow = `<tr><td class="lbl">Fechas</td>`;
    for (let i = 0; i < 3; i++) {
      const f = dr.fechas[i];
      fechasRow += `<td>${f ? `Del: ${esc(f.del)} &nbsp; Al: ${esc(f.al)}` : ""}</td>`;
    }
    fechasRow += `</tr>`;
  }

  // ── Desarrollo content based on nivel ──
  let desarrolloHTML = "";
  switch (nivel) {
    case "inicial":
      desarrolloHTML = `<table>
        <tr><th style="width:18%">Campos y \u00c1reas de Saberes y Conocimientos</th><th style="width:18%">Perfiles de Salida</th><th style="width:28%">Momentos del Proceso Formativo</th><th style="width:14%">Recursos</th><th style="width:22%">Criterios de Evaluaci\u00f3n</th></tr>`;
      (desarrollo.campos || []).forEach(c => {
        desarrolloHTML += `<tr><td style="font-weight:700;color:${C.ORANGE_500};">${esc(c.campo)}</td><td>${esc(c.perfil_salida)}</td><td>${renderMomentos(c.momentos)}</td><td>${esc(c.recursos)}</td><td>${esc(c.criterios_evaluacion)}</td></tr>`;
      });
      desarrolloHTML += `</table>`;
      if (desarrollo.adaptaciones_curriculares) {
        desarrolloHTML += `<div class="adapt-banner" style="margin-top:8px;">ADAPTACIONES CURRICULARES</div><div class="adapt-text">${esc(desarrollo.adaptaciones_curriculares)}</div>`;
      }
      break;

    case "primaria":
      (desarrollo.areas || []).forEach(a => { desarrolloHTML += buildAreaTableHTML(a); });
      break;

    case "secundaria":
      desarrolloHTML = buildAreaTableHTML({
        area: (dr.areas && dr.areas[0]) || "\u00c1rea",
        objetivo_aprendizaje: desarrollo.objetivo_aprendizaje,
        semanas: desarrollo.semanas,
        adaptaciones_curriculares: desarrollo.adaptaciones_curriculares,
      });
      break;

    case "multigrado": {
      const cc = desarrollo.contenidos_curriculares || {};
      const anios = cc.anios || ["Primer A\u00f1o", "Segundo A\u00f1o", "Tercer A\u00f1o"];
      desarrolloHTML += `<div style="font-weight:700;font-size:10px;color:${C.NEUTRAL_900};margin:12px 0 4px;">Contenidos Curriculares</div>`;
      desarrolloHTML += `<table><tr><th>Semana</th><th>\u00c1reas</th>`;
      anios.forEach(a => { desarrolloHTML += `<th>${esc(a)}</th>`; });
      desarrolloHTML += `</tr>`;
      (cc.semanas || []).forEach(sem => {
        const areaCount = (sem.areas || []).length || 1;
        (sem.areas || []).forEach((area, ai) => {
          desarrolloHTML += `<tr>`;
          if (ai === 0) desarrolloHTML += `<td rowspan="${areaCount}" style="font-weight:700;text-align:center;vertical-align:middle;">${esc(sem.semana)}</td>`;
          desarrolloHTML += `<td style="font-weight:600;">${esc(area.area)}</td>`;
          (area.contenidos_por_anio || []).forEach(c => { desarrolloHTML += `<td>${esc(c)}</td>`; });
          desarrolloHTML += `</tr>`;
        });
      });
      desarrolloHTML += `</table>`;

      desarrolloHTML += `<div style="font-weight:700;font-size:10px;color:${C.NEUTRAL_900};margin:16px 0 4px;">Desarrollo por A\u00f1o de Escolaridad</div>`;
      desarrolloHTML += `<table><tr><th style="width:9%">A\u00f1o</th><th style="width:18%">Objetivos de Aprendizaje</th><th style="width:27%">Momentos del Proceso Formativo</th><th style="width:13%">Recursos</th><th style="width:7%">Per\u00edodos</th><th style="width:26%">Criterios de Evaluaci\u00f3n</th></tr>`;
      (desarrollo.anios_desarrollo || []).forEach(d => {
        desarrolloHTML += `<tr><td style="font-weight:700;text-align:center;">${esc(d.anio)}</td><td>${esc(d.objetivo_aprendizaje)}</td><td>${renderMomentos(d.momentos)}</td><td>${esc(d.recursos)}</td><td style="text-align:center;">${esc(d.periodos)}</td><td>${renderCriterios(d.criterios)}</td></tr>`;
      });
      desarrolloHTML += `<tr><td colspan="6" class="adapt-cell"><div class="adapt-banner">ADAPTACIONES CURRICULARES</div>`;
      if (desarrollo.adaptaciones_curriculares) desarrolloHTML += `<div class="adapt-text">${esc(desarrollo.adaptaciones_curriculares)}</div>`;
      desarrolloHTML += `</td></tr></table>`;
      break;
    }
  }

  // ── Adaptaciones Significativas ──
  const asItems = data.adaptaciones_significativas && data.adaptaciones_significativas.length > 0
    ? data.adaptaciones_significativas
    : [{ contenido: "", discapacidad: "Estudiante 1:", adaptacion: "", criterio: "" },
       { contenido: "", discapacidad: "Estudiante 2:", adaptacion: "", criterio: "" }];

  let adaptSigHTML = `<table>
    <tr><th colspan="4">ADAPTACIONES CURRICULARES SIGNIFICATIVAS</th></tr>
    <tr><th>Contenido</th><th>Discapacidad / TDH / TEA y otros</th><th>Adaptaci\u00f3n</th><th>Criterio de Evaluaci\u00f3n</th></tr>`;
  asItems.forEach(r => {
    adaptSigHTML += `<tr><td>${esc(r.contenido) || "\u2014"}</td><td>${esc(r.discapacidad)}</td><td>${esc(r.adaptacion) || "\u2014"}</td><td>${esc(r.criterio) || "\u2014"}</td></tr>`;
  });
  adaptSigHTML += `</table>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Nunito', sans-serif;
    font-size: 10px;
    color: ${C.NEUTRAL_700};
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { padding: 24px 28px; }

  /* Title */
  .doc-title { text-align: center; margin-bottom: 16px; }
  .doc-title .nivel { font-size: 12px; font-weight: 800; color: ${C.NEUTRAL_900}; }
  .doc-title .pdc-num { font-size: 12px; font-weight: 800; color: ${C.NEUTRAL_900}; margin-top: 2px; }

  /* Section titles */
  .section-title {
    font-size: 11px; font-weight: 800; color: ${C.ORANGE_500};
    margin: 16px 0 8px; display: flex; align-items: center; gap: 6px;
  }
  .section-title::before {
    content: ''; width: 3px; height: 14px;
    background: ${C.ORANGE_500}; border-radius: 2px; display: inline-block;
  }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 10px; }
  th, td { border: 1px solid ${C.BORDER}; padding: 5px 7px; vertical-align: top; text-align: left; }
  th {
    background: ${C.ORANGE_100}; font-weight: 700; color: ${C.BLUE_700};
    font-size: 8px; text-transform: uppercase; text-align: center; letter-spacing: 0.3px;
  }
  .lbl { background: ${C.SECTION_BG}; font-weight: 700; color: ${C.NEUTRAL_700}; width: 120px; }

  /* Objetivo box */
  .obj-box {
    background: ${C.OBJ_BG}; border-left: 3px solid ${C.OBJ_BORDER};
    padding: 8px 12px; border-radius: 0 6px 6px 0;
    font-size: 9px; color: ${C.NEUTRAL_700}; line-height: 1.5; margin-bottom: 12px;
  }

  /* Criterios */
  .crit-label { font-weight: 700; color: ${C.ORANGE_500}; font-size: 9px; text-transform: uppercase; }

  /* Adaptaciones */
  .adapt-cell { background: ${C.ADAPT_BG}; }
  .adapt-banner {
    background: ${C.ADAPT_BG}; padding: 5px 10px;
    font-weight: 700; font-size: 8px; color: ${C.BLUE_700};
    text-transform: uppercase; letter-spacing: 0.3px;
  }
  .adapt-sub { padding: 0 10px 4px; font-size: 7.5px; color: ${C.NEUTRAL_600}; font-style: italic; }
  .adapt-text { padding: 4px 10px; font-size: 9px; color: ${C.NEUTRAL_600}; }

  /* Signatures */
  .signatures { display: flex; justify-content: center; gap: 100px; margin-top: 48px; }
  .sig-block { text-align: center; }
  .sig-line { width: 150px; height: 1px; background: ${C.NEUTRAL_700}; margin: 44px auto 4px; }
  .sig-label { font-size: 9px; font-weight: 700; color: ${C.NEUTRAL_600}; }

  /* Print */
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
<div class="page">
  <div class="doc-title">
    <div class="nivel">${nivelLabel}</div>
    <div class="pdc-num">PLAN DE DESARROLLO CURRICULAR N\u00ba ${numero_pdc || 1}</div>
  </div>

  <div class="section-title">Datos Referenciales</div>
  <table>
    <tr><td class="lbl">Distrito educativo</td><td>${esc(dr.distrito_educativo)}</td><td class="lbl">Unidad educativa</td><td>${esc(dr.unidad_educativa)}</td></tr>
    <tr><td class="lbl">Nivel</td><td>${esc(dr.nivel_display || nivel)}</td><td class="lbl">A\u00f1o de escolaridad</td><td>${esc(dr.anio_escolaridad)}</td></tr>
    ${dr.director ? `<tr><td class="lbl">Director/a</td><td colspan="3">${esc(dr.director)}</td></tr>` : ""}
    <tr><td class="lbl">Maestra/o</td><td colspan="3">${esc(dr.maestro)}</td></tr>
    <tr><td class="lbl">${areasLabel}</td><td colspan="3">${areasVal}</td></tr>
    <tr><td class="lbl">Trimestre</td><td colspan="3">${esc(dr.trimestre)}</td></tr>
    ${fechasRow}
  </table>

  <div class="section-title">Objetivo Hol\u00edstico de Nivel</div>
  <div class="obj-box">${esc(objetivo_holistico || "")}</div>

  <div class="section-title">Desarrollo</div>
  ${desarrolloHTML}

  <div class="section-title">Adaptaciones Curriculares Significativas</div>
  ${adaptSigHTML}

  <div class="signatures">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Maestra/o</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Director/a</div></div>
  </div>
</div>
</body>
</html>`;
}

// ─── Generate PDF using Puppeteer ───────────────────────────────────
async function generatePDCPdf(data) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(TIMEOUT_MS);
    page.setDefaultTimeout(TIMEOUT_MS);

    const html = buildHTML(data);
    await page.setContent(html, { waitUntil: "networkidle0", timeout: TIMEOUT_MS });
    await page.emulateMediaType("screen");
    await page.evaluate(() =>
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
    );

    const pdfResult = await page.pdf({
      format: "Letter",
      margin: { top: "12mm", right: "12mm", bottom: "16mm", left: "12mm" },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="width:100%;text-align:center;font-size:8px;color:#7D7D7D;font-family:sans-serif;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
    });

    return Buffer.from(pdfResult);
  } finally {
    await page.close();
  }
}

module.exports = { generatePDCPdf, closePDCBrowser };
