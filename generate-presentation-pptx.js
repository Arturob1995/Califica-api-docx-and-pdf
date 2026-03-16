const PptxGenJS = require("pptxgenjs");

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapFont(fontId) {
  const map = {
    nunito: "Nunito",
    quicksand: "Quicksand",
    poppins: "Poppins",
    baloo2: "Baloo 2",
  };
  if (!fontId) return "Nunito";
  return map[fontId.toLowerCase()] || fontId;
}

function strip(hex) {
  if (!hex) return "333333";
  return String(hex).replace(/^#/, "");
}

function parseImageData(url) {
  if (!url) return null;
  if (url.startsWith("data:")) {
    // pptxgenjs v4 needs "image/type;base64,..." (strip only "data:")
    return { data: url.slice(5) };
  }
  return { path: url };
}

function lighten(hex, amount) {
  const h = strip(hex);
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return (
    nr.toString(16).padStart(2, "0") +
    ng.toString(16).padStart(2, "0") +
    nb.toString(16).padStart(2, "0")
  );
}

// ── Shared layout constants ────────────────────────────────────────────────

const W = 10;
const H = 5.625;

function addCounter(slide, idx, total, font, isLight) {
  slide.addText(`${idx + 1} / ${total}`, {
    x: W - 1.2,
    y: H - 0.45,
    w: 1.0,
    h: 0.3,
    fontSize: 9,
    fontFace: font,
    color: isLight ? "DDDDDD" : "999999",
    align: "right",
  });
}

function addEmojis(slide, emojis, font) {
  if (!emojis || !emojis.length) return;
  const positions = [
    { x: 0.3, y: 0.2 },
    { x: 8.8, y: 0.3 },
    { x: 9.0, y: 4.8 },
    { x: 0.2, y: 4.6 },
    { x: 4.5, y: 0.15 },
  ];
  positions.forEach((pos, i) => {
    slide.addText(emojis[i % emojis.length], {
      x: pos.x,
      y: pos.y,
      w: 0.5,
      h: 0.5,
      fontSize: 16,
      fontFace: font,
      color: "CCCCCC",
      align: "center",
    });
  });
}

function addBgImage(slide, imagenFondo) {
  if (!imagenFondo || !imagenFondo.url) return;
  const imgOpts = parseImageData(imagenFondo.url);
  if (!imgOpts) return;
  try {
    slide.addImage({
      ...imgOpts,
      x: 0,
      y: 0,
      w: W,
      h: H,
    });
  } catch (_) {
    // skip invalid images
  }
}

// ── Slide renderers ──────────────────────────────────────────────────────────

function renderTitulo(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  const accent = s.color_acento || a1;
  slide.background = { fill: strip(accent) };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};
  const materia = c.materia || meta.materia || "";

  if (materia) {
    slide.addText(materia.toUpperCase(), {
      x: W / 2 - 1.5,
      y: 1.0,
      w: 3.0,
      h: 0.4,
      fontSize: 11,
      fontFace: font,
      bold: true,
      color: "FFFFFF",
      align: "center",
    });
  }

  slide.addText(c.titulo || meta.titulo || "Presentacion", {
    x: 0.8,
    y: 1.7,
    w: W - 1.6,
    h: 1.5,
    fontSize: 44,
    fontFace: font,
    bold: true,
    color: "FFFFFF",
    align: "center",
    wrap: true,
  });

  if (c.subtitulo) {
    slide.addText(c.subtitulo, {
      x: 1.5,
      y: 3.3,
      w: W - 3.0,
      h: 0.7,
      fontSize: 16,
      fontFace: font,
      color: "EEEEEE",
      align: "center",
      wrap: true,
    });
  }

  const parts = [meta.nombre_docente, meta.nombre_institucion].filter(Boolean);
  if (parts.length) {
    slide.addText(parts.join("  |  "), {
      x: 0.5,
      y: H - 0.7,
      w: W - 1.0,
      h: 0.4,
      fontSize: 12,
      fontFace: font,
      color: "DDDDDD",
      align: "center",
    });
  }

  addCounter(slide, idx, total, font, true);
}

function renderTextoSimple(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "FFF8E1" };
  addBgImage(slide, s.imagen_fondo);

  // Left accent bar
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.06,
    h: H,
    fill: { color: strip(s.color_acento || a1) },
  });

  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};
  if (c.titulo) {
    slide.addText(c.titulo, {
      x: 0.6,
      y: 0.3,
      w: W - 1.2,
      h: 0.8,
      fontSize: 30,
      fontFace: font,
      bold: true,
      color: "1F1F1F",
      align: "left",
      wrap: true,
    });
  }

  const body = c.cuerpo || c.texto || "";
  if (body) {
    slide.addText(body, {
      x: 0.6,
      y: 1.3,
      w: W - 1.2,
      h: H - 1.9,
      fontSize: 17,
      fontFace: font,
      color: "4C4C4C",
      align: "left",
      wrap: true,
    });
  }

  addCounter(slide, idx, total, font, false);
}

function renderTextoImagen(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "E3F2FD" };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};
  const accent = s.color_acento || a1;
  const imgLeft = c.layout === "imagen_izquierda";
  const textX = imgLeft ? 5.3 : 0.5;
  const imgX = imgLeft ? 0.3 : 5.3;

  if (c.titulo) {
    slide.addText(c.titulo, {
      x: textX,
      y: 0.3,
      w: 4.5,
      h: 0.8,
      fontSize: 26,
      fontFace: font,
      bold: true,
      color: strip(accent),
      align: "left",
      wrap: true,
    });
  }

  const body = c.cuerpo || c.texto || "";
  if (body) {
    slide.addText(body, {
      x: textX,
      y: 1.2,
      w: 4.5,
      h: H - 1.8,
      fontSize: 15,
      fontFace: font,
      color: "4C4C4C",
      align: "left",
      wrap: true,
    });
  }

  // Image
  const imgObj = c.imagen || {};
  const imgUrl = typeof imgObj === "string" ? imgObj : imgObj.url || "";
  if (imgUrl) {
    const imgOpts = parseImageData(imgUrl);
    if (imgOpts) {
      try {
        slide.addImage({
          ...imgOpts,
          x: imgX + 0.1,
          y: 0.4,
          w: 4.2,
          h: H - 0.9,
          sizing: { type: "contain", w: 4.2, h: H - 0.9 },
        });
      } catch (_) {
        // skip invalid images
      }
    }
  } else {
    slide.addShape("roundRect", {
      x: imgX,
      y: 0.3,
      w: 4.4,
      h: H - 0.7,
      rectRadius: 0.15,
      fill: { color: lighten(accent, 0.85) },
      line: { color: lighten(accent, 0.6), width: 1 },
    });
  }

  addCounter(slide, idx, total, font, false);
}

function renderNumeroGrande(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  const accent = s.color_acento || a1;
  slide.background = { fill: strip(accent) };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};

  slide.addText(String(c.numero != null ? c.numero : "0"), {
    x: 0.5,
    y: 0.8,
    w: W - 1.0,
    h: 2.5,
    fontSize: 56,
    fontFace: font,
    bold: true,
    color: "FFFFFF",
    align: "center",
    wrap: true,
  });

  const desc = c.descripcion || c.texto || "";
  if (desc) {
    slide.addText(desc, {
      x: 1.0,
      y: 3.3,
      w: W - 2.0,
      h: 1.2,
      fontSize: 16,
      fontFace: font,
      color: "EEEEEE",
      align: "center",
      wrap: true,
    });
  }

  addCounter(slide, idx, total, font, true);
}

function renderListaIconos(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "E8F5E9" };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};
  const accent = s.color_acento || a1;

  if (c.titulo) {
    slide.addText(c.titulo, {
      x: 0.5,
      y: 0.25,
      w: W - 1.0,
      h: 0.7,
      fontSize: 26,
      fontFace: font,
      bold: true,
      color: strip(accent),
      align: "left",
    });
  }

  const items = c.items || [];
  const startY = 1.1;
  const itemH = Math.min(0.8, (H - 1.7) / Math.max(items.length, 1));

  items.forEach((item, i) => {
    const y = startY + i * itemH;
    if (y + itemH > H - 0.4) return;

    slide.addText(item.icono || "•", {
      x: 0.5, y, w: 0.6, h: itemH,
      fontSize: 22, fontFace: font, align: "center",
    });

    slide.addText(item.titulo || "", {
      x: 1.2, y, w: W - 1.8, h: 0.35,
      fontSize: 16, fontFace: font, bold: true, color: "333333", align: "left",
    });

    if (item.descripcion) {
      slide.addText(item.descripcion, {
        x: 1.2, y: y + 0.32, w: W - 1.8, h: 0.35,
        fontSize: 14, fontFace: font, color: "666666", align: "left", wrap: true,
      });
    }
  });

  addCounter(slide, idx, total, font, false);
}

function renderDosColumnas(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "E3F2FD" };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};
  const accent = s.color_acento || a1;

  if (c.titulo) {
    slide.addText(c.titulo, {
      x: 0.5, y: 0.25, w: W - 1.0, h: 0.7,
      fontSize: 26, fontFace: font, bold: true, color: strip(accent), align: "left",
    });
  }

  const col1 = c.columna_izq || c.columna_izquierda || c.columna1 || {};
  const col2 = c.columna_der || c.columna_derecha || c.columna2 || {};
  const colStartY = 1.1;

  [col1, col2].forEach((col, ci) => {
    const colX = ci === 0 ? 0.5 : 5.2;
    const colColor = ci === 0 ? a1 : a2;
    const colW = 4.3;

    // Column card
    slide.addShape("roundRect", {
      x: colX - 0.1,
      y: colStartY - 0.1,
      w: colW + 0.2,
      h: H - colStartY - 0.3,
      rectRadius: 0.12,
      fill: { color: "FFFFFF" },
      line: { color: "E0E0E0", width: 0.5 },
    });

    // Top accent line
    slide.addShape("rect", {
      x: colX - 0.1,
      y: colStartY - 0.1,
      w: colW + 0.2,
      h: 0.05,
      fill: { color: strip(colColor) },
    });

    const subtitle = col.subtitulo || col.titulo || "";
    if (subtitle) {
      slide.addText(subtitle, {
        x: colX, y: colStartY + 0.05, w: colW, h: 0.45,
        fontSize: 16, fontFace: font, bold: true, color: strip(colColor), align: "left",
      });
    }

    const items = col.items || [];
    items.forEach((item, ii) => {
      const text = typeof item === "string" ? item : item.texto || String(item);
      const itemY = colStartY + 0.55 + ii * 0.45;
      if (itemY + 0.4 > H - 0.3) return;

      slide.addText(`•  ${text}`, {
        x: colX + 0.1, y: itemY, w: colW - 0.2, h: 0.4,
        fontSize: 14, fontFace: font, color: "444444", align: "left", wrap: true,
      });
    });
  });

  addCounter(slide, idx, total, font, false);
}

function renderTabla(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "FFF8E1" };
  addBgImage(slide, s.imagen_fondo);

  const c = s.contenido || {};
  const accent = s.color_acento || a1;

  if (c.titulo) {
    slide.addText(c.titulo, {
      x: 0.5, y: 0.2, w: W - 1.0, h: 0.7,
      fontSize: 26, fontFace: font, bold: true, color: strip(accent), align: "left",
    });
  }

  const headers = c.headers || c.encabezados || [];
  const rows = c.rows || c.filas || [];

  if (headers.length > 0 || rows.length > 0) {
    const tableRows = [];
    const colCount = headers.length || (rows[0] && rows[0].length) || 1;

    if (headers.length > 0) {
      tableRows.push(
        headers.map((h) => ({
          text: String(h),
          options: {
            bold: true, color: "FFFFFF", fill: { color: "FFA726" },
            fontSize: 13, fontFace: font, align: "center",
            border: { type: "solid", pt: 0.5, color: "E0E0E0" },
          },
        }))
      );
    }

    rows.forEach((fila, ri) => {
      const cells = (Array.isArray(fila) ? fila : []).map((cell) => ({
        text: String(cell),
        options: {
          fontSize: 12, fontFace: font, color: "444444",
          fill: { color: ri % 2 === 0 ? "FFFFFF" : "FFF8E1" },
          align: "center",
          border: { type: "solid", pt: 0.5, color: "E0E0E0" },
        },
      }));
      tableRows.push(cells);
    });

    if (tableRows.length > 0) {
      const colWidth = (W - 1.0) / colCount;
      slide.addTable(tableRows, {
        x: 0.5,
        y: 1.05,
        w: W - 1.0,
        colW: Array(colCount).fill(colWidth),
        border: { type: "solid", pt: 0.5, color: "E0E0E0" },
        autoPage: false,
      });
    }
  }

  addCounter(slide, idx, total, font, false);
}

function renderPregunta(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "7B1FA2" };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};

  // Question mark
  slide.addShape("ellipse", {
    x: W / 2 - 0.5, y: 0.6, w: 1.0, h: 1.0,
    fill: { color: "CE93D8" },
  });
  slide.addText("?", {
    x: W / 2 - 0.5, y: 0.6, w: 1.0, h: 1.0,
    fontSize: 40, fontFace: font, bold: true, color: "FFFFFF", align: "center",
  });

  const pregunta = c.pregunta || c.titulo || "";
  if (pregunta) {
    slide.addText(pregunta, {
      x: 0.8, y: 1.9, w: W - 1.6, h: 2.0,
      fontSize: 28, fontFace: font, bold: true, color: "FFFFFF", align: "center", wrap: true,
    });
  }

  if (c.pista) {
    slide.addText("💡 " + c.pista, {
      x: 1.5, y: 4.1, w: W - 3.0, h: 0.6,
      fontSize: 14, fontFace: font, color: "E1BEE7", align: "center", wrap: true,
    });
  }

  addCounter(slide, idx, total, font, true);
}

function renderActividad(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "FCE4EC" };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};

  slide.addText("✏️  " + (c.titulo || "Actividad"), {
    x: 0.4, y: 0.2, w: W - 0.8, h: 0.6,
    fontSize: 22, fontFace: font, bold: true, color: "C2185B", align: "left",
  });

  let nextY = 0.95;
  if (c.instrucciones) {
    slide.addText(c.instrucciones, {
      x: 0.5, y: nextY, w: W - 1.0, h: 0.7,
      fontSize: 14, fontFace: font, color: "555555", align: "left", wrap: true,
    });
    nextY += 0.8;
  }

  const ejercicios = c.ejercicios || c.items || [];
  ejercicios.forEach((ej, i) => {
    const text = typeof ej === "string" ? ej : ej.texto || String(ej);
    if (nextY + 0.4 > H - 0.4) return;

    // Number circle
    slide.addShape("ellipse", {
      x: 0.5, y: nextY + 0.02, w: 0.35, h: 0.35,
      fill: { color: "C2185B" },
    });
    slide.addText(String(i + 1), {
      x: 0.5, y: nextY + 0.02, w: 0.35, h: 0.35,
      fontSize: 12, fontFace: font, bold: true, color: "FFFFFF", align: "center",
    });

    slide.addText(text, {
      x: 1.0, y: nextY, w: W - 1.5, h: 0.4,
      fontSize: 14, fontFace: font, color: "444444", align: "left", wrap: true,
    });

    nextY += 0.5;
  });

  addCounter(slide, idx, total, font, false);
}

function renderSeparador(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  const accent = s.color_acento || a2;
  slide.background = { fill: strip(accent) };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};

  if (c.titulo) {
    slide.addText(c.titulo, {
      x: 0.8, y: 1.2, w: W - 1.6, h: 2.0,
      fontSize: 40, fontFace: font, bold: true, color: "FFFFFF", align: "center", wrap: true,
    });
  }

  if (c.subtitulo) {
    slide.addText(c.subtitulo, {
      x: 1.5, y: 3.4, w: W - 3.0, h: 0.8,
      fontSize: 18, fontFace: font, color: "EEEEEE", align: "center", wrap: true,
    });
  }

  addCounter(slide, idx, total, font, true);
}

function renderCierre(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "E8F5E9" };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  const c = s.contenido || {};
  const accent = s.color_acento || a1;

  slide.addText("⭐  " + (c.titulo || "Resumen"), {
    x: 0.5, y: 0.2, w: W - 1.0, h: 0.8,
    fontSize: 30, fontFace: font, bold: true, color: strip(accent), align: "left",
  });

  let nextY = 1.15;

  const resumen = c.resumen || c.texto || "";
  if (typeof resumen === "string" && resumen) {
    slide.addText(resumen, {
      x: 0.5, y: nextY, w: W - 1.0, h: 1.5,
      fontSize: 14, fontFace: font, color: "444444", align: "left", wrap: true,
    });
    nextY += 1.6;
  }

  const tarea = c.tarea || "";
  if (tarea) {
    const tareaY = Math.max(nextY, H - 1.4);
    slide.addShape("roundRect", {
      x: 0.5, y: tareaY, w: W - 1.0, h: 1.0,
      rectRadius: 0.12,
      fill: { color: lighten(accent, 0.85) },
      line: { color: lighten(accent, 0.6), width: 1 },
    });
    slide.addText("📋  Tarea:", {
      x: 0.7, y: tareaY + 0.05, w: 2.0, h: 0.35,
      fontSize: 13, fontFace: font, bold: true, color: strip(accent), align: "left",
    });
    slide.addText(String(tarea), {
      x: 0.7, y: tareaY + 0.38, w: W - 1.4, h: 0.5,
      fontSize: 13, fontFace: font, color: "555555", align: "left", wrap: true,
    });
  }

  addCounter(slide, idx, total, font, false);
}

function renderListaBullets(slide, s, meta, config, font, a1, a2, a3, idx, total) {
  slide.background = { fill: "EDE7F6" };
  addBgImage(slide, s.imagen_fondo);
  addEmojis(slide, config.emojis_decorativos, font);

  // Left accent bar
  slide.addShape("rect", {
    x: 0, y: 0, w: 0.06, h: H,
    fill: { color: "7B1FA2" },
  });

  const c = s.contenido || {};
  const accent = s.color_acento || a1;

  if (c.titulo) {
    slide.addText(c.titulo, {
      x: 0.6, y: 0.25, w: W - 1.2, h: 0.7,
      fontSize: 26, fontFace: font, bold: true, color: strip(accent), align: "left",
    });
  }

  const items = c.items || [];
  const startY = 1.1;

  items.forEach((item, i) => {
    const text = typeof item === "string" ? item : item.texto || String(item);
    const y = startY + i * 0.5;
    if (y + 0.45 > H - 0.4) return;

    slide.addShape("ellipse", {
      x: 0.6, y: y + 0.12, w: 0.16, h: 0.16,
      fill: { color: "7B1FA2" },
    });

    slide.addText(text, {
      x: 0.95, y, w: W - 1.5, h: 0.4,
      fontSize: 15, fontFace: font, color: "444444", align: "left", wrap: true,
    });
  });

  addCounter(slide, idx, total, font, false);
}

// ── Main generator ───────────────────────────────────────────────────────────

async function generatePresentationPptx(data) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  const meta = data.meta || {};
  const config = data.config || {};
  const slides = data.slides || [];
  const total = slides.length;

  const a1 = (config.colores_tema && config.colores_tema[0]) || "#FF6768";
  const a2 = (config.colores_tema && config.colores_tema[1]) || "#4F9AF2";
  const a3 = (config.colores_tema && config.colores_tema[2]) || "#11C95B";
  const font = mapFont(config.font || "nunito");

  pptx.title = meta.titulo || "Presentacion";
  pptx.author = meta.nombre_docente || "";
  pptx.company = meta.nombre_institucion || "";
  pptx.subject = meta.materia || "";

  const renderers = {
    titulo: renderTitulo,
    texto_simple: renderTextoSimple,
    texto_imagen: renderTextoImagen,
    numero_grande: renderNumeroGrande,
    lista_iconos: renderListaIconos,
    dos_columnas: renderDosColumnas,
    tabla: renderTabla,
    pregunta: renderPregunta,
    actividad: renderActividad,
    separador: renderSeparador,
    cierre: renderCierre,
    lista_bullets: renderListaBullets,
  };

  slides.forEach((slideData, i) => {
    const slide = pptx.addSlide();
    const tipo = slideData.tipo || "texto_simple";
    const fn = renderers[tipo] || renderTextoSimple;
    fn(slide, slideData, meta, config, font, a1, a2, a3, i, total);
  });

  return pptx.write("nodebuffer");
}

module.exports = { generatePresentationPptx };
